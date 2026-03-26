import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/auth.routes';
import testRoutes from './routes/test.routes';
import categoryRoutes from './routes/category.routes';
import supplierRoutes from './routes/supplier.routes';
import productRoutes from './routes/product.routes';
import inventoryRoutes from './routes/inventory.routes';
import aiRoutes from './routes/ai.routes';
import userRoutes from './routes/user.routes';

dotenv.config();

const app = express();
const frontendDistPath = path.resolve(
    process.cwd(),
    '../InventIQ-FE/dist/InventIQ/browser'
);
const allowedOrigins = (process.env.CORS_ORIGIN || 'https://inventory-app-h3mi.onrender.com/' || 'http://localhost:4200')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(
    cors({
        origin: allowedOrigins.length > 0 ? allowedOrigins : true,
        credentials: true
    })
);
app.use(express.json());

app.get('/', (_req, res) => {
    if (process.env.NODE_ENV === 'production' && fs.existsSync(frontendDistPath)) {
        res.sendFile(path.join(frontendDistPath, 'index.html'));
        return;
    }

    res.send('Server is running successfully');
});
app.get('/api/health', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is healthy'
    });
});
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);

if (process.env.NODE_ENV === 'production' && fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));

    app.get(/^(?!\/api).*/, (_req, res) => {
        res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
}

export default app;
