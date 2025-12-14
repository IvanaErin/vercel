import snowflake from "snowflake-sdk";
import jwt from "jsonwebtoken";
import formidable from "formidable";
import cloudinary from "cloudinary";

export const config = { api: { bodyParser: false } };

// ---------------- CLOUDINARY ----------------
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ---------------- DB HELPER ----------------
function db() {
  return snowflake.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USERNAME,
    password: process.env.SNOWFLAKE_PASSWORD,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
    database: process.env.SNOWFLAKE_DATABASE,
    schema: process.env.SNOWFLAKE_SCHEMA
  });
}

// ---------------- AUTH ----------------
function requireStaff(req) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) throw new Error("NO_TOKEN");

  const staff = jwt.verify(token, process.env.JWT_SECRET);
  if (staff.role !== "staff") throw new Error("FORBIDDEN");
}

// =================================================
// HANDLER
// =================================================
export default async function handler(req, res) {

  // ===============================
  // GET MENU (STAFF VIEW)
  // ===============================
  if (req.method === "GET") {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "No token" });

    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }

    const conn = db();
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
        complete: (err, _, rows) => {
          conn.destroy();
          if (err) return res.status(500).json({ error: err.message });

          // GROUP BY CATEGORY
          const map = {};
          rows.forEach(r => {
            const cat = r.CATEGORY || "Others";
            if (!map[cat]) {
              map[cat] = { name: cat, items: [] };
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

          res.json({ categories: Object.values(map) });
        }
      });
    });
    return;
  }

  // ===============================
  // POST ADD MENU (STAFF ONLY)
  // ===============================
  if (req.method === "POST") {
    try {
      requireStaff(req);
    } catch {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const form = formidable({
      multiples: false,
      maxFileSize: 5 * 1024 * 1024 // 5MB
    });

    form.parse(req, async (err, fields, files) => {
      if (err) return res.status(400).json({ error: "Form parse failed" });

      // FIELD EXTRACTION (FORMIDABLE v3 SAFE)
      const name = fields.name?.toString();
      const price = Number(fields.price);
      const servings = Number(fields.servings);
      const category = fields.category?.toString() || "others";
      const description = fields.description?.toString() || "";

      if (!name || isNaN(price) || isNaN(servings)) {
        return res.status(400).json({
          error: "Invalid fields",
          debug: { name, price, servings }
        });
      }

      // IMAGE UPLOAD
      let imageUrl = "default.png";

      if (files.image) {
        try {
          const upload = await cloudinary.v2.uploader.upload(
            files.image.filepath,
            { folder: "menu" }
          );
          imageUrl = upload.secure_url;
        } catch (e) {
          console.error("CLOUDINARY ERROR:", e);
          return res.status(500).json({ error: "Image upload failed" });
        }
      }

      // INSERT DB
      const conn = db();
      conn.connect(err => {
        if (err) return res.status(500).json({ error: "DB connect failed" });

        conn.execute({
          sqlText: `
            INSERT INTO menu
            (name, price, category, description, image, servings)
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          binds: [
            name,
            price,
            category,
            description,
            imageUrl,
            servings
          ],
          complete: err => {
            conn.destroy();
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
          }
        });
      });
    });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
