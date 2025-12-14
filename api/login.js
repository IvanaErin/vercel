import snowflake from "snowflake-sdk";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const conn = snowflake.createConnection({
      account: process.env.SNOWFLAKE_ACCOUNT,
      username: process.env.SNOWFLAKE_USERNAME,
      password: process.env.SNOWFLAKE_PASSWORD,
      warehouse: process.env.SNOWFLAKE_WAREHOUSE,
      database: process.env.SNOWFLAKE_DATABASE,
      schema: process.env.SNOWFLAKE_SCHEMA,
      role: process.env.SNOWFLAKE_ROLE,
    });

    await new Promise((resolve, reject) =>
      conn.connect(err => (err ? reject(err) : resolve()))
    );

    const rows = await new Promise((resolve, reject) =>
      conn.execute({
        sqlText: `
          SELECT id, username, password, role
          FROM users
          WHERE LOWER(email) = ?
          LIMIT 1
        `,
        binds: [email.toLowerCase()],
        complete: (err, stmt, rows) =>
          err ? reject(err) : resolve(rows),
      })
    );

    if (!rows.length) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.PASSWORD);

    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // ✅ CREATE TOKEN
    const token = jwt.sign(
      {
        id: user.ID,
        username: user.USERNAME,
        role: user.ROLE,
      },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      success: true,
      token,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
