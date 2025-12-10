import { getPool } from '../lib/db';

export default async function handler(req, res) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/(?:^|;)\s*user_id=(\d+)/);
  const user_id = match ? Number(match[1]) : null;
  if (!user_id) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT c.id, c.quantity, m.id as menu_id, m.name, m.price, m.image
       FROM cart c
       JOIN menu m ON m.id = c.menu_id
       WHERE c.user_id = ?`, [user_id]
    );
    return res.json({ items: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
