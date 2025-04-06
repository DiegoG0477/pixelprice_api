import { Request, Response } from 'express';
import { GetQuotationByProjectNameUseCase } from '../../application/use-cases/GetQuotationByProjectNameUseCase';

export class GetQuotationByProjectNameController {
    constructor(readonly getQuotationByProjectUseCase: GetQuotationByProjectNameUseCase) {}

    async run(req: Request, res: Response): Promise<Response> {
        const projectName = req.params.name;

        try {
            const quotation = await this.getQuotationByProjectUseCase.run(projectName);

            if (quotation === null) {
                 // Use case returning null suggests an internal error
                return res.status(500).send({
                    status: 'error',
                    message: `Failed to retrieve quotations for project name ${projectName}.`,
                });
            }

             // Success (including empty list)
            return res.status(200).send({
                status: 'success',
                message: 'Quotations retrieved successfully.',
                data: {
                    quotation, // Array, possibly empty
                },
            });

        } catch (error) {
            console.error(`Error in GetQuotationsByUserIdController for userId ${projectName}:`, error);
            return res.status(500).send({
                status: 'error',
                message: 'An unexpected error occurred while retrieving quotations.',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}