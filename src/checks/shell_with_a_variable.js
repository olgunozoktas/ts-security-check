import { at, walk, builds, importsFrom, calledFrom, ts } from "../core.js";

const SHELL = new Set(["exec", "execSync"]);

// child_process.exec(`git log ${ref}`): the command line goes through a shell — a command injection with user input.
export default {
  name: "shell-with-a-variable",
  run(project) {
    const out = [];
    for (const f of project.files) {
      if (!/child_process/.test(f.text)) continue;
      // Only child_process's exec: a RegExp's .exec(text) is no shell (10 of 10 such findings in one real project, 2026-11-07).
      const cp = importsFrom(f, ["child_process", "node:child_process"]);
      walk(f, (n) => {
        if (!ts.isCallExpression(n) || !SHELL.has(calledFrom(n, cp)) || !n.arguments[0]) return;
        const a = n.arguments[0];
        if (builds(a) || ts.isIdentifier(a)) {
          out.push(at("shell-with-a-variable", "high", f, n, "exec() runs a command line built from a variable through a shell: a command injection with user input.",
            "Use execFile('git', ['log', ref]) or spawn with an argument list: no shell reads the values."));
        }
      });
    }
    return out;
  },
};
