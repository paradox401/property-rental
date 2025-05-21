import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import connectDB from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';




dotenv.config();
connectDB();

const app = express();

app.use(cors({
    origin: '*', 
  }));
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);

app.get('/', (req, res) => {
  res.send('Property Rental API is running');
});


export default app;
