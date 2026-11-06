import { at, walk, constString, ts } from "../core.js";

export const SECRET_SHAPE = /(?:sk|rk)_live_[0-9A-Za-z]{16,}|whsec_[0-9A-Za-z]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|ghp_[0-9A-Za-z]{30,}|github_pat_[0-9A-Za-z_]{40,}|xox[bpas]-[0-9A-Za-z-]{20,}|npm_[0-9A-Za-z]{36}/;

// A live secret in a string constant, also one joined from pieces: the check reads the joined value, and never quotes it.
export default {
  name: "secrets-in-code",
  run(project) {
    const out = [];
    for (const f of project.files) {
      const seen = new Set();
      walk(f, (n, stack) => {
        if (!(ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isBinaryExpression(n))) return;
        if (stack.slice(0, -1).some((p) => seen.has(p))) return; // inside a joined string that was reported
        const s = constString(n);
        if (s !== null && SECRET_SHAPE.test(s)) {
          seen.add(n);
          out.push(at("secrets-in-code", "high", f, n, "A live secret is written into the source.",
            "Revoke it at its provider now (it is in the git history), then read the new one from the environment."));
        }
      });
    }
    return out;
  },
};
