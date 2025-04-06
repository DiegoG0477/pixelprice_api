import { Request, Response } from 'express';
import { UpdateUserUseCase } from '../../application/use-cases/UpdateUserUseCase';

export class UpdateUserController {
    constructor(readonly updateUserUseCase: UpdateUserUseCase) {}

    async run(req: Request, res: Response): Promise<Response> {
        const userIdToUpdate = (req as any).userId;
        const updateData = req.body;

        if (!userIdToUpdate) {
            return res.status(400).send({ status: 'error', message: 'Missing user ID parameter.' });
        }

        // Basic validation of update data fields (optional, use case also checks)
        const allowedFields = ['name', 'last_name'];
        const providedFields = Object.keys(updateData);
        const invalidFields = providedFields.filter(field => !allowedFields.includes(field));

        if (invalidFields.length > 0) {
             return res.status(400).send({
                status: 'error',
                message: `Invalid fields provided for update: ${invalidFields.join(', ')}. Only 'name' and 'last_name' are allowed.`,
            });
        }
         if (providedFields.length === 0) {
             return res.status(400).send({ status: 'error', message: 'No update data provided.' });
         }


        try {
            const updatedUser = await this.updateUserUseCase.run(userIdToUpdate, {
                 name: updateData.name, // Pass values, use case handles undefined
                 last_name: updateData.last_name,
             });

            if (updatedUser) {
                // Update successful, return 200 OK with updated user data
                return res.status(200).send({
                    status: 'success',
                    message: 'User updated successfully.',
                    data: {
                        user: updatedUser, // Updated user object without password
                    },
                });
            } else {
                // Use case returned null. Reasons could be:
                // 1. User not found (handled by repo check -> return 404)
                // 2. No actual data to update (handled by use case -> return 400 or different logic)
                // 3. Database error during update (logged in repo/use case -> return 500)

                // Need to potentially check if the user exists *before* calling update
                // or rely on the repo/use case logic. Assuming null means not found or error.
                // Let's check if the user exists first for a clearer 404
                 const userExists = await this.updateUserUseCase.userRepository.getUserById(userIdToUpdate); // Temporarily access repo here for check
                 if (!userExists) {
                     return res.status(404).send({
                         status: 'error',
                         message: `User with ID ${userIdToUpdate} not found.`,
                     });
                 } else {
                    // User exists, so null return likely means DB error or no data sent (already checked)
                     return res.status(500).send({
                        status: 'error',
                        message: 'Failed to update user due to an internal error or no valid data provided.',
                     });
                 }
            }
        } catch (error) {
            console.error(`Error in UpdateUserController for ID ${userIdToUpdate}:`, error);
            return res.status(500).send({
                status: 'error',
                message: 'An unexpected error occurred while updating the user.',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}