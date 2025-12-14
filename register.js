import snowflake from "snowflake-sdk";

function getConnection() {
  return snowflake.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USERNAME,
    password: process.env.SNOWFLAKE_PASSWORD,
    database: process.env.SNOWFLAKE_DATABASE,
    schema: process.env.SNOWFLAKE_SCHEMA,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
    role: process.env.SNOWFLAKE_ROLE,
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

  const conn = getConnection();

  conn.connect((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "DB connection failed" });
    }

    conn.execute({
      sqlText: `
        INSERT INTO users (username, email, password)
        VALUES (?, ?, ?)
      `,
      binds: [username, email, password],
      complete: (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "User already exists or DB error" });
        }

        return res.json({ success: true });
      },
    });
  });
}
