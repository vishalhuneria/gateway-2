import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { config } from '../config.js';
import { HttpError, asyncHandler } from '../utils/httpError.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw new HttpError(401, 'Authentication required. Please sign in.');
  let payload;
  try { payload = jwt.verify(token, config.jwtSecret); }
  catch { throw new HttpError(401, 'Session is invalid or expired. Please sign in again.'); }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new HttpError(401, 'This account is inactive or no longer exists.');
  req.user = user;
  next();
});

export const requireRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new HttpError(403, 'You do not have permission to perform this action.'));
  next();
};
