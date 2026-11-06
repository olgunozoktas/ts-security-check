declare const db: any;
export async function f(id: string, name: string) {
  await db.query(`SELECT * FROM users WHERE id = ${id}`);
  await db.execute("DELETE FROM posts WHERE name = " + name);
}
