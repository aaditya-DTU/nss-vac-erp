function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This action requires one of these roles: ${allowedRoles.join(', ')}.`,
      });
    }
    next();
  };
}

function ownerOrAdmin(getOwnerId) {
  return (req, res, next) => {
    const ownerId = getOwnerId(req);
    if (req.user.role === 'admin' || String(ownerId) === String(req.user._id)) {
      return next();
    }
    return res.status(403).json({ success: false, message: 'You can only access your own data.' });
  };
}

module.exports = { authorize, ownerOrAdmin };
