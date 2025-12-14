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

export default function handler(req, res) {
  // 🔐 User auth
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;)\s*user_id=(\d+)/);
  const user_id = match ? Number(match[1]) : null;

  if (!user_id) {
    return res.json({ count: 0 });
  }

  const conn = getConnection();

  conn.connect((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Snowflake connection failed" });
    }

    conn.execute({
      sqlText: `
        SELECT COALESCE(SUM(quantity), 0) AS cnt
        FROM cart
        WHERE user_id = ?
      `,
      binds: [user_id],
      complete: (err, stmt, rows) => {
        conn.destroy();

        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Failed to fetch cart count" });
        }

        const count = rows.length ? rows[0].CNT : 0;
        return res.json({ count });
      },
    });
  });
}
