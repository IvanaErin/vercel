import snowflake from "snowflake-sdk";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  /* 🔐 AUTH */
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token" });

  let staff;
  try {
    staff = jwt.verify(token, process.env.JWT_SECRET);
    if (staff.role !== "staff")
      return res.status(403).json({ error: "Forbidden" });
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  /* 📦 BODY */
  const { id, name, price, description, servings, category } = req.body;

  if (!id || !name || price === undefined || servings === undefined) {
    return res.status(400).json({ error: "Missing fields" });
  }

  /* 🧊 SNOWFLAKE */
  const conn = snowflake.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USERNAME,
    password: process.env.SNOWFLAKE_PASSWORD,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
    database: process.env.SNOWFLAKE_DATABASE,
    schema: process.env.SNOWFLAKE_SCHEMA
  });

  conn.connect(err => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "DB connection failed" });
    }

    conn.execute({
      sqlText: `
        UPDATE menu
        SET
          name = ?,
          price = ?,
          description = ?,
          category = ?,
          servings = ?
        WHERE id = ?
      `,
      binds: [
        name,
        Number(price),
        description || "",
        category || "others",
        Number(servings),
        Number(id)
      ],
      complete: (err) => {
        conn.destroy();

        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Update failed" });
        }

        res.json({ success: true });
      }
    });
  });
}
