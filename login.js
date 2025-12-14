import snowflake from "snowflake-sdk";
import bcrypt from "bcryptjs";

function getConnection() {
  return snowflake.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USERNAME,
    password: process.env.SNOWFLAKE_PASSWORD,
    database: process.env.SNOWFLAKE_DATABASE,
    schema: process.env.SNOWFLAKE_SCHEMA,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
    role: process.env.SNOWFLAKE_ROLE,
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  const conn = getConnection();

  conn.connect((err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // 1️⃣ Check USERS table first
    conn.execute({
      sqlText: `
        SELECT id, password, 'user' AS role
        FROM users
        WHERE username = ?
      `,
      binds: [username],
      complete: async (err, stmt, rows) => {
        if (!err && rows.length > 0) {
          const valid = await bcrypt.compare(password, rows[0].PASSWORD);
          if (!valid) {
            return res.status(401).json({ error: "Invalid password" });
          }

          return res.json({
            success: true,
            role: "user",
            id: rows[0].ID,
          });
        }

        // 2️⃣ If not user → check STAFF table
        conn.execute({
          sqlText: `
            SELECT id, password, 'staff' AS role
            FROM staff
            WHERE username = ?
          `,
          binds: [username],
          complete: async (err, stmt, rows) => {
            if (err || rows.length === 0) {
              return res.status(401).json({ error: "Account not found" });
            }

            // ⚠️ staff1 / 1234 is PLAIN TEXT (for now)
            if (password !== rows[0].PASSWORD) {
              return res.status(401).json({ error: "Invalid password" });
            }

            return res.json({
              success: true,
              role: "staff",
              id: rows[0].ID,
            });
          },
        });
      },
    });
  });
}
