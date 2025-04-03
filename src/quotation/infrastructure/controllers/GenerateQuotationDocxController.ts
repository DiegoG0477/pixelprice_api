// quotation/infrastructure/controllers/GenerateQuotationDocxController.ts
import { Request, Response } from 'express';
import { GenerateQuotationDocxUseCase } from '../../application/use-cases/GenerateQuotationDocxUseCase';

export class GenerateQuotationDocxController {
    constructor(
        readonly generateQuotationDocxUseCase: GenerateQuotationDocxUseCase
    ) {}

    async run(req: Request, res: Response): Promise<Response | void> { // Return void because we manually end the response
        const quotationId = req.params.id;
        // Assuming authMiddleware adds user info to req.user
        const userId = (req as any).user?.id; // Adjust based on your auth middleware structure

        if (!quotationId) {
            return res.status(400).send({ status: 'error', message: 'Missing quotation ID parameter.' });
        }
        if (!userId) {
             console.error("User ID not found in request after auth middleware.");
            return res.status(401).send({ status: 'error', message: 'Unauthorized: User ID missing.' });
        }

        try {
            const docxBuffer = await this.generateQuotationDocxUseCase.run(quotationId, userId.toString());

            if (docxBuffer) {
                // Set headers for file download
                res.setHeader('Content-Disposition', `attachment; filename="quotation_${quotationId}.docx"`);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                res.setHeader('Content-Length', docxBuffer.length.toString());

                // Send the buffer as the response body
                res.status(200).send(docxBuffer);
                // Explicitly return void after sending response
                return;

            } else {
                // Use case returned null (not found, forbidden, or generation error)
                // Logs within use case/repo should differentiate
                // Return 404 or 403 based on cause, simplify to 404 for now
                return res.status(404).send({
                    status: 'error',
                    message: `Could not generate DOCX for quotation ID ${quotationId}. It might not exist or you don't have permission.`,
                });
            }
        } catch (error) {
            console.error(`Error in GenerateQuotationDocxController for ID ${quotationId}:`, error);
            // Avoid sending headers if already sent or if error happens late
            if (!res.headersSent) {
                 return res.status(500).send({
                    status: 'error',
                    message: 'An unexpected error occurred while generating the DOCX file.',
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            } else {
                 console.error("Error occurred after headers were sent for DOCX download.");
                 // Cannot send another response, maybe just end the connection abruptly if needed
                 res.end();
                 return;
            }
        }
    }
}