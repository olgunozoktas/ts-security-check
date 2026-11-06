import { execFile } from "node:child_process";
export function f(ref: string, text: string) {
  execFile("git", ["log", ref]);
  /a(b)/.exec(text);
  const m = new RegExp(ref).exec(text);
  return m;
}
