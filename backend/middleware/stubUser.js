// ============================================================
//  STUB req.user helper
//  ============================================================
//  Use this middleware INSTEAD of verifyToken while real auth
//  is still being integrated. It injects a fake req.user so
//  that downstream controllers / routes that depend on
//  req.user.id, req.user.role, etc. will work without a real
//  JWT token.
//
//  Usage:
//    const stubUser = require('../middleware/stubUser');
//    router.get('/some-route', stubUser, someController);
//
//  Once real auth is ready, simply swap stubUser → verifyToken.
// ============================================================

const stubUser = (req, res, next) => {
  req.user = {
    id: '000000000000000000000000',        // fake ObjectId
    _id: '000000000000000000000000',
    email: 'stub@swishportal.dev',
    role: 'admin',                         // default to admin so all routes are accessible
    profile: {
      firstName: 'Stub',
      lastName: 'User',
      avatar: '',
      bio: 'This is a stub user for development',
      phone: '',
    },
  };
  next();
};

module.exports = stubUser;
