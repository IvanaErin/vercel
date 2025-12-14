import snowflake from "snowflake-sdk";

export default async (req,res)=>{
  const {id,status} = req.body;
  const conn = snowflake.createConnection({...});
  conn.connect(()=>{
    conn.execute({
      sqlText:"UPDATE orders SET status=? WHERE id=?",
      binds:[status,id],
      complete:()=>{ conn.destroy(); res.json({ok:true}); }
    });
  });
};
