import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const sql = `
      SELECT id, username, password, role
      FROM ${process.env.SNOWFLAKE_DATABASE}.${process.env.SNOWFLAKE_SCHEMA}.users
      WHERE email='${email}'
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

    if (!response.ok || !data.data || data.data.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = data.data[0];
    const hashedPassword = user[2]; // password column

    const match = await bcrypt.compare(password, hashedPassword);

    if (!match) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    return res.json({
      success: true,
      user: {
        id: user[0],
        username: user[1],
        role: user[3],
      },
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
