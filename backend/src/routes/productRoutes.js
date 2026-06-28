const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const productController = require('../controllers/productController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');

// Configure Multer for temp file uploads
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed!'), false);
    }
  }
});

// Product Routing
router.get('/', authenticate, productController.getProducts);
router.get('/export', authenticate, productController.exportCSV);
router.get('/:id', authenticate, productController.getProductById);
router.get('/:id/stock-history', authenticate, productController.getStockHistory);

// Mutator operations
router.post('/', authenticate, authorize(['Owner', 'Manager']), productController.createProduct);
router.put('/:id', authenticate, authorize(['Owner', 'Manager']), productController.updateProduct);
router.delete('/:id', authenticate, authorize(['Owner']), productController.deleteProduct);

// Bulk upload route
router.post('/bulk-upload', authenticate, authorize(['Owner', 'Manager']), upload.single('file'), productController.bulkUploadCSV);

module.exports = router;
