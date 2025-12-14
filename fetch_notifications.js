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
  // 🔐 User or Staff auth
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;)\s*(user_id|staff_id)=(\d+)/);
  const receiver_id = match ? Number(match[2]) : null;

  if (!receiver_id) {
    return res.json({ notifications: [] });
  }

  const conn = getConnection();

  conn.connect((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Snowflake connection failed" });
    }

    conn.execute({
      sqlText: `
        SELECT *
        FROM notifications
        WHERE receiver_id = ?
        ORDER BY id DESC
        LIMIT 50
      `,
      binds: [receiver_id],
      complete: (err, stmt, rows) => {
        conn.destroy();

        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Failed to fetch notifications" });
        }

        // 🔁 Normalize Snowflake columns
        const notifications = rows.map((r) => ({
          id: r.ID,
          user_id: r.USER_ID,
          receiver_id: r.RECEIVER_ID,
          message: r.MESSAGE,
          is_read: r.IS_READ,
          created_at: r.CREATED_AT,
          receiver_role: r.RECEIVER_ROLE,
          sender_role: r.SENDER_ROLE,
          type: r.TYPE,
        }));

        return res.json({ notifications });
      },
    });
  });
}
