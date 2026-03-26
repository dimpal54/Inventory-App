import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/user.model';
import { normalizeRole } from '../middleware/role.middleware';

const sanitizeUser = (user: any) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: normalizeRole(user.role),
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: users.map(sanitizeUser)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to load users'
    });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, isActive } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: 'name, email, and password are required'
      });
      return;
    }

    const existingUser = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      password: hashedPassword,
      role: normalizeRole(role || 'user'),
      isActive: typeof isActive === 'boolean' ? isActive : true
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: sanitizeUser(user)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create user'
    });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { name, email, password, role, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    if (email && String(email).toLowerCase().trim() !== user.email) {
      const existingEmail = await User.findOne({
        email: String(email).toLowerCase().trim(),
        _id: { $ne: new mongoose.Types.ObjectId(id) }
      });

      if (existingEmail) {
        res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
        return;
      }
    }

    if (name !== undefined) {
      user.name = String(name).trim();
    }

    if (email !== undefined) {
      user.email = String(email).toLowerCase().trim();
    }

    if (role !== undefined) {
      user.role = normalizeRole(role || 'user') as any;
    }

    if (typeof isActive === 'boolean') {
      user.isActive = isActive;
    }

    if (password) {
      user.password = await bcrypt.hash(String(password), 10);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: sanitizeUser(user)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update user'
    });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);

    if (String(req.user?._id) === id) {
      res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
      return;
    }

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete user'
    });
  }
};
