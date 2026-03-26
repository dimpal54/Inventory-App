import { Router, Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import { allowRoles } from '../middleware/role.middleware.js';

const router = Router();

router.get('/protected', verifyToken, (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: 'Protected route working',
        user: req.user
    });
});

router.get(
    '/admin-only',
    verifyToken,
    allowRoles('admin'),
    (req: Request, res: Response) => {
        res.status(200).json({
            success: true,
            message: 'Admin route working',
            user: req.user
        });
    }
);

export default router;