import jwt from "jsonwebtoken";

export default function handler(req, res) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ success:false });

  try {
    const token = auth.split(" ")[1];
    const user = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ success:true, user });
  } catch {
    res.status(401).json({ success:false });
  }
}
