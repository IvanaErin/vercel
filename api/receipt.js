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
      },
    });
  });
}

export default async function handler(req, res) {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token" });

  let user;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  const order_id = req.query.order_id;
  if (!order_id) return res.status(400).json({ error: "Missing order_id" });

  try {
    const conn = await connectSnowflake();

    const [order] = await execute(
      conn,
      `
      SELECT id, total_amount, order_date
      FROM orders
      WHERE id = ? AND user_id = ?
      `,
      [order_id, user.id]
    );

    if (!order) throw "not found";

    const items = await execute(
      conn,
      `
      SELECT m.name, m.price, oi.quantity
      FROM order_items oi
      JOIN menu m ON m.id = oi.menu_id
      WHERE oi.order_id = ?
      `,
      [order_id]
    );

    conn.destroy();

    const dateObj = new Date(order.ORDER_DATE);

    res.json({
      success: true,
      order: {
        customer: user.username,
        total: order.TOTAL_AMOUNT,
        ref: "555A" + order.ID,
        date: dateObj.toLocaleDateString(),
        time: dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        items: items.map(i => ({
          name: i.NAME,
          price: i.PRICE * i.QUANTITY,
          quantity: i.QUANTITY,
        })),
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Receipt error" });
  }
}
