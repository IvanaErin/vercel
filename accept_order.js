import { getPool } from '../lib/db';
import { sendNotification } from '../lib/notify';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Expect staff_id cookie for simple auth (replace with real auth)
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/(?:^|;)\s*staff_id=(\d+)/);
  const staff_id = match ? Number(match[1]) : null;
  if (!staff_id) return res.status(401).json({ error: 'Not authenticated' });

  const { order_id } = req.body;
  const orderId = Number(order_id || 0);
  if (!orderId) return res.status(400).json({ error: 'Invalid order id' });

  const pool = getPool();
  try {
    const [rows] = await pool.execute('SELECT user_id FROM orders WHERE id = ?', [orderId]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const user_id = rows[0].user_id;

    await pool.execute("UPDATE orders SET status = 'Preparing' WHERE id = ?", [orderId]);

    const message = `Your order #${orderId} has been accepted and is now being prepared.`;
    await sendNotification({ receiver_id: user_id, message, receiver_role: 'user', sender_role: 'staff', user_id });

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
