import { at, walk, calleeName, ts } from "../core.js";
import { REQUEST_DATA } from "./_request.js";

const FS = new Set(["readFile", "readFileSync", "writeFile", "writeFileSync", "createReadStream", "createWriteStream", "unlink", "unlinkSync",
  "rm", "rmSync", "open", "openSync", "readdir", "readdirSync", "appendFile", "sendFile", "download"]);
const PATHS = new Set(["join", "resolve"]);
const isPathCall = (n) => ts.isCallExpression(n) && (FS.has(calleeName(n)) || (PATHS.has(calleeName(n)) && /\bpath\./.test(n.expression.getText())));

// A file path from request data: "../" in it reads or writes any file (a path traversal). One shape, one finding: the
// innermost path call is reported.
export default {
  name: "path-from-request",
  run(project) {
    const out = [];
    for (const f of project.files) {
      if (!REQUEST_DATA.test(f.text)) continue;
      walk(f, (n) => {
        if (!isPathCall(n)) return;
        for (const a of n.arguments) {
          if (isPathCall(a)) continue;
          if (REQUEST_DATA.test(a.getText(f.ast))) {
            out.push(at("path-from-request", "high", f, n, "A file path is built from request data: \"../\" in it reads or writes any file.",
              "Resolve it under one folder and check it stays there: const p = path.resolve(dir, name); if (!p.startsWith(dir + path.sep)) refuse."));
            break;
          }
        }
      });
    }
    return out;
  },
};
