import { at, walk, calleeName, constString, prop, isTrue, ts } from "../core.js";

// CORS for every origin: cors({ origin: '*' }) or Access-Control-Allow-Origin: *; with credentials it is high.
export default {
  name: "cors-wildcard",
  run(project) {
    const out = [];
    for (const f of project.files) {
      const credentials = /credentials\s*:\s*true|Access-Control-Allow-Credentials/.test(f.text);
      walk(f, (n) => {
        if (!ts.isCallExpression(n)) return;
        const name = calleeName(n);
        const star = (name === "cors" && (constString(prop(n.arguments[0], "origin")) === "*" || isTrue(prop(n.arguments[0], "origin")))) ||
          ((name === "setHeader" || name === "header" || name === "set") && constString(n.arguments[0])?.toLowerCase() === "access-control-allow-origin" && constString(n.arguments[1]) === "*");
        if (!star) return;
        out.push(credentials
          ? at("cors-wildcard", "high", f, n, "CORS allows every origin in a file that also allows credentials: any site can act as the signed-in user.", "Name the allowed origins (an array or a function that checks an allow-list).")
          : at("cors-wildcard", "low", f, n, "CORS allows every origin (*): any site can read these answers.", "Name the allowed origins, unless the API is public on purpose."));
      });
    }
    return out;
  },
};
