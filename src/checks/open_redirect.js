import { at, walk, calleeName, ts } from "../core.js";
import { REQUEST_DATA } from "./_request.js";

// res.redirect(req.query.next): any link can send the user to another site (an open redirect, used in phishing).
export default {
  name: "open-redirect",
  run(project) {
    const out = [];
    for (const f of project.files) {
      if (!REQUEST_DATA.test(f.text)) continue;
      walk(f, (n) => {
        if (ts.isCallExpression(n) && calleeName(n) === "redirect" && n.arguments.some((a) => REQUEST_DATA.test(a.getText(f.ast)))) {
          out.push(at("open-redirect", "medium", f, n, "A redirect goes to an address from request data: any link can send the user to another site.",
            "Redirect only to a path of this site (it starts with / and not //), or to an address on an allow-list."));
        }
      });
    }
    return out;
  },
};
