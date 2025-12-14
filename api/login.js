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

    conn.connect(err => (err ? reject(err) : resolve(conn)));
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

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const conn = await connectSnowflake();

    const rows = await execute(
      conn,
      `
      SELECT id, username, password, role
      FROM ${process.env.SNOWFLAKE_DATABASE}.${process.env.SNOWFLAKE_SCHEMA}.users
      WHERE LOWER(email) = ?
      LIMIT 1
      `,
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const { ID, USERNAME, PASSWORD, ROLE } = rows[0];

    const ok = await bcrypt.compare(password, PASSWORD);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    return res.json({
      success: true,
      user: {
        id: ID,
        username: USERNAME,
        role: ROLE,
      },
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
