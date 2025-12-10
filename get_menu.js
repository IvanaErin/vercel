import { getPool } from '../lib/db';

export default async function handler(req, res) {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT id, name, price, image FROM menu ORDER BY id DESC');
    return res.json({ menu: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
