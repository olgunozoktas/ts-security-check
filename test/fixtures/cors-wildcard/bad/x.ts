import cors from "cors"; declare const app: any;
app.use(cors({ origin: "*" }));
export function h(res: any) { res.setHeader("Access-Control-Allow-Origin", "*"); }
