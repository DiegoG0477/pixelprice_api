// user/infrastructure/controllers/GetUserByIdController.ts
import { Request, Response } from 'express';
import { GetUserByIdUseCase } from '../../application/use-cases/GetUserByIdUseCase';

export class GetUserByIdController {
    constructor(readonly getUserByIdUseCase: GetUserByIdUseCase) {}

    async run(req: Request, res: Response): Promise<Response> {
        const requestedUserId = req.params.id;
        const requesterId = (req as any).userId; // ID of the user making the request (from auth middleware)

        if (!requesterId) {
            return res.status(401).send({ status: 'error', message: 'Authentication required.' });
        }

        if (!requestedUserId) {
            return res.status(400).send({ status: 'error', message: 'Missing user ID parameter.' });
        }

        // --- Authorization Check ---
        // Example: Allow users to only get their own profile, or allow admins (implement role check if needed)
        if (requesterId !== requestedUserId /* && !req.user.isAdmin */) {
            console.warn(`User ${requesterId} attempted to access profile of user ${requestedUserId}.`);
            return res.status(403).send({ status: 'error', message: 'Forbidden: You can only access your own profile.' });
        }
        // --- End Authorization Check ---

        try {
            const user = await this.getUserByIdUseCase.run(requestedUserId);

            if (user) {
                // User found, return 200 OK
                // Ensure password is not included (should be handled by repo/use case)
                return res.status(200).send({
                    status: 'success',
                    message: 'User retrieved successfully.',
                    data: {
                        user, // User object without password
                    },
                });
            } else {
                // Use case returned null
                // Could be not found, or an internal error occurred in use case/repo
                // Since we passed the auth check, assume not found
                return res.status(404).send({
                    status: 'error',
                    message: `User with ID ${requestedUserId} not found.`,
                });
            }
        } catch (error) {
            console.error(`Error in GetUserByIdController for ID ${requestedUserId}:`, error);
            return res.status(500).send({
                status: 'error',
                message: 'An unexpected error occurred while retrieving the user.',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}