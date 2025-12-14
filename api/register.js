import snowflake from "snowflake-sdk";
import bcrypt from "bcryptjs";

const connection = snowflake.createConnection({
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USERNAME,
  password: process.env.SNOWFLAKE_PASSWORD,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  database: process.env.SNOWFLAKE_DATABASE,
  schema: process.env.SNOWFLAKE_SCHEMA,
  role: process.env.SNOWFLAKE_ROLE
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);

    connection.connect(err => {
      if (err) {
        console.error("Connection error:", err);
        return res.status(500).json({ error: "DB connection failed" });
      }

      connection.execute({
        sqlText: `
          INSERT INTO users (username, email, password, role)
          VALUES (?, ?, ?, 'user')
        `,
        binds: [username, email.toLowerCase(), hashed],
        complete: (err) => {
          if (err) {
            console.error("Insert error:", err);
            return res.status(400).json({ error: err.message });
          }

          return res.json({ success: true });
        }
      });
    });

  } catch (err) {
    console.error("Server crash:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
