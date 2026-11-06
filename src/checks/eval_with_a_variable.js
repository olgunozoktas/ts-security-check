import { at, walk, calleeName, isConstant, ts } from "../core.js";

// eval(x), new Function(x), setTimeout("code" + x): code built from a variable runs — a code injection with user input.
export default {
  name: "eval-with-a-variable",
  run(project) {
    const out = [];
    for (const f of project.files) {
      walk(f, (n) => {
        const isCall = ts.isCallExpression(n), isNew = ts.isNewExpression(n);
        if (!isCall && !isNew) return;
        const name = calleeName(n), args = n.arguments ?? [];
        const code = (isCall && name === "eval" && args[0]) || (name === "Function" && args.at(-1)) ||
          (isCall && (name === "setTimeout" || name === "setInterval") && args[0] && !ts.isFunctionLike(args[0]) && !ts.isIdentifier(args[0]) && !ts.isPropertyAccessExpression(args[0]) && args[0]);
        if (code && !isConstant(code)) {
          out.push(at("eval-with-a-variable", "high", f, n, `${name}() runs code built from a variable: with user input, that is a code injection.`,
            "Never build code from data: parse the data (JSON.parse), or call a function that you chose."));
        }
      });
    }
    return out;
  },
};
