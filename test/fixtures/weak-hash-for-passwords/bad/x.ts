import crypto from "node:crypto";
export function hashPassword(password: string) { return crypto.createHash("md5").update(password).digest("hex"); }
export function check(password: string) { return crypto.createHash("SHA1").update(password).digest("hex"); }
