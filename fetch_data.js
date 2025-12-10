import { getPool } from '../lib/db';

export default async function handler(req, res) {
  const q = req.query.q || '';
  const pool = getPool();

  try {
    if (q === 'menu') {
      const [rows] = await pool.execute('SELECT id, name, price, image FROM menu ORDER BY id DESC');
      return res.json({ menu: rows });
    }
    if (q === 'order' && req.query.id) {
      const id = Number(req.query.id);
      const [rows] = await pool.execute('SELECT * FROM orders WHERE id = ?', [id]);
      return res.json({ order: rows[0] || null });
    }
    const [menuCount] = await pool.execute('SELECT COUNT(*) as c FROM menu');
    return res.json({ counts: menuCount[0].c });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
