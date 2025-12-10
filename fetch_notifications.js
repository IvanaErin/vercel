import { getPool } from '../lib/db';

export default async function handler(req, res) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/(?:^|;)\s*(user_id|staff_id)=(\d+)/);
  const user_id = match ? Number(match[2]) : null;
  if (!user_id) return res.json({ notifications: [] });

  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM notifications WHERE receiver_id = ? ORDER BY id DESC LIMIT 50', [user_id]);
    return res.json({ notifications: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
