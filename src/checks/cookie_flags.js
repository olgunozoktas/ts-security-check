import { at, walk, calleeName, prop, isTrue, ts } from "../core.js";

// res.cookie(name, value[, options]) without httpOnly (scripts read it) or secure (it travels over plain HTTP).
export default {
  name: "cookie-flags",
  run(project) {
    const out = [];
    for (const f of project.files) {
      walk(f, (n) => {
        if (!ts.isCallExpression(n) || calleeName(n) !== "cookie" || n.arguments.length < 2 || !/\b(res|reply|response|ctx)\b/.test(n.expression.getText(f.ast))) return;
        const opts = n.arguments[2];
        if (opts && !ts.isObjectLiteralExpression(opts)) return; // options from a variable: not visible here
        const maxAge = prop(opts, "maxAge") ?? prop(opts, "expires");
        if (maxAge && /^(0|-\d+|new Date\(0\))$/.test(maxAge.getText(f.ast))) return; // a cookie that is deleted
        const missing = [!isTrue(prop(opts, "httpOnly")) && "httpOnly", !isTrue(prop(opts, "secure")) && "secure"].filter(Boolean);
        if (missing.length) {
          out.push(at("cookie-flags", missing.length === 2 ? "medium" : "low", f, n, `This cookie has no ${missing.join(" and ")}: scripts can read it, or it travels over plain HTTP.`,
            "Pass { httpOnly: true, secure: true, sameSite: 'lax' } (strict for a session)."));
        }
      });
    }
    return out;
  },
};
