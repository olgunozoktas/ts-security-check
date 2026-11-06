export function h(res: any, id: string, opts: object) {
  res.cookie("session", id, { httpOnly: true, secure: true, sameSite: "lax" });
  res.cookie("session", "", { maxAge: 0 });
  res.cookie("x", id, opts);
}
