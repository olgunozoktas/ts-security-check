import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// npm audit: the dependencies in package-lock.json against the npm advisory database (it needs the network). FAIL
// CLOSED: a missing npm is info; an answer that is not npm audit's JSON (no network, an error) is medium, so the default
// gate fails, because nothing was checked.
export default {
  name: "npm-audit",
  run(project, { npm = "npm" } = {}) {
    if (!fs.existsSync(path.join(project.root, "package-lock.json"))) {
      return [{ check: "npm-audit", severity: "info", file: "package.json", message: "npm audit did not run: there is no package-lock.json.", remedy: "Commit a lockfile (npm install writes it)." }];
    }
    const r = spawnSync(npm, ["audit", "--json", "--omit=dev"], { cwd: project.root, encoding: "utf8" });
    if (r.error?.code === "ENOENT") {
      return [{ check: "npm-audit", severity: "info", file: "package-lock.json", message: "npm audit did not run: npm is not installed.", remedy: "Install Node.js and npm, or run npm audit in CI." }];
    }
    let report;
    try { report = JSON.parse(r.stdout); } catch { report = null; }
    if (!report || report.error || !report.vulnerabilities) {
      return [{ check: "npm-audit", severity: "medium", file: "package-lock.json", message: `npm audit failed (${report?.error?.code ?? `exit ${r.status}`}): the dependencies were NOT checked.`,
        remedy: "Run npm audit by hand and fix what stops it (the network, the lockfile)." }];
    }
    const sev = { critical: "high", high: "high", moderate: "medium", low: "low", info: "info" };
    return Object.entries(report.vulnerabilities).map(([name, v]) => ({ check: "npm-audit", severity: sev[v.severity] ?? "medium", file: "package-lock.json",
      message: `${name} (${v.range ?? "?"}): a known ${v.severity} vulnerability${v.isDirect ? "" : " (an indirect dependency)"}.`,
      remedy: v.fixAvailable ? "npm audit fix (or update the package that pulls it in)." : "No fix yet: read the advisory, and limit or replace the package." }));
  },
};
