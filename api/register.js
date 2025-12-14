import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const hash = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO ${process.env.SNOWFLAKE_DATABASE}.${process.env.SNOWFLAKE_SCHEMA}.users
      (username, email, password, role)
      VALUES (?, ?, ?, 'user')
    `;

    const response = await fetch(
      `https://${process.env.SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/statements`,
      {
        method: "POST",
        headers: {
          "Authorization": "Basic " + Buffer.from(
            `${process.env.SNOWFLAKE_USERNAME}:${process.env.SNOWFLAKE_PASSWORD}`
          ).toString("base64"),
          "Content-Type": "application/json",
          "X-Snowflake-Authorization-Token-Type": "KEYPAIR_JWT"
        },
        body: JSON.stringify({
          statement: sql,
          binds: [username, email, hash],
          warehouse: process.env.SNOWFLAKE_WAREHOUSE,
          role: process.env.SNOWFLAKE_ROLE
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(data);
      return res.status(500).json({ error: "User already exists" });
    }

    return res.json({ success: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
