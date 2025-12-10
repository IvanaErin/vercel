import { getPool } from './db';

export async function sendNotification({ receiver_id, message, receiver_role='user', sender_role='staff', user_id=null }) {
  const pool = getPool();
  const sql = `INSERT INTO notifications (receiver_id, receiver_role, sender_role, message, user_id, is_read, created_at)
               VALUES (?, ?, ?, ?, ?, 0, NOW())`;
  await pool.execute(sql, [receiver_id, receiver_role, sender_role, message, user_id]);
}
