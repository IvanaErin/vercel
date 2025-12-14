import snowflake from "snowflake-sdk";
import jwt from "jsonwebtoken";

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
  // 🔐 READ JWT
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, error: "No token" });
  }

  let user;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, error: "Invalid token" });
  }

  const conn = getConnection();

  conn.connect(err => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: "DB connect failed" });
    }

    conn.execute({
      sqlText: `
        SELECT
          c.id          AS cart_id,
          c.quantity    AS quantity,
          m.id          AS menu_id,
          m.name        AS name,
          m.price       AS price,
          m.image       AS image
        FROM cart c
        JOIN menu m ON m.id = c.menu_id
        WHERE c.user_id = ?
      `,
      binds: [user.id],
      complete: (err, stmt, rows) => {
        conn.destroy();

        if (err) {
          console.error(err);
          return res.status(500).json({ success: false, error: "Query failed" });
        }

        // ✅ Snowflake returns uppercase keys
        const items = rows.map(r => ({
          cart_id: r.CART_ID,
          quantity: r.QUANTITY,
          menu_id: r.MENU_ID,
          name: r.NAME,
          price: r.PRICE,
          image: r.IMAGE,
        }));

        return res.json({
          success: true,
          items
        });
      }
    });
  });
}
