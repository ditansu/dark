import * as path from "path";
import { workspace, ExtensionContext } from "vscode";

import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  Trace,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  const serverModule: string = context.asAbsolutePath(
    path.join("server", "out", "server.js"),
  );
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "darklang" }],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher("**/*.dark"),
    },

    // in the window that has the extension loaded, go to the Output tab,
    // and select this option in the dropdown to find corresponding logs
    traceOutputChannel: vscode.window.createOutputChannel(
      "Darklang LSP - Client",
    ),
  };

  // start the LSP client -- note: this will also launch the server
  client = new LanguageClient(
    "darklangLsp",
    "Darklang LSP - Server",
    serverOptions,
    clientOptions,
  );
  client.trace = Trace.Verbose;
  client.start();

  // misc VS Code extensibility demos

  // vscode.window.showInformationMessage("hello, darklang dev");

  // var statusBarItem = vscode.window.createStatusBarItem(
  //   vscode.StatusBarAlignment.Right,
  //   100,
  // );
  // statusBarItem.text = "status: good!";
  // statusBarItem.show();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
