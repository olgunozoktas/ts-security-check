import cors from "cors"; declare const app: any;
app.use(cors({ origin: ["https://example.com"] }));
export function h(res: any) { res.setHeader("Access-Control-Allow-Origin", "https://example.com"); }
