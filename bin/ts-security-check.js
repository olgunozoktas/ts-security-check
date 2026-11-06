#!/usr/bin/env node
// ts-security-check: security checks for a TypeScript or JavaScript project, without AI and without changing anything.
//   ts-security-check [--fail-on medium] [--only a,b] [--json] [--tests] [--list] [project folder]
// Exit 0: nothing at or above --fail-on; 1: a finding; 2: a wrong flag, or a folder with no package.json or tsconfig.json.
import { main } from "../src/cli.js";
process.exitCode = await main(process.argv.slice(2), process.stdout, process.stderr);
