import snowflake from "snowflake-sdk";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  const token = req.headers.authorization?.replace("Bearer ","");
  if (!token) return res.status(401).json({error:"Unauthorized"});

  let staff;
  try {
    staff = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({error:"Invalid token"});
  }

  const conn = snowflake.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USERNAME,
    password: process.env.SNOWFLAKE_PASSWORD,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
    database: process.env.SNOWFLAKE_DATABASE,
    schema: process.env.SNOWFLAKE_SCHEMA,
    role: process.env.SNOWFLAKE_ROLE
  });

  conn.connect(err=>{
    if (err) return res.status(500).json({error:"DB error"});

    conn.execute({
      sqlText: `
      SELECT
        (SELECT username FROM staff WHERE id=?) AS username,
        (SELECT COUNT(*) FROM orders WHERE status='Pending') AS pending,
        (SELECT SUM(total_amount) FROM orders WHERE status='Completed') AS total_sales,
        (SELECT COUNT(*) FROM orders WHERE status='Completed' AND DATE(created_at)=CURRENT_DATE) AS completed_today
      `,
      binds:[staff.id],
      complete:(e,_,stats)=>{
        conn.execute({
          sqlText:`SELECT id, customer_name, total_amount, status FROM orders ORDER BY id DESC LIMIT 10`,
          complete:(e2,_,orders)=>{
            conn.destroy();
            res.json({
              staff:{ username:stats[0].USERNAME },
              stats:{
                pending:stats[0].PENDING,
                total_sales:stats[0].TOTAL_SALES||0,
                completed_today:stats[0].COMPLETED_TODAY
              },
              orders:orders.map(o=>({
                id:o.ID,
                customer:o.CUSTOMER_NAME,
                total:o.TOTAL_AMOUNT,
                status:o.STATUS
              }))
            });
          }
        });
      }
    });
  });
}
