import { getPool } from '../lib/db';

export default async function handler(req, res) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/(?:^|;)\s*user_id=(\d+)/);
  const user_id = match ? Number(match[1]) : null;
  if (!user_id) return res.json({ count: 0 });

  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT SUM(quantity) AS cnt FROM cart WHERE user_id = ?', [user_id]);
    const count = rows[0] ? (rows[0].cnt || 0) : 0;
    return res.json({ count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
