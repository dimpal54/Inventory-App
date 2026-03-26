import { Router } from 'express';
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  updateCategory
} from '../controllers/category.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';

const router = Router();

router.post('/', verifyToken, allowRoles('admin', 'manager'), createCategory);
router.get('/', verifyToken, getCategories);
router.get('/:id', verifyToken, getCategoryById);
router.put('/:id', verifyToken, allowRoles('admin', 'manager'), updateCategory);
router.delete('/:id', verifyToken, allowRoles('admin', 'manager'), deleteCategory);

export default router;
