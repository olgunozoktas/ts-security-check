// What every check shares: a finding, its severity, the parsed files of a project, the ignore markers and the registry.
//
// ADDING A CHECK IS ONE FILE: a module in src/checks/ whose default export is { name, run(project) }. The registry
// loads every file of that folder, so "the file is there" and "the check runs" are one fact. A check changes nothing.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

export const SEVERITIES = ["info", "low", "medium", "high"];
export const rank = (s) => SEVERITIES.indexOf(s);

const EXTENSIONS = { ".ts": ts.ScriptKind.TS, ".tsx": ts.ScriptKind.TSX, ".mts": ts.ScriptKind.TS, ".cts": ts.ScriptKind.TS,
  ".js": ts.ScriptKind.JS, ".jsx": ts.ScriptKind.JSX, ".mjs": ts.ScriptKind.JS, ".cjs": ts.ScriptKind.JS };
// Not the project's own code: dependencies, builds, coverage, version control.
const SKIP = new Set(["node_modules", "dist", "build", "out", "coverage", ".next", ".nuxt", ".output", "vendor", ".git", ".turbo"]);
const MAX_BYTES = 1_000_000; // a bigger file is a bundle or data, not code: skipped and counted
// Built output, not the project's source: a .min.js, a line over 2,000 characters (minified), or a bundler's runtime
// (one real Laravel project, 2026-11-07: all 4 high findings were in public/js/app.js, a webpack bundle of Alpine).
const GENERATED = (name, text) => /\.min\.[cm]?js$/.test(name) || /__webpack_require__|__vite__|\/\*{6}\//.test(text.slice(0, 20000)) ||
  text.split("\n", 200).some((line) => line.length > 2000);

/** Every source file under root, parsed. withTests also reads *.test.* and *.spec.* files. */
export function load(root, { withTests = false } = {}) {
  const files = [];
  let skipped = 0, generated = 0;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP.has(entry.name) && !(entry.name.startsWith(".") && entry.name !== ".")) walk(full);
        continue;
      }
      const ext = path.extname(entry.name);
      if (!(ext in EXTENSIONS) || entry.name.endsWith(".d.ts")) continue;
      if (!withTests && /\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name)) continue;
      const size = fs.statSync(full).size;
      if (size > MAX_BYTES) { skipped++; continue; }
      const text = fs.readFileSync(full, "utf8");
      if (GENERATED(entry.name, text)) { generated++; continue; }
      const rel = path.relative(root, full).split(path.sep).join("/");
      files.push({ path: rel, text, ast: ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, EXTENSIONS[ext]) });
    }
  };
  walk(root);
  return { root, files, skipped, generated };
}

/** A finding at a node. */
export function at(check, severity, file, node, message, remedy) {
  const line = file.ast.getLineAndCharacterOfPosition(node.getStart(file.ast)).line + 1;
  return { check, severity, message, remedy, file: file.path, line };
}

/** The line numbers that carry an ignore marker in a REAL comment (the scanner knows strings and templates, so a marker
 *  inside a string counts for nothing): // ts-security-check:ignore <reason>, or // eslint-disable-line security/… . */
export function ignoredLines(file) {
  if (file.ignored) return file.ignored;
  const lines = new Set();
  const visit = (node) => {
    for (const ranges of [ts.getLeadingCommentRanges(file.text, node.pos), ts.getTrailingCommentRanges(file.text, node.end)]) {
      for (const r of ranges ?? []) {
        const body = file.text.slice(r.pos, r.end).replace(/^\/\/\s*|^\/\*\s*|\s*\*\/$/g, "");
        if (/^ts-security-check:ignore\b/.test(body) || /^eslint-disable-(next-)?line\b.*\bsecurity\//.test(body)) {
          const line = file.ast.getLineAndCharacterOfPosition(r.pos).line + 1;
          lines.add(/^eslint-disable-next-line/.test(body) ? line + 1 : line);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file.ast);
  file.ignored = lines;
  return lines;
}

/** The findings that no ignore marker covers. */
export function kept(project, findings) {
  const byPath = new Map(project.files.map((f) => [f.path, f]));
  return findings.filter((x) => !(x.line && byPath.has(x.file) && ignoredLines(byPath.get(x.file)).has(x.line)));
}

/** Every check in src/checks/, sorted by name. */
export async function checks() {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "checks");
  const out = [];
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith(".js") && !n.startsWith("_")).sort()) {
    const mod = await import(pathToFileURL(path.join(dir, name)).href);
    out.push(mod.default);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Each node of a file, with its ancestors (the file first). */
export function walk(file, visit) {
  const stack = [];
  const go = (node) => {
    stack.push(node);
    visit(node, stack);
    ts.forEachChild(node, go);
    stack.pop();
  };
  go(file.ast);
}

/** True when a node sits in a loop of its own function (not of a function inside it). */
export function inLoop(stack) {
  for (let i = stack.length - 2; i >= 0; i--) {
    const n = stack[i];
    if (ts.isFunctionLike(n)) return false;
    if (ts.isForStatement(n) || ts.isForOfStatement(n) || ts.isForInStatement(n) || ts.isWhileStatement(n) || ts.isDoStatement(n)) return true;
  }
  return false;
}

/** The text of a node. */
export const text = (file, node) => node.getText(file.ast);

/** True when an expression holds no variable: a string or number literal, a template with no ${…}, + of those. */
export function isConstant(e) {
  e = skipParens(e);
  if (!e) return false;
  if (ts.isStringLiteral(e) || ts.isNumericLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return true;
  if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.PlusToken) return isConstant(e.left) && isConstant(e.right);
  return false;
}

/** The value of a constant string expression ("a", `a`, "a" + "b"), or null. */
export function constString(e) {
  e = skipParens(e);
  if (!e) return null;
  if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return e.text;
  if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const a = constString(e.left), b = constString(e.right);
    return a === null || b === null ? null : a + b;
  }
  return null;
}

/** True when a value is escaped or harmless in HTML: a constant, a number, a call to a function named esc…, escape…,
 *  sanitize… or purify…, and a template whose every ${…} is one of those. */
export function isEscaped(e) {
  e = skipParens(e);
  if (!e) return false;
  if (isConstant(e) || ts.isNumericLiteral(e)) return true;
  if (ts.isCallExpression(e)) {
    const f = skipParens(e.expression);
    const name = ts.isIdentifier(f) ? f.text : ts.isPropertyAccessExpression(f) ? f.name.text : "";
    if (/^(esc|escape|sanitize|purify|encode)/i.test(name) || ["toFixed", "Number", "parseInt", "parseFloat"].includes(name)) return true;
    return ts.isPropertyAccessExpression(f) && ts.isIdentifier(f.expression) && f.expression.text === "Math"; // a number
  }
  if (ts.isPropertyAccessExpression(e) && e.name.text === "length") return true; // a number
  if (e.kind === ts.SyntaxKind.TrueKeyword || e.kind === ts.SyntaxKind.FalseKeyword) return true;
  if (ts.isConditionalExpression(e)) return isEscaped(e.whenTrue) && isEscaped(e.whenFalse);
  if (ts.isBinaryExpression(e) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(e.operatorToken.kind)) return true; // a boolean
  if (ts.isTemplateExpression(e)) return e.templateSpans.every((s) => isEscaped(s.expression));
  if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.PlusToken) return isEscaped(e.left) && isEscaped(e.right);
  return false;
}

/** True when an expression builds a string from a variable: `a ${x}` (not tagged), "a" + x. */
export function builds(e) {
  e = skipParens(e);
  if (!e) return false;
  if (ts.isTemplateExpression(e)) return true;
  if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.PlusToken) return !isConstant(e);
  return false;
}

export function skipParens(e) {
  while (e && ts.isParenthesizedExpression(e)) e = e.expression;
  return e;
}

/** The local names that a file binds to a module: { named: Map(local -> imported), spaces: Set(local) }, from
 *  import { exec } / import { exec as run } / import * as cp / import cp, and const { exec } = require(…) / const cp = require(…). */
export function importsFrom(file, modules) {
  if (file.imports?.[modules.join()]) return file.imports[modules.join()];
  const named = new Map(), spaces = new Set();
  const wanted = (s) => modules.includes(s);
  walk(file, (n) => {
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier) && wanted(n.moduleSpecifier.text) && n.importClause) {
      const c = n.importClause;
      if (c.name) spaces.add(c.name.text);
      if (c.namedBindings && ts.isNamespaceImport(c.namedBindings)) spaces.add(c.namedBindings.name.text);
      if (c.namedBindings && ts.isNamedImports(c.namedBindings)) for (const e of c.namedBindings.elements) named.set(e.name.text, (e.propertyName ?? e.name).text);
    }
    if (ts.isVariableDeclaration(n) && n.initializer && ts.isCallExpression(n.initializer) && ts.isIdentifier(n.initializer.expression) &&
        n.initializer.expression.text === "require" && n.initializer.arguments[0] && ts.isStringLiteral(n.initializer.arguments[0]) && wanted(n.initializer.arguments[0].text)) {
      if (ts.isIdentifier(n.name)) spaces.add(n.name.text);
      if (ts.isObjectBindingPattern(n.name)) for (const e of n.name.elements) if (ts.isIdentifier(e.name)) named.set(e.name.text, (e.propertyName && ts.isIdentifier(e.propertyName) ? e.propertyName : e.name).text);
    }
  });
  file.imports = { ...(file.imports ?? {}), [modules.join()]: { named, spaces } };
  return file.imports[modules.join()];
}

/** The imported name that a call reaches in a module (exec for cp.exec(…) or a named exec(…)), or "". */
export function calledFrom(call, bindings) {
  const f = skipParens(call.expression);
  if (ts.isIdentifier(f)) return bindings.named.get(f.text) ?? "";
  if (ts.isPropertyAccessExpression(f) && ts.isIdentifier(f.expression) && bindings.spaces.has(f.expression.text)) return f.name.text;
  return "";
}

/** The called name of a call: "query" for db.query(…), "eval" for eval(…). */
export function calleeName(call) {
  const f = skipParens(call.expression);
  if (ts.isIdentifier(f)) return f.text;
  if (ts.isPropertyAccessExpression(f)) return f.name.text;
  return "";
}

/** A property's value in an object literal, or null. */
export function prop(obj, name) {
  if (!obj || !ts.isObjectLiteralExpression(obj)) return null;
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === name) return p.initializer;
    if (ts.isShorthandPropertyAssignment(p) && p.name.text === name) return p.name;
  }
  return null;
}

export const isTrue = (e) => e?.kind === ts.SyntaxKind.TrueKeyword;
export const isFalse = (e) => e?.kind === ts.SyntaxKind.FalseKeyword;
export { ts };
