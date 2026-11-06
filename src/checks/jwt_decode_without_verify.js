import { at, walk, calleeName, ts } from "../core.js";

// jwt.decode(token) reads a token WITHOUT checking its signature: anyone can write the claims it trusts.
export default {
  name: "jwt-decode-without-verify",
  run(project) {
    const out = [];
    for (const f of project.files) {
      if (!/jsonwebtoken|jwt-decode|\bjwt\b/.test(f.text)) continue;
      walk(f, (n) => {
        if (ts.isCallExpression(n) && (calleeName(n) === "decode" && /\bjwt\./.test(n.expression.getText(f.ast)) || calleeName(n) === "jwtDecode")) {
          out.push(at("jwt-decode-without-verify", "medium", f, n, "A JWT is decoded without checking its signature: its claims are whatever the sender wrote.",
            "Use jwt.verify(token, key, { algorithms: ['RS256'] }) (or jose's jwtVerify) before you trust a claim; decode only to show it."));
        }
      });
    }
    return out;
  },
};
