import jwt from "jsonwebtoken";
export function user(token: string, key: string) { return jwt.verify(token, key, { algorithms: ["RS256"] }); }
