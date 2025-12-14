import snowflake from "snowflake-sdk";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { username, password } = req.body;

  const conn = snowflake.createConnection({
    account: process.env.SF_ACCOUNT,
    username: process.env.SF_USER,
    password: process.env.SF_PASS,
    warehouse: process.env.SF_WH,
    database: process.env.SF_DB,
    schema: process.env.SF_SCHEMA
  });

  conn.connect(err => {
    if (err) return res.status(500).json({ error: "DB error" });

    conn.execute({
      sqlText: `SELECT id, password_hash FROM staff WHERE username = ?`,
      binds: [username],
      complete: async (err, stmt, rows) => {
        if (!rows || rows.length === 0) {
          conn.destroy();
          return res.status(401).json({ error: "Invalid login" });
        }

        const staff = rows[0];
        const ok = await bcrypt.compare(password, staff.PASSWORD_HASH);

        if (!ok) {
          conn.destroy();
          return res.status(401).json({ error: "Invalid login" });
        }

        const token = jwt.sign(
          { staffId: staff.ID, role: "staff" },
          process.env.JWT_SECRET,
          { expiresIn: "8h" }
        );

        conn.destroy();
        res.json({ token });
      }
    });
  });
}
