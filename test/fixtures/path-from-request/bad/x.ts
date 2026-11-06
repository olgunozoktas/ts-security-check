import fs from "node:fs"; import path from "node:path";
export function h(req: any, res: any) {
  res.send(fs.readFileSync(path.join("/srv/files", req.params.name)));
  fs.createReadStream(req.query.file);
}
