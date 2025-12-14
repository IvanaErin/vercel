import snowflake from "snowflake-sdk";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const conn = snowflake.createConnection({
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USER,
  password: process.env.SNOWFLAKE_PASSWORD,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  database: process.env.SNOWFLAKE_DATABASE,
  schema: process.env.SNOWFLAKE_SCHEMA
});

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  conn.connect(err => {
    if (err) {
      console.error("Snowflake connect error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    conn.execute({
      sqlText: `
        SELECT id, username, password, role
        FROM staff
        WHERE username = ?
        LIMIT 1
      `,
      binds: [username],
      complete: (err, stmt, rows) => {
        if (err) {
          console.error("Query error:", err);
          return res.status(500).json({ error: "Query failed" });
        }

        if (!rows.length) {
          return res.status(401).json({ error: "Invalid login" });
        }

        const staff = rows[0];

        if (sha256(password) !== staff.PASSWORD) {
          return res.status(401).json({ error: "Invalid login" });
        }

        // ✅ JWT TOKEN
        const token = jwt.sign(
          {
            staff_id: staff.ID,
            username: staff.USERNAME,
            role: "staff",
            staff_role: staff.ROLE
          },
          process.env.JWT_SECRET,
          { expiresIn: "1d" }
        );

        return res.json({
          token,
          staff: {
            id: staff.ID,
            username: staff.USERNAME,
            role: staff.ROLE
          }
        });
      }
    });
  });
}
