import { Router } from 'express';
import { analyzeImageWithAI, chatWithAI, completeEntityFromAI, getAllData } from '../controllers/ai.controller';
import { upload } from '../middleware/upload.middleware';
import { verifyToken } from '../middleware/auth.middleware';
import { allowRoles } from '../middleware/role.middleware';

const router = Router();

router.use(verifyToken);

router.post('/chat', chatWithAI);
router.post('/analyze-image', allowRoles('admin', 'manager'), upload.single('image'), analyzeImageWithAI);
router.get('/data', getAllData);
router.post('/complete-entity', allowRoles('admin', 'manager'), completeEntityFromAI);

export default router;
