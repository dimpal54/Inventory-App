import { Router } from 'express';
import {
  createSupplier,
  deleteSupplier,
  getSupplierById,
  getSuppliers,
  updateSupplier
} from '../controllers/supplier.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';

const router = Router();

router.post('/', verifyToken, allowRoles('admin', 'manager'), createSupplier);
router.get('/', verifyToken, getSuppliers);
router.get('/:id', verifyToken, getSupplierById);
router.put('/:id', verifyToken, allowRoles('admin', 'manager'), updateSupplier);
router.delete('/:id', verifyToken, allowRoles('admin', 'manager'), deleteSupplier);

export default router;
