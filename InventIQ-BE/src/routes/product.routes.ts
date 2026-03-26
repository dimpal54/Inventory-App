import { Router } from 'express';
import {
    createProduct,
    deleteProduct,
    getProducts,
    getProductById,
    updateProduct,
    lowStockProduct
} from '../controllers/product.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';

const router = Router();

router.post('/', verifyToken, allowRoles('admin', 'manager'), createProduct);
router.get('/low-stock', verifyToken, allowRoles('admin', 'manager'), lowStockProduct);
router.get('/', verifyToken, getProducts);
router.get('/:id', verifyToken, getProductById);
router.put('/:id', verifyToken, allowRoles('admin', 'manager'), updateProduct);
router.delete('/:id', verifyToken, allowRoles('admin', 'manager'), deleteProduct);

export default router;
