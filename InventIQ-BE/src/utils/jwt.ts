import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import type { IUser } from '../models/user.model.js';

export const generateToken = (user: IUser): string => {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role
  };

  const secret: Secret = process.env.JWT_SECRET as string;
  const expiresIn: StringValue = (process.env.JWT_EXPIRES_IN || '1d') as StringValue;

  const options: SignOptions = {
    expiresIn
  };

  return jwt.sign(payload, secret, options);
};