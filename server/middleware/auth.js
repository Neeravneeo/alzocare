/**
 * Authentication Middleware
 * 
 * Provides JWT authentication and role-based authorization for API routes.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authenticate JWT token middleware
 * Verifies the token and attaches the user to the request object
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    
    // Find user
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

/**
 * Authorize role middleware
 * Checks if the authenticated user has the required role
 * @param {string|string[]} roles - Required role(s)
 */
const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Convert single role to array
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. You do not have permission to access this resource.' 
      });
    }
    
    next();
  };
};

/**
 * Log API access middleware
 * Records all API access for audit purposes
 */
const logApiAccess = (req, res, next) => {
  const AccessLog = require('../models/AccessLog');
  
  // Only log access for authenticated users
  if (req.user) {
    const log = {
      userId: req.user.id,
      endpoint: req.originalUrl,
      method: req.method,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    };
    
    // Don't wait for log to be saved
    AccessLog.create(log).catch(err => {
      console.error('Error logging API access:', err);
    });
  }
  
  next();
};

module.exports = {
  authenticateToken,
  authorizeRole,
  logApiAccess
};