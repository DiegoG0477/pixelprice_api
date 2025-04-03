import { Request, Response } from 'express';
import { RegisterDeviceTokenUseCase } from '../../application/use-cases/RegisterDeviceTokenUseCase';
import { DeviceType } from '../../domain/DeviceTokenRepository';



export class RegisterDeviceTokenController {
    constructor(readonly registerDeviceTokenUseCase: RegisterDeviceTokenUseCase) { }

    async run(req: Request, res: Response): Promise<Response> {
        // Correctly retrieve userId from the authenticated user object set by middleware
        const userId = (req as any).userId;
        const { token, deviceType } = req.body;

        if (!userId) {
            // This should ideally be caught by authMiddleware earlier, but double-check
            return res.status(401).send({ // 401 Unauthorized
                status: 'error',
                message: 'Authentication required: User ID not found in request.',
            });
        }

        if (!token) {
            return res.status(400).send({
                status: 'error',
                message: 'Missing required field: token',
            });
        }

        // Basic validation for deviceType if provided
        const validDeviceTypes: DeviceType[] = ['android', 'ios', 'web'];
        if (deviceType && !validDeviceTypes.includes(deviceType as DeviceType)) {
            return res.status(400).send({
                status: 'error',
                message: `Invalid deviceType. Must be one of: ${validDeviceTypes.join(', ')}`,
            });
        }

        try {
            const success = await this.registerDeviceTokenUseCase.run(
                userId, // Pass the userId directly (already a string)
                token,
                deviceType as DeviceType | undefined
            );

            if (success) {
                return res.status(201).send({ // 201 Created (or 200 OK if updating)
                    status: 'success',
                    message: 'Device token registered successfully.',
                });
            } else {
                // Use case returned false, likely due to internal error logged there
                return res.status(500).send({
                    status: 'error',
                    message: 'Failed to register device token due to an internal error.',
                });
            }
        } catch (error) {
            // Catch unexpected errors during controller execution
            console.error("Error in RegisterDeviceTokenController:", error);
            return res.status(500).send({
                status: 'error',
                message: 'An unexpected error occurred while registering the device token.',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}