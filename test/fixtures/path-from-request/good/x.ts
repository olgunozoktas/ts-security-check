import fs from "node:fs"; import path from "node:path";
const DIR = "/srv/files";
export function h(req: any, res: any) {
  const name = String(req.params.name);
  const p = path.resolve(DIR, name);
  if (!p.startsWith(DIR + path.sep)) return res.status(400).end();
  res.send(fs.readFileSync(p));
}
