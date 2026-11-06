declare const db: any; declare const sql: any;
export async function f(id: string) {
  await db.query("SELECT * FROM users WHERE id = $1", [id]);
  await db.query(sql`SELECT * FROM users WHERE id = ${id}`);
  await db.query(`SELECT 1`);
}
