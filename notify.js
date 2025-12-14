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

/**
 * Snowflake notification helper
 */
export function sendNotification({
  receiver_id,
  message,
  receiver_role = "user",
  sender_role = "staff",
  user_id = null,
  onComplete = () => {},
}) {
  const conn = getConnection();

  conn.connect((err) => {
    if (err) {
      console.error("Snowflake notify connect error:", err);
      return onComplete(err);
    }

    conn.execute({
      sqlText: `
        INSERT INTO notifications
          (receiver_id, receiver_role, sender_role, message, user_id, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP())
      `,
      binds: [
        receiver_id,
        receiver_role,
        sender_role,
        message,
        user_id,
      ],
      complete: (err) => {
        conn.destroy();

        if (err) {
          console.error("Snowflake notify insert error:", err);
          return onComplete(err);
        }

        onComplete(null);
      },
    });
  });
}
