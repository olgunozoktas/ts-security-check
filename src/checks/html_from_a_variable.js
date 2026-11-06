import { at, walk, calleeName, isConstant, isEscaped, prop, ts } from "../core.js";

const HTML_PROPS = new Set(["innerHTML", "outerHTML"]);

// el.innerHTML = x, insertAdjacentHTML(_, x), document.write(x), dangerouslySetInnerHTML={{ __html: x }}: HTML from a
// variable — an XSS when any part of it is a user's text.
export default {
  name: "html-from-a-variable",
  run(project) {
    const out = [];
    const flag = (f, n, what) => out.push(at("html-from-a-variable", "medium", f, n, `${what} of a variable: if any part is a user's text, a script runs (an XSS).`,
      "Set textContent (or let the framework escape it); for wanted HTML, clean it with DOMPurify first."));
    for (const f of project.files) {
      walk(f, (n) => {
        if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(n.left) &&
            HTML_PROPS.has(n.left.name.text) && !isEscaped(n.right)) flag(f, n, n.left.name.text);
        if (ts.isCallExpression(n)) {
          const name = calleeName(n);
          if (name === "insertAdjacentHTML" && n.arguments[1] && !isEscaped(n.arguments[1])) flag(f, n, "insertAdjacentHTML");
          if ((name === "write" || name === "writeln") && /document\.write/.test(n.expression.getText(f.ast)) && n.arguments[0] && !isConstant(n.arguments[0])) flag(f, n, "document.write");
        }
        if (ts.isJsxAttribute(n) && n.name.getText(f.ast) === "dangerouslySetInnerHTML" && n.initializer && ts.isJsxExpression(n.initializer)) {
          const html = prop(n.initializer.expression, "__html");
          if (!html || isConstant(html)) return;
          const call = ts.isCallExpression(html) ? html.expression.getText(f.ast) : "";
          if (/(^|\.)(sanitize|purify)$/i.test(call)) return; // cleaned first (DOMPurify.sanitize, sanitize-html)
          if (/^JSON\.stringify$/.test(call)) {
            out.push(at("html-from-a-variable", "low", f, n, "dangerouslySetInnerHTML of JSON.stringify(…): JSON in a script is not HTML, but a \"</script>\" in the data ends the script.",
              "Escape < in the JSON: JSON.stringify(data).replace(/</g, '\\u003c')."));
            return;
          }
          flag(f, n, "dangerouslySetInnerHTML");
        }
      });
    }
    return out;
  },
};
