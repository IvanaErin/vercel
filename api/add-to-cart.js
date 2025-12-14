import snowflake from "snowflake-sdk";

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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "No token" });

  const token = auth.split(" ")[1];

  // ⚠️ TEMP: replace with real JWT decode later
  const userId = token; // or decoded user ID

  const { menu_id } = req.body;
  if (!menu_id) return res.status(400).json({ error: "Missing menu_id" });

  try {
    const conn = await connectSnowflake();

    await execute(
      conn,
      `
      INSERT INTO cart (user_id, menu_id, quantity)
      VALUES (?, ?, 1)
      `,
      [userId, menu_id]
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add to cart" });
  }
}
