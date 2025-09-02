import jwt from 'jsonwebtoken';

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Auth header missing or malformed:', authHeader);
    return res.status(401).json({ error: 'Not authorized, token missing' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      console.log('Token decoded but missing id:', decoded);
      return res.status(401).json({ error: 'Not authorized, token invalid' });
    }

    req.user = {
      _id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (err) {
    console.log('JWT verification failed:', err.message);
    return res.status(401).json({ error: 'Not authorized, token invalid' });
  }
};

export default protect;
