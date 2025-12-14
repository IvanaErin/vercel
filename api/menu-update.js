import snowflake from "snowflake-sdk";

export default async (req,res)=>{
  const {id,name,price,description} = req.body;

  const conn = snowflake.createConnection({
    account:process.env.SF_ACCOUNT,
    username:process.env.SF_USER,
    password:process.env.SF_PASS,
    warehouse:process.env.SF_WH,
    database:process.env.SF_DB,
    schema:process.env.SF_SCHEMA
  });

  conn.connect(()=>{
    conn.execute({
      sqlText:`UPDATE menu 
               SET name=?, price=?, description=? 
               WHERE id=?`,
      binds:[name,price,description,id],
      complete:()=>{ conn.destroy(); res.json({ok:true}); }
    });
  });
};
