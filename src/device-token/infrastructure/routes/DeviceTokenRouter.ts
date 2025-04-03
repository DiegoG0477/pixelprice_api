import express from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware'; // Ajusta la ruta
import {
    registerDeviceTokenController,
    deleteDeviceTokenController
} from '../deviceToken.dependencies';

const deviceTokenRouter = express.Router();

// Apply auth middleware to all device token routes
// Registering/Deleting tokens MUST be tied to an authenticated user
deviceTokenRouter.use(authMiddleware);

// POST to register a new device token (associates with the logged-in user)
// Body: { "token": "fcm_token_here", "deviceType": "android" | "ios" | "web" }
deviceTokenRouter.post('/', (req, res) => registerDeviceTokenController.run(req, res));

// DELETE a specific device token (e.g., on logout or uninstall)
// The token to delete is passed as a URL parameter
deviceTokenRouter.delete('/:token', (req, res) => deleteDeviceTokenController.run(req, res));

export { deviceTokenRouter };