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
  // 🔐 User auth via cookie
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;)\s*user_id=(\d+)/);
  const user_id = match ? Number(match[1]) : null;

  if (!user_id) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const conn = getConnection();

  conn.connect((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Snowflake connection failed" });
    }

    conn.execute({
      sqlText: `
        SELECT
          c.id,
          c.quantity,
          m.id AS menu_id,
          m.name,
          m.price,
          m.image
        FROM cart c
        JOIN menu m ON m.id = c.menu_id
        WHERE c.user_id = ?
      `,
      binds: [user_id],
      complete: (err, stmt, rows) => {
        conn.destroy();

        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Failed to fetch cart" });
        }

        // 🔁 Normalize Snowflake column names
        const items = rows.map((r) => ({
          id: r.ID,
          quantity: r.QUANTITY,
          menu_id: r.MENU_ID,
          name: r.NAME,
          price: r.PRICE,
          image: r.IMAGE,
        }));

        return res.json({ items });
      },
    });
  });
}
