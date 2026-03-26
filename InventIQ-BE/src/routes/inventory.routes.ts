import { Router } from 'express';
import {
  adjustStock,
  getAllStockTransactions,
  getLowStockProducts,
  getOutOfStockProducts,
  getProductStockHistory,
  stockIn,
  stockOut
} from '../controllers/inventory.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';

const router = Router();

router.use(verifyToken);

router.post('/stock-in', allowRoles('admin', 'manager'), stockIn);
router.post('/stock-out', allowRoles('admin', 'manager'), stockOut);
router.post('/adjust', allowRoles('admin', 'manager'), adjustStock);

router.get('/transactions', getAllStockTransactions);
router.get('/history/:productId', getProductStockHistory);
router.get('/low-stock', getLowStockProducts);
router.get('/out-of-stock', getOutOfStockProducts);

export default router;