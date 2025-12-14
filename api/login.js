import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email: identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const normalized = identifier.trim().toLowerCase();

    const sql = `
      SELECT id, username, password, role
      FROM ${process.env.SNOWFLAKE_DATABASE}.${process.env.SNOWFLAKE_SCHEMA}.users
      WHERE LOWER(email) = '${normalized}'
         OR LOWER(username) = '${normalized}'
      LIMIT 1
    `;

    const response = await fetch(
      `https://${process.env.SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/statements`,
      {
        method: "POST",
        headers: {
          "Authorization":
            "Basic " +
            Buffer.from(
              `${process.env.SNOWFLAKE_USER}:${process.env.SNOWFLAKE_PASSWORD}`
            ).toString("base64"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          statement: sql,
          warehouse: process.env.SNOWFLAKE_WAREHOUSE,
          role: process.env.SNOWFLAKE_ROLE,
        }),
      }
    );

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return res.status(401).json({ error: "Invalid username/email or password" });
    }

    const [id, username, dbPassword, role] = data.data[0];

    let passwordMatch = false;

    if (dbPassword.startsWith("$2")) {
      passwordMatch = await bcrypt.compare(password, dbPassword);
    } else {
      passwordMatch = password === dbPassword;

      if (passwordMatch) {
        const newHash = await bcrypt.hash(password, 10);

        const updateSql = `
          UPDATE ${process.env.SNOWFLAKE_DATABASE}.${process.env.SNOWFLAKE_SCHEMA}.users
          SET password = '${newHash}'
          WHERE id = ${id}
        `;

        await fetch(
          `https://${process.env.SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/statements`,
          {
            method: "POST",
            headers: {
              "Authorization":
                "Basic " +
                Buffer.from(
                  `${process.env.SNOWFLAKE_USER}:${process.env.SNOWFLAKE_PASSWORD}`
                ).toString("base64"),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              statement: updateSql,
              warehouse: process.env.SNOWFLAKE_WAREHOUSE,
              role: process.env.SNOWFLAKE_ROLE,
            }),
          }
        );
      }
    }

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid username/email or password" });
    }

    return res.json({
      success: true,
      user: { id, username, role },
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
