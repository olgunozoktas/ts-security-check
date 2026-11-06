import { at, walk, isFalse, constString, ts } from "../core.js";

// rejectUnauthorized: false, or NODE_TLS_REJECT_UNAUTHORIZED = "0": the TLS certificate is not checked.
export default {
  name: "tls-without-verification",
  run(project) {
    const out = [];
    for (const f of project.files) {
      walk(f, (n) => {
        if (ts.isPropertyAssignment(n) && n.name.getText(f.ast).replace(/["']/g, "") === "rejectUnauthorized" && isFalse(n.initializer)) {
          out.push(at("tls-without-verification", "high", f, n, "rejectUnauthorized is false: the TLS certificate is not checked, so any server can pretend to be this one.",
            "Remove it; for a private CA, pass its certificate as ca."));
        }
        if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && /NODE_TLS_REJECT_UNAUTHORIZED/.test(n.left.getText(f.ast)) && constString(n.right) === "0") {
          out.push(at("tls-without-verification", "high", f, n, "NODE_TLS_REJECT_UNAUTHORIZED = '0' turns off certificate checks for the whole process.",
            "Remove it; trust a private CA with NODE_EXTRA_CA_CERTS instead."));
        }
      });
    }
    return out;
  },
};
