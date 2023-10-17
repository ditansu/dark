import * as child_process from "child_process";
import * as util from "util";
const exec = util.promisify(child_process.exec);

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import { ComputeDiagnosticsInput, ComputeDiagnosticsOutput } from "./darkTypes";
import * as DT2LT from "./darkTypesToLspTypes";

const connection = createConnection(ProposedFeatures.all);

const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

interface DarklangSettings {
  maxNumberOfProblems: number;
}
const defaultSettings: DarklangSettings = { maxNumberOfProblems: 1000 };
let globalSettings: DarklangSettings = defaultSettings;
// used to cache the settings of all open documents
const documentSettings: Map<string, Thenable<DarklangSettings>> = new Map();

async function runDarkCli(...args: string[]) {
  const darkCliPath = "/home/dark/app/backend/Build/out/Cli/Debug/net7.0/Cli";
  const cmd = `${darkCliPath} ${args.join(" ")}`;
  const { stdout, stderr } = await exec(cmd);
  return { stdout, stderr };
}

// function getDocumentSettings(resource: string): Thenable<DarklangSettings> {
//   if (!hasConfigurationCapability) {
//     return Promise.resolve(globalSettings);
//   }
//   let result = documentSettings.get(resource);
//   if (!result) {
//     result = connection.workspace.getConfiguration({
//       scopeUri: resource,
//       section: "darklangLsp",
//     });
//     documentSettings.set(resource, result);
//   }
//   return result;
// }

async function gatherAndReportDiagnostics(
  textDocument: TextDocument,
): Promise<void> {
  //const settings = await getDocumentSettings(textDocument.uri);

  // const contextForDarkDiagnostics: ComputeDiagnosticsInput = {
  //   uri: textDocument.uri,
  //   text: textDocument.getText(),

  //   maxNumberOfProblems: settings.maxNumberOfProblems,
  // };

  const diagnosticsFromDarkResponse = await runDarkCli(
    "@PACKAGE.Darklang.LanguageServerProtocol.getDiagnostics",
    JSON.stringify(textDocument.getText()),
    //JSON.stringify(congit statustextForDarkDiagnostics),
  );

  if (diagnosticsFromDarkResponse.stderr) {
    console.error("stderr", diagnosticsFromDarkResponse.stderr);
  } else {
    const diagnosticsFromDark: ComputeDiagnosticsOutput = JSON.parse(
      diagnosticsFromDarkResponse.stdout,
    );
    const diagnostics = diagnosticsFromDark.diagnostics.map(DT2LT.diagnostic);
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
  }
}

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: { resolveProvider: true },
    },
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = { workspaceFolders: { supported: true } };
  }

  return result;
});

// connection.onDocumentFormatting(_ => {
//   console.log("format", stuff.textDocument.uri);
//   return;
// });

connection.onInitialized(async () => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined,
    );
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders(_event => {
      connection.console.log("Workspace folder change event received.");
    });
  }
});

connection.onDidChangeConfiguration(change => {
  console.log("onDidChangeConfiguration");
  if (hasConfigurationCapability) {
    documentSettings.clear();
  } else {
    globalSettings = <DarklangSettings>(
      (change.settings.darklangLsp || defaultSettings)
    );
  }

  documents.all().forEach(gatherAndReportDiagnostics);
});

documents.onDidClose(e => documentSettings.delete(e.document.uri));

documents.onDidSave(async change => {
  gatherAndReportDiagnostics(change.document);
});

// (how) should we autocomplete?
// (currently this just provides 2 bogus autocompletes)
connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    return [
      { label: "TypeScript", kind: CompletionItemKind.Text, data: 1 },
      { label: "JavaScript", kind: CompletionItemKind.Text, data: 2 },
    ];
  },
);

// once you hover over some completion, this fills in some details (i think)
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  if (item.data === 1) {
    item.detail = "TypeScript details";
    item.documentation = "TypeScript documentation";
  } else if (item.data === 2) {
    item.detail = "JavaScript details";
    item.documentation = "JavaScript documentation";
  }
  return item;
});

documents.listen(connection);

// setInterval(async () => {
//   const allDocs = documents.all();
//   const allDocSettings = await Promise.all(
//     allDocs.map(d => getDocumentSettings(d.uri)),
//   );
//   console.log("docs", allDocSettings);
// }, 10000);

connection.listen();
