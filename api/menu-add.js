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
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).end();

    jwt.verify(token, process.env.JWT_SECRET);

    const form = formidable({ keepExtensions: true });

    form.parse(req, async (err, fields, files) => {
      if (err) return res.status(400).json({ error: "Form parse error" });

      const { name, price, category, description } = fields;
      const imageFile = files.image;

      if (!imageFile) {
        return res.status(400).json({ error: "Image required" });
      }

      // 🔥 UPLOAD IMAGE
      const upload = await cloudinary.v2.uploader.upload(
        imageFile.filepath,
        { folder: "menu" }
      );

      const imageUrl = upload.secure_url;

      // 🔥 INSERT INTO SNOWFLAKE
      const conn = snowflake.createConnection({
        account: process.env.SNOWFLAKE_ACCOUNT,
        username: process.env.SNOWFLAKE_USERNAME,
        password: process.env.SNOWFLAKE_PASSWORD,
        warehouse: process.env.SNOWFLAKE_WAREHOUSE,
        database: process.env.SNOWFLAKE_DATABASE,
        schema: process.env.SNOWFLAKE_SCHEMA
      });

      conn.connect(() => {
        conn.execute({
          sqlText: `
            INSERT INTO menu (name, price, category, description, image)
            VALUES (?, ?, ?, ?, ?)
          `,
          binds: [name, price, category, description, imageUrl],
          complete: () => {
            conn.destroy();
            res.json({ success: true });
          }
        });
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}
