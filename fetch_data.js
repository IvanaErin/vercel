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
  const q = req.query.q || "";
  const id = Number(req.query.id || 0);

  const conn = getConnection();

  conn.connect((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Snowflake connection failed" });
    }

    // 🔹 MENU LIST
    if (q === "menu") {
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

          const menu = rows.map((r) => ({
            id: r.ID,
            name: r.NAME,
            price: r.PRICE,
            image: r.IMAGE,
          }));

          return res.json({ menu });
        },
      });
      return;
    }

    // 🔹 SINGLE ORDER
    if (q === "order" && id) {
      conn.execute({
        sqlText: `
          SELECT *
          FROM orders
          WHERE id = ?
        `,
        binds: [id],
        complete: (err, stmt, rows) => {
          conn.destroy();

          if (err) {
            console.error(err);
            return res.status(500).json({ error: "Failed to fetch order" });
          }

          const order = rows.length
            ? {
                id: rows[0].ID,
                user_id: rows[0].USER_ID,
                total_amount: rows[0].TOTAL_AMOUNT,
                status: rows[0].STATUS,
                payment_method: rows[0].PAYMENT_METHOD,
                created_at: rows[0].CREATED_AT,
              }
            : null;

          return res.json({ order });
        },
      });
      return;
    }

    // 🔹 DEFAULT COUNTS
    conn.execute({
      sqlText: `
        SELECT COUNT(*) AS c
        FROM menu
      `,
      complete: (err, stmt, rows) => {
        conn.destroy();

        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Failed to fetch counts" });
        }

        return res.json({ counts: rows[0].C });
      },
    });
  });
}
