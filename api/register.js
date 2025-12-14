import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, email, password } = req.body || {};

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    // 🔐 hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ parameterized SQL (SAFE)
    const sql = `
      INSERT INTO users (username, email, password, role)
      VALUES (?, ?, ?, 'user')
    `;

    const response = await fetch(
      `https://${process.env.SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/statements`,
      {
        method: "POST",
        headers: {
          "Authorization":
            "Basic " +
            Buffer.from(
              `${process.env.SNOWFLAKE_USERNAME}:${process.env.SNOWFLAKE_PASSWORD}`
            ).toString("base64"),
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          statement: sql,
          bindings: {
            1: { type: "TEXT", value: username },
            2: { type: "TEXT", value: email },
            3: { type: "TEXT", value: hashedPassword },
          },
          database: process.env.SNOWFLAKE_DATABASE,
          schema: process.env.SNOWFLAKE_SCHEMA,
          warehouse: process.env.SNOWFLAKE_WAREHOUSE,
          role: process.env.SNOWFLAKE_ROLE,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Snowflake error:", data);
      return res.status(500).json({
        error: "User already exists or database error",
      });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
