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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 🔐 simple cookie auth
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;)\s*user_id=(\d+)/);
  const user_id = match ? Number(match[1]) : null;

  if (!user_id) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { menu_id, quantity } = req.body;
  const menuId = Number(menu_id);
  const qty = Number(quantity) || 1;

  if (!menuId) {
    return res.status(400).json({ error: "Invalid menu id" });
  }

  const conn = getConnection();

  conn.connect((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Snowflake connection failed" });
    }

    conn.execute({
      sqlText: `
        INSERT INTO cart (user_id, menu_id, quantity, added_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP())
      `,
      binds: [user_id, menuId, qty],
      complete: (err) => {
        conn.destroy();

        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Failed to add to cart" });
        }

        return res.json({ success: true });
      },
    });
  });
}
