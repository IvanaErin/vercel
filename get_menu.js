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
  const conn = getConnection();

  conn.connect((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Snowflake connection failed" });
    }

    conn.execute({
      sqlText: `
        SELECT id, name, price, image
        FROM menu
        ORDER BY id DESC
      `,
      complete: (err, stmt, rows) => {
        conn.destroy();

        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Failed to fetch menu" });
        }

        // 🔁 Normalize Snowflake column names
        const menu = rows.map((r) => ({
          id: r.ID,
          name: r.NAME,
          price: r.PRICE,
          image: r.IMAGE,
        }));

        return res.json({ menu });
      },
    });
  });
}
