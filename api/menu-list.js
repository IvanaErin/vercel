import snowflake from "snowflake-sdk";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  const conn = snowflake.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USERNAME,
    password: process.env.SNOWFLAKE_PASSWORD,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
    database: process.env.SNOWFLAKE_DATABASE,
    schema: process.env.SNOWFLAKE_SCHEMA
  });

  conn.connect(err => {
    if (err) return res.status(500).json({ error: "DB connect failed" });

    conn.execute({
      sqlText: `
        SELECT
          id,
          name,
          price,
          description,
          image,
          category,
          servings
        FROM menu
        ORDER BY category, name
      `,
      complete: (err, stmt, rows) => {
        conn.destroy();

        if (err) {
          console.error(err);
          return res.status(500).json({ error: err.message });
        }

        // ✅ GROUP BY CATEGORY (THIS IS THE FIX)
        const map = {};

        rows.forEach(r => {
          const cat = r.CATEGORY || "Others";
          if (!map[cat]) {
            map[cat] = {
              name: cat,
              items: []
            };
          }

          map[cat].items.push({
            id: r.ID,
            name: r.NAME,
            price: Number(r.PRICE),
            description: r.DESCRIPTION,
            image: r.IMAGE,
            servings: r.SERVINGS
          });
        });

        res.json({
          categories: Object.values(map)
        });
      }
    });
  });
}
