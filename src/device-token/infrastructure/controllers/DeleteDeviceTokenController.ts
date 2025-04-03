import { Request, Response } from 'express';
import { DeleteDeviceTokenUseCase } from '../../application/use-cases/DeleteDeviceTokenUseCase';

export class DeleteDeviceTokenController {
    constructor(readonly deleteDeviceTokenUseCase: DeleteDeviceTokenUseCase) {}

    async run(req: Request, res: Response): Promise<Response> {
        const { token } = req.params; // Get token from URL parameter

        if (!token) {
            return res.status(400).send({
                status: 'error',
                message: 'Missing token parameter in URL',
            });
        }

        // Optional Security Check: Could verify that the token being deleted
        // belongs to the authenticated user (req.user.id), but deleting solely
        // by the unique token is common on logout/uninstall scenarios.

        try {
            const success = await this.deleteDeviceTokenUseCase.run(token);

            if (success) {
                // 204 No Content is standard for successful DELETE
                return res.status(204).send();
            } else {
                 // Use case returned false, potentially token not found or internal error
                 // Distinguishing might require changes in repo/use case return values
                 // Returning 404 if token not found is also an option.
                 // Simplifying to 500 for now if deletion fails for any reason other than success.
                return res.status(500).send({
                    status: 'error',
                    message: 'Failed to delete device token (may not exist or internal error).',
                });
            }
        } catch (error) {
            console.error("Error in DeleteDeviceTokenController:", error);
            return res.status(500).send({
                status: 'error',
                message: 'An unexpected error occurred while deleting the device token.',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}