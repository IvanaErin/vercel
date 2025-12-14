import snowflake from "snowflake-sdk";
import jwt from "jsonwebtoken";
import formidable from "formidable";

export const config = { api: { bodyParser:false } };

export default async function handler(req,res){
  const token = req.headers.authorization?.replace("Bearer ","");
  if(!token) return res.status(401).end();

  jwt.verify(token, process.env.JWT_SECRET);

  const form = formidable();
  form.parse(req, async (err, fields, files)=>{
    const { name, price, category, description } = fields;

    // upload image to Supabase / Cloudinary here
    const imageUrl = null;

    const conn = snowflake.createConnection({...});
    conn.connect(()=>{
      conn.execute({
        sqlText:`INSERT INTO menu(name,price,category,description,image)
                 VALUES(?,?,?,?,?)`,
        binds:[name,price,category,description,imageUrl],
        complete:()=>{ conn.destroy(); res.json({success:true}); }
      });
    });
  });
}

