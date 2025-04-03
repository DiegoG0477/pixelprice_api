// quotation/infrastructure/routes/QuotationRouter.ts
import express from 'express';
import multer from 'multer'
import { authMiddleware } from '../../../middlewares/authMiddleware'; // Adjust path

// Import controllers
import {
    createQuotationController,
    getQuotationsByUserIdController,
    generateQuotationDocxController
} from '../quotation.dependencies';

const quotationRouter = express.Router();

// Configure Multer for image upload
// Store in memory as Buffer, adjust limits as needed
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Example: 10MB limit
    fileFilter: (req, file, cb) => { // Basic image type filter
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type: Only images are allowed.'));
        }
    }
});

// Apply auth middleware to all quotation routes
quotationRouter.use(authMiddleware);

// POST to create a new quotation (handles multipart/form-data for image)
// 'mockupImage' should match the field name sent from the Android app
quotationRouter.post(
    '/',
    upload.single('mockupImage'), // Use multer middleware for single file upload
    (req, res) => createQuotationController.run(req, res)
);

// GET quotations for a specific user (ensure user matches logged-in user)
// Parameter ':userId' should match the logged-in user's ID passed by authMiddleware
quotationRouter.get('/user/:userId', (req, res) => getQuotationsByUserIdController.run(req, res));

// GET to download the DOCX report for a specific quotation
// Parameter ':id' is the quotation ID
quotationRouter.get('/:id/download', (req, res) => generateQuotationDocxController.run(req, res));


export { quotationRouter };