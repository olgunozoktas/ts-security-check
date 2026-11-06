// Each check finds exactly its bad shapes and is silent on the good ones; the shared rules (ignore markers, built files)
// hold. The fixtures are read in place: no test writes a file. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { load, checks, kept } from "../src/core.js";

const FIX = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const all = await checks();
const byName = Object.fromEntries(all.map((c) => [c.name, c]));
const run = (name, folder) => { const p = load(path.join(FIX, name, folder)); return kept(p, byName[name].run(p)); };
const sev = (fs_) => fs_.map((f) => f.severity).sort().join(",");

// The bad shapes of each fixture, by severity: an exact list, so one shape too many or too few fails.
const BAD = {
  "eval-with-a-variable": "high,high,high",
  "shell-with-a-variable": "high,high,high",
  "sql-built-from-strings": "high,high",
  "html-from-a-variable": "low,medium,medium,medium,medium",
  "tls-without-verification": "high,high",
  "weak-random-for-secrets": "high,high",
  "weak-hash-for-passwords": "high,high",
  "path-from-request": "high,high",
  "open-redirect": "medium,medium",
  "cors-wildcard": "low,low",
  "cookie-flags": "low,medium",
  "secrets-in-code": "high,high",
  "jwt-decode-without-verify": "medium",
};

test("each check finds exactly its bad shapes", () => {
  for (const [name, want] of Object.entries(BAD)) assert.equal(sev(run(name, "bad")), want, name);
});

test("each check is silent on its good shapes", () => {
  for (const name of Object.keys(BAD)) assert.deepEqual(run(name, "good").map((f) => `${f.file}:${f.line} ${f.message}`), [], name);
});

test("every check but npm-audit has fixtures, and every fixture names a check", () => {
  const names = all.map((c) => c.name).filter((n) => n !== "npm-audit").sort();
  assert.deepEqual(Object.keys(BAD).sort(), names);
  for (const n of names) for (const d of ["bad", "good"]) assert.ok(fs.existsSync(path.join(FIX, n, d)), `${n}/${d}`);
});

test("CORS for every origin with credentials is high", () => {
  assert.equal(sev(run("cors-wildcard", "bad2")), "high");
});

test("a finding names the file and the line, and never quotes a secret", () => {
  const f = run("secrets-in-code", "bad");
  assert.deepEqual(f.map((x) => `${x.file}:${x.line}`), ["x.ts:1", "x.ts:2"]);
  for (const x of f) assert.ok(!/4eC39H|IOSFODNN/.test(JSON.stringify(x)), "the finding holds the secret");
});

test("an ignore marker counts only in a real comment", () => {
  assert.equal(run("weak-random-for-secrets", "../marker").length, 0, "a comment marker hides its line");
  assert.equal(run("weak-random-for-secrets", "../marker-in-a-string").length, 1, "a marker inside a string hides nothing");
});

test("built files are skipped and counted, not read", () => {
  const p = load(path.join(FIX, "built"));
  assert.deepEqual(p.files.map((f) => f.path), ["x.ts"]);
  assert.equal(p.generated, 1);
  assert.equal(byName["eval-with-a-variable"].run(p).length, 0);
});

test("npm audit: no lockfile is info, a failed audit is medium (fail closed), and a finding keeps its severity", () => {
  const audit = (dir, npm) => byName["npm-audit"].run(load(path.join(FIX, "npm-audit", dir)), npm ? { npm } : undefined);
  assert.deepEqual(audit("locked").map((f) => f.severity), ["info"]);
  const failed = audit("fails", path.join(FIX, "npm-audit", "fails", "bin", "npm"));
  assert.deepEqual(failed.map((f) => f.severity), ["medium"]);
  assert.match(failed[0].message, /NOT checked.*|ENOTFOUND/);
  const found = audit("clean", path.join(FIX, "npm-audit", "clean", "bin", "npm"));
  assert.deepEqual(found.map((f) => [f.severity, f.message.split(" ")[0]]), [["high", "lodash"]]);
  assert.deepEqual(audit("clean", path.join(FIX, "npm-audit", "no-such-npm")).map((f) => f.severity), ["info"]);
});
