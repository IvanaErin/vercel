import { getPool } from '../lib/db';

export default async function handler(req, res) {
  try {
    const pool = getPool();
    const [rows] = await pool.execute("SELECT o.*, u.username FROM orders o LEFT JOIN users u ON u.id = o.user_id WHERE o.status = 'Completed' ORDER BY o.id DESC");
    return res.json({ orders: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
