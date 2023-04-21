/// StdLib functions for building Dark functionality via Dark canvases
module StdLibDarkInternal.Libs.Domains

open System.Threading.Tasks

open Prelude
open LibExecution.RuntimeTypes

module Canvas = LibBackend.Canvas

let fn = FQFnName.stdlibFnName
let typ = FQTypeName.stdlibTypeName

let incorrectArgs = LibExecution.Errors.incorrectArgs

let types : List<BuiltInType> = []


let fns : List<BuiltInFn> =
  [ { name = fn "DarkInternal" "domainsForCanvasID" 0
      typeParams = []
      parameters = [ Param.make "canvasID" TUuid "" ]
      returnType = TList TString
      description = "Returns the domain for a canvas if it exists"
      fn =
        (function
        | _, _, [ DUuid canvasID ] ->
          uply {
            let! name = Canvas.domainsForCanvasID canvasID
            return name |> List.map DString |> DList
          }
        | _ -> incorrectArgs ())
      sqlSpec = NotQueryable
      previewable = Impure
      deprecated = NotDeprecated }


    { name = fn "DarkInternal" "canvasIDForDomain" 0
      typeParams = []
      parameters = [ Param.make "domain" TString "" ]
      returnType = TResult(TUuid, TString)
      description = "Returns the canvasID for a domain if it exists"
      fn =
        (function
        | _, _, [ DString domain ] ->
          uply {
            let! name = Canvas.canvasIDForDomain domain
            match name with
            | Some name -> return DResult(Ok(DUuid name))
            | None -> return DResult(Error(DString "Canvas not found"))
          }
        | _ -> incorrectArgs ())
      sqlSpec = NotQueryable
      previewable = Impure
      deprecated = NotDeprecated } ]