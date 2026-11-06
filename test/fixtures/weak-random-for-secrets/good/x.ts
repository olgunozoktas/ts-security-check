import crypto from "node:crypto";
export const token = crypto.randomBytes(32).toString("hex");
export const jitter = Math.random() * 100;
