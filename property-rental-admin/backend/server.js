import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected to DB"))
    .catch(err => console.log(err));

app.use('/api/admin/auth', authRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => console.log(`Admin backend running on port ${PORT}`));
