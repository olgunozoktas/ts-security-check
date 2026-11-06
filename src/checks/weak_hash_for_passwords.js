import { at, walk, calleeName, constString, ts } from "../core.js";

// createHash('md5' | 'sha1') in a file that handles passwords: a fast hash is brute-forced in hours.
export default {
  name: "weak-hash-for-passwords",
  run(project) {
    const out = [];
    for (const f of project.files) {
      if (!/password|passwd|pwd/i.test(f.text)) continue;
      walk(f, (n) => {
        if (ts.isCallExpression(n) && calleeName(n) === "createHash" && ["md5", "sha1"].includes((constString(n.arguments[0]) ?? "").toLowerCase())) {
          out.push(at("weak-hash-for-passwords", "high", f, n, `createHash('${constString(n.arguments[0])}') in a file that handles passwords: a fast hash is brute-forced in hours.`,
            "Hash passwords with argon2 or bcrypt (or crypto.scrypt with a salt); keep md5/sha1 only for checksums."));
        }
      });
    }
    return out;
  },
};
