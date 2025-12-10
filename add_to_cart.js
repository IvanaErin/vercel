import { getPool } from '../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const cookie = req.headers.cookie || '';
  const match = cookie.match(/(?:^|;)\s*user_id=(\d+)/);
  const user_id = match ? Number(match[1]) : null;
  if (!user_id) return res.status(401).json({ error: 'Not authenticated' });

  const { menu_id, quantity } = req.body;
  const menuId = Number(menu_id);
  const qty = Number(quantity) || 1;
  if (!menuId) return res.status(400).json({ error: 'Invalid menu id' });

  const pool = getPool();
  try {
    await pool.execute(
      `INSERT INTO cart (user_id, menu_id, quantity, created_at) VALUES (?, ?, ?, NOW())`,
      [user_id, menuId, qty]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
