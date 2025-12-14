import snowflake from "snowflake-sdk";
import jwt from "jsonwebtoken";
import formidable from "formidable";
import cloudinary from "cloudinary";

export const config = { api: { bodyParser: false } };

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // ✅ AUTH
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

  // ✅ FORM DATA
  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: "Form error" });

    const { name, price, category, description } = fields;
    const imageFile = files.image;

    if (!name || !price)
      return res.status(400).json({ error: "Missing fields" });

    // ✅ UPLOAD IMAGE
    let imageUrl = "default.png";

    if (imageFile) {
      const upload = await cloudinary.v2.uploader.upload(
        imageFile.filepath,
        { folder: "menu" }
      );
      imageUrl = upload.secure_url;
    }

    // ✅ INSERT INTO SNOWFLAKE
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
          INSERT INTO menu (name, price, category, description, image)
          VALUES (?, ?, ?, ?, ?)
        `,
        binds: [
          name,
          Number(price),
          category || "others",
          description || "",
          imageUrl
        ],
        complete: () => {
          conn.destroy();
          res.json({ success: true });
        }
      });
    });
  });
}
