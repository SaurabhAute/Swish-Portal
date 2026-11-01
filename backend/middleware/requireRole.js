// Role-based access control middleware
// Usage: requireRole('admin') or requireRole('admin', 'moderator')
const requireRole = (...roles) => {
  return (req, res, next) => {
    // verifyToken must run before this middleware (so req.user exists)
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, please login first' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`,
      });
    }

    next();
  };
};

module.exports = requireRole;
