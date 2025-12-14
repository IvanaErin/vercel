import snowflake from "snowflake-sdk";
import jwt from "jsonwebtoken";

function connectSnowflake() {
  return new Promise((resolve, reject) => {
    const conn = snowflake.createConnection({
      account: process.env.SNOWFLAKE_ACCOUNT,
      username: process.env.SNOWFLAKE_USERNAME,
      password: process.env.SNOWFLAKE_PASSWORD,
      warehouse: process.env.SNOWFLAKE_WAREHOUSE,
      database: process.env.SNOWFLAKE_DATABASE,
      schema: process.env.SNOWFLAKE_SCHEMA,
      role: process.env.SNOWFLAKE_ROLE,
    });

    conn.connect(err => (err ? reject(err) : resolve(conn)));
  });
}

function execute(conn, sql, binds = []) {
  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText: sql,
      binds,
      complete: (err, stmt, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 🔐 READ TOKEN
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "No token" });
  }

  let user;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  const limit = Number(req.query.limit || 4);

  try {
    const conn = await connectSnowflake();

    // 1️⃣ GET ORDERS
    const orders = await execute(
      conn,
      `
      SELECT id, order_date, status, total_amount
      FROM orders
      WHERE user_id = ?
      ORDER BY order_date DESC
      LIMIT ?
      `,
      [user.id, limit]
    );

    // 2️⃣ GET ITEMS FOR EACH ORDER
    for (const o of orders) {
      const items = await execute(
        conn,
        `
        SELECT m.name, oi.quantity
        FROM order_items oi
        JOIN menu m ON m.id = oi.menu_id
        WHERE oi.order_id = ?
        `,
        [o.ID]
      );

      o.items = items.map(i => ({
        name: i.NAME,
        quantity: i.QUANTITY,
      }));
    }

    conn.destroy();

    return res.json({
      success: true,
      orders: orders.map(o => ({
        id: o.ID,
        order_date: o.ORDER_DATE,
        status: o.STATUS,
        total_amount: o.TOTAL_AMOUNT,
        items: o.items,
      })),
    });

  } catch (err) {
    console.error("ORDERS ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
