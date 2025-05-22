import express from 'express';
import {
  addProperty,
  getMyProperties,
  deleteProperty,
  updateProperty,
  getProperty,
} from '../controllers/propertyController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, addProperty);
router.get('/my', protect, getMyProperties); 
router.put('/:id', protect, updateProperty);
router.delete('/:id', protect, deleteProperty);
router.get('/', getProperty); 

export default router;
