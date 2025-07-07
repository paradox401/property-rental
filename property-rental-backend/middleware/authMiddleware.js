import jwt from 'jsonwebtoken';

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authorized, token missing' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fix: set _id to match controller expectations
    req.user = {
      _id: decoded.id, // 👈 this is the key fix
      role: decoded.role
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Not authorized, token invalid' });
  }
};

export default protect;
