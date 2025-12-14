import snowflake from "snowflake-sdk";
import crypto from "crypto";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // 🔐 SHA256 hash (MATCHES PHP)
    const hashed = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    const conn = snowflake.createConnection({
      account: process.env.SNOWFLAKE_ACCOUNT,
      username: process.env.SNOWFLAKE_USERNAME,
      password: process.env.SNOWFLAKE_PASSWORD,
      warehouse: process.env.SNOWFLAKE_WAREHOUSE,
      database: process.env.SNOWFLAKE_DATABASE,
      schema: process.env.SNOWFLAKE_SCHEMA,
    });

    conn.connect((err) => {
      if (err) {
        console.error("Snowflake connect error:", err);
        return res.status(500).json({ error: "DB connection failed" });
      }

      conn.execute({
        sqlText: `SELECT * FROM staff WHERE username = ?`,
        binds: [username],
        complete(err, stmt, rows) {
          if (err) {
            console.error("Query error:", err);
            conn.destroy();
            return res.status(500).json({ error: "Query failed" });
          }

          if (!rows.length) {
            conn.destroy();
            return res.status(401).json({ error: "Invalid login" });
          }

          const staff = rows[0];

          // ✅ MUST BE UPPERCASE
          if (hashed !== staff.PASSWORD) {
            conn.destroy();
            return res.status(401).json({ error: "Invalid login" });
          }

          const token = jwt.sign(
            {
              id: staff.ID,
              role: staff.ROLE,
              username: staff.USERNAME,
            },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
          );

          conn.destroy();

          return res.json({
            token,
            staff: {
              id: staff.ID,
              username: staff.USERNAME,
              role: staff.ROLE,
            },
          });
        },
      });
    });
  } catch (e) {
    console.error("Server error:", e);
    res.status(500).json({ error: "Server error" });
  }
}
