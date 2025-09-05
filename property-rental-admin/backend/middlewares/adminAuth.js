import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

export const adminAuthMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = await Admin.findById(decoded.id);
    if (!req.admin) throw new Error();
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
