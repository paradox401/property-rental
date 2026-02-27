import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import connectDB from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import userRoutes from './routes/userRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import complaintRoutes from "./routes/complaintRoutes.js";
import paymentRoutes from './routes/paymentRoutes.js';
import ratingRoutes from './routes/ratingRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js';
import agreementRoutes from './routes/agreementRoutes.js';

dotenv.config();
connectDB();

const app = express();
const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:5173';
const configuredOrigins = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '';
const allowedOrigins = (configuredOrigins || DEFAULT_FRONTEND_ORIGIN)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => origin.replace(/\/+$/, ''));
const allowAllOrigins = !configuredOrigins || allowedOrigins.includes('*');

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowAllOrigins) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    // Deny without throwing noisy stack traces.
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/chat', chatRoutes); 
app.use("/api/complaints", complaintRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/properties', ratingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/agreements', agreementRoutes);

app.get('/', (req, res) => {
  res.send('Property Rental API is running');
});

export default app;
