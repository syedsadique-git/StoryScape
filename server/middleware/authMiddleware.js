import jwt from 'jsonwebtoken';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const jwtSecret = process.env.JWT_SECRET || 'storyscape_super_secret_jwt_key_12345';
    if (jwtSecret === 'storyscape_super_secret_jwt_key_12345' && process.env.NODE_ENV === 'production') {
      return res.status(500).json({ error: 'Server authentication is not configured' });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (error) {
      if (process.env.NODE_ENV === 'production') throw error;
      decoded = jwt.verify(token, 'storyscape_super_secret_jwt_key_12345');
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
