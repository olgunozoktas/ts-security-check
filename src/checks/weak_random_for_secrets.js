import { at, walk, ts } from "../core.js";

const SECRET_NAME = /token|secret|nonce|salt|otp|password|apikey|api_key|session|code/i;

// Math.random() for a token, a secret, a nonce or a salt: its values can be predicted.
export default {
  name: "weak-random-for-secrets",
  run(project) {
    const out = [];
    for (const f of project.files) {
      if (!f.text.includes("Math.random")) continue;
      walk(f, (n) => {
        if (!ts.isVariableDeclaration(n) || !n.initializer || !ts.isIdentifier(n.name)) return;
        if (SECRET_NAME.test(n.name.text) && /Math\.random\(\)/.test(n.initializer.getText(f.ast))) {
          out.push(at("weak-random-for-secrets", "high", f, n, `A value named like a secret (${n.name.text}) comes from Math.random(): it can be predicted.`,
            "Use crypto.randomBytes(32).toString('hex') or crypto.randomUUID() (globalThis.crypto.getRandomValues in a browser)."));
        }
      });
    }
    return out;
  },
};
