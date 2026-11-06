import { at, walk, calleeName, builds, ts } from "../core.js";

const SQL_CALLS = new Set(["query", "execute", "raw", "$queryRawUnsafe", "$executeRawUnsafe", "unsafe", "prepare", "exec"]);
const SQL_WORDS = /\b(select|insert|update|delete|where|from|into|values)\b/i;

// db.query(`SELECT … ${id}`) or "… " + id: an SQL injection with user input. A tagged template (sql`…`, Prisma's
// $queryRaw`…`) binds its values, so it is not reported.
export default {
  name: "sql-built-from-strings",
  run(project) {
    const out = [];
    for (const f of project.files) {
      walk(f, (n) => {
        if (!ts.isCallExpression(n) || !SQL_CALLS.has(calleeName(n)) || !n.arguments[0]) return;
        const a = n.arguments[0];
        if (builds(a) && SQL_WORDS.test(a.getText(f.ast))) {
          out.push(at("sql-built-from-strings", "high", f, n, "SQL text is built from a variable: with user input, that is an SQL injection.",
            "Pass the values as parameters: db.query('… WHERE id = $1', [id]), or use a tagged template that binds them (sql`… ${id}`)."));
        }
      });
    }
    return out;
  },
};
