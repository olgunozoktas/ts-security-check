export function h(res: any, id: string) {
  res.cookie("session", id);
  res.cookie("theme", "dark", { httpOnly: true });
}
