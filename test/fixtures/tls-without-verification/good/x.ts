import https from "node:https"; declare const ca: string;
export const agent = new https.Agent({ rejectUnauthorized: true, ca });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
