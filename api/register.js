import snowflake from "snowflake-sdk";
import bcrypt from "bcryptjs";

function connectSnowflake() {
  return new Promise((resolve, reject) => {
    const conn = snowflake.createConnection({
      account: process.env.SNOWFLAKE_ACCOUNT,
      username: process.env.SNOWFLAKE_USERNAME,
      password: process.env.SNOWFLAKE_PASSWORD,
      warehouse: process.env.SNOWFLAKE_WAREHOUSE,
      database: process.env.SNOWFLAKE_DATABASE,
      schema: process.env.SNOWFLAKE_SCHEMA,
      role: process.env.SNOWFLAKE_ROLE,
    });

    conn.connect(err => {
      if (err) reject(err);
      else resolve(conn);
    });
  });
}

function execute(conn, sql, binds = []) {
  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText: sql,
      binds,
      complete: (err, stmt, rows) => {
        if (err) reject(err);
        else resolve(rows);
      },
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const conn = await connectSnowflake();

    // 🔎 CHECK DUPLICATE
    const existing = await execute(
      conn,
      `
      SELECT 1
      FROM ${process.env.SNOWFLAKE_DATABASE}.${process.env.SNOWFLAKE_SCHEMA}.users
      WHERE username = ? OR email = ?
      `,
      [username, email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    // ✅ INSERT USER
    await execute(
      conn,
      `
      INSERT INTO ${process.env.SNOWFLAKE_DATABASE}.${process.env.SNOWFLAKE_SCHEMA}.users
      (username, email, password, role)
      VALUES (?, ?, ?, 'user')
      `,
      [username, email, hashed]
    );

    return res.json({ success: true });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({
      error: err.message,
      code: err.code || "UNKNOWN"
    });
  }
}
