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

  // 🔐 Staff auth
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;)\s*staff_id=(\d+)/);
  const staff_id = match ? Number(match[1]) : null;

  if (!staff_id) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { order_id } = req.body;
  const orderId = Number(order_id);

  if (!orderId) {
    return res.status(400).json({ error: "Invalid order id" });
  }

  const conn = getConnection();

  conn.connect((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Snowflake connection failed" });
    }

    // 1️⃣ Get order owner
    conn.execute({
      sqlText: `
        SELECT user_id
        FROM orders
        WHERE id = ?
      `,
      binds: [orderId],
      complete: (err, stmt, rows) => {
        if (err || rows.length === 0) {
          conn.destroy();
          return res.status(404).json({ error: "Order not found" });
        }

        const userId = rows[0].USER_ID;

        // 2️⃣ Update order status → Completed
        conn.execute({
          sqlText: `
            UPDATE orders
            SET status = 'Completed'
            WHERE id = ?
          `,
          binds: [orderId],
          complete: (err) => {
            if (err) {
              conn.destroy();
              return res.status(500).json({ error: "Failed to complete order" });
            }

            // 3️⃣ Notify user
            conn.execute({
              sqlText: `
                INSERT INTO notifications
                  (user_id, receiver_id, message, receiver_role, sender_role)
                VALUES (?, ?, ?, 'user', 'staff')
              `,
              binds: [
                userId,
                userId,
                `Your order #${orderId} is marked as completed. Thank you!`,
              ],
              complete: (err) => {
                conn.destroy();

                if (err) {
                  return res.status(500).json({ error: "Failed to notify user" });
                }

                return res.json({ success: true });
              },
            });
          },
        });
      },
    });
  });
}
