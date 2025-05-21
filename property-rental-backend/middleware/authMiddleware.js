import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { _id: decoded.id, role: decoded.role }; // attach user info
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Not authorized, token invalid' });
  }
};
