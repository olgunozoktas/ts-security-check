// The command's flags and exit codes. It reads the fixture folder in place and writes nothing.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { main } from "../src/cli.js";

const FIX = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const sink = () => { const s = { text: "", write: (t) => { s.text += t; } }; return s; };
const cli = async (...argv) => { const out = sink(), err = sink(); const code = await main(argv, out, err); return { code, out: out.text, err: err.text }; };
const ONLY = ["--only", "weak-random-for-secrets"];

test("a finding at or above --fail-on exits 1; above it, 0", async () => {
  assert.equal((await cli(...ONLY, path.join(FIX, "cli"))).code, 1);
  assert.equal((await cli(...ONLY, "--fail-on", "high", path.join(FIX, "cli"))).code, 1);
  assert.equal((await cli("--only", "cookie-flags", path.join(FIX, "cli"))).code, 0);
});

test("--json gives the counts and the findings", async () => {
  const r = await cli(...ONLY, "--json", path.join(FIX, "cli"));
  const j = JSON.parse(r.out);
  assert.equal(j.checks, 1);
  assert.equal(j.counts.high, 1);
  assert.equal(j.findings[0].file, "x.ts");
});

test("a wrong flag, a wrong severity or a folder that is no project exits 2", async () => {
  assert.equal((await cli("--nope")).code, 2);
  assert.equal((await cli("--fail-on", "urgent", path.join(FIX, "cli"))).code, 2);
  assert.equal((await cli(path.join(FIX, "built"))).code, 2);
});

test("--list names every check", async () => {
  const r = await cli("--list");
  assert.equal(r.code, 0);
  assert.equal(r.out.trim().split("\n").length, 14);
});
