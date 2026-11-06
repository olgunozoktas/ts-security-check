import { exec, execSync as run } from "node:child_process";
import * as cp from "child_process";
export function f(ref: string, cmd: string) {
  exec(`git log ${ref}`);
  run("ls " + ref);
  cp.exec(cmd);
}
