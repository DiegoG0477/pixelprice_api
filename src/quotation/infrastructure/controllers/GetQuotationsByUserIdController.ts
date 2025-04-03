// quotation/infrastructure/controllers/GetQuotationsByUserIdController.ts
import { Request, Response } from 'express';
import { GetQuotationsByUserIdUseCase } from '../../application/use-cases/GetQuotationsByUserIdUseCase';

export class GetQuotationsByUserIdController {
    constructor(readonly getQuotationsByUserIdUseCase: GetQuotationsByUserIdUseCase) {}

    async run(req: Request, res: Response): Promise<Response> {
        // Assume userId comes from auth middleware or URL param matching logged-in user
        const userIdFromAuth = (req as any).user?.id; // Adjust based on your auth middleware
        const userIdFromParam = req.params.userId;

        // Basic security: Ensure the request is for the logged-in user's data
        if (!userIdFromAuth || userIdFromAuth.toString() !== userIdFromParam) {
             console.warn(`Unauthorized attempt to access quotations for user ${userIdFromParam} by user ${userIdFromAuth}`);
            return res.status(403).send({
                status: 'error',
                message: 'Forbidden: You can only access your own quotations.',
            });
        }

        try {
            const quotations = await this.getQuotationsByUserIdUseCase.run(userIdFromParam);

            if (quotations === null) {
                 // Use case returning null suggests an internal error
                return res.status(500).send({
                    status: 'error',
                    message: `Failed to retrieve quotations for user ID ${userIdFromParam}.`,
                });
            }

             // Success (including empty list)
            return res.status(200).send({
                status: 'success',
                message: 'Quotations retrieved successfully.',
                data: {
                    quotations, // Array, possibly empty
                },
            });

        } catch (error) {
            console.error(`Error in GetQuotationsByUserIdController for userId ${userIdFromParam}:`, error);
            return res.status(500).send({
                status: 'error',
                message: 'An unexpected error occurred while retrieving quotations.',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}