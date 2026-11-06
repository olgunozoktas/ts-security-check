import crypto from "node:crypto";
export function hashPassword(password: string, salt: Buffer) { return crypto.scryptSync(password, salt, 64); }
export function etag(body: string) { return crypto.createHash("sha256").update(body).digest("hex"); }
