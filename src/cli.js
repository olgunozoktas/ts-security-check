import fs from "node:fs";
import path from "node:path";
import { load, checks as allChecks, kept, SEVERITIES, rank } from "./core.js";

/** The command: answers its exit code. Pure apart from reading the project and writing to out and err. */
export async function main(argv, out, err) {
  const opt = { failOn: "medium", only: "", json: false, tests: false, list: false, root: "." };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => (a.includes("=") ? a.slice(a.indexOf("=") + 1) : argv[++i]);
    if (a.startsWith("--fail-on")) opt.failOn = value();
    else if (a.startsWith("--only")) opt.only = value();
    else if (a === "--json") opt.json = true;
    else if (a === "--tests") opt.tests = true;
    else if (a === "--list") opt.list = true;
    else if (a === "-h" || a === "--help") { out.write("ts-security-check [--fail-on high|medium|low|info] [--only a,b] [--json] [--tests] [--list] [folder]\n"); return 0; }
    else if (a.startsWith("-")) { err.write(`ts-security-check: unknown flag ${a}\n`); return 2; }
    else opt.root = a;
  }
  if (!SEVERITIES.includes(opt.failOn)) { err.write("ts-security-check: --fail-on must be high, medium, low or info\n"); return 2; }
  let checks = await allChecks();
  if (opt.list) { out.write(checks.map((c) => c.name).join("\n") + "\n"); return 0; }
  if (opt.only) { const names = opt.only.split(","); checks = checks.filter((c) => names.includes(c.name)); }
  if (!["package.json", "tsconfig.json", "jsconfig.json"].some((n) => fs.existsSync(path.join(opt.root, n)))) {
    err.write(`ts-security-check: no package.json or tsconfig.json in ${opt.root}\n`);
    return 2;
  }
  const project = load(path.resolve(opt.root), { withTests: opt.tests });
  let findings = [];
  for (const c of checks) findings.push(...kept(project, c.run(project)));
  findings.sort((a, b) => rank(b.severity) - rank(a.severity) || `${a.file}:${String(a.line).padStart(6, "0")}`.localeCompare(`${b.file}:${String(b.line).padStart(6, "0")}`));
  const counts = Object.fromEntries(SEVERITIES.slice().reverse().map((s) => [s, findings.filter((f) => f.severity === s).length]));
  if (opt.json) {
    out.write(JSON.stringify({ checks: checks.length, files_read: project.files.length, large_files_skipped: project.skipped, built_files_skipped: project.generated, counts, findings }, null, 2) + "\n");
  } else {
    for (const f of findings) out.write(`${f.severity.toUpperCase().padEnd(6)} ${f.file}${f.line ? ":" + f.line : ""}  [${f.check}] ${f.message}\n       Fix: ${f.remedy}\n\n`);
    out.write(`${checks.length} checks, ${project.files.length} files read (${project.skipped} over 1 MB and ${project.generated} built files skipped). Findings: ${counts.high} high, ${counts.medium} medium, ${counts.low} low, ${counts.info} info.\n`);
  }
  return findings.some((f) => rank(f.severity) >= rank(opt.failOn)) ? 1 : 0;
}
