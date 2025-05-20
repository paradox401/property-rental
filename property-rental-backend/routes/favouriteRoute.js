import express from 'express';
const router = express.Router();

// example route
router.get('/', (req, res) => {
  res.send('Favourite routes works');
});

export default router;
