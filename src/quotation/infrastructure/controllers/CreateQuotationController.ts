// quotation/infrastructure/controllers/CreateQuotationController.ts
import { Request, Response } from 'express';
import { CreateQuotationUseCase } from '../../application/use-cases/CreateQuotationUseCase';
import { Quotation } from '../../domain/entities/Quotation';

// Define interface for expected file properties from Multer
interface UploadedFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    buffer: Buffer; // Using buffer strategy with Multer
    size: number;
}

export class CreateQuotationController {
    constructor(readonly createQuotationUseCase: CreateQuotationUseCase) {}

    async run(req: Request, res: Response): Promise<Response> {
        // Assuming multer middleware has processed the 'mockupImage' field
        const file = (req as any).file as UploadedFile | undefined; // Type assertion for req.file
        const data = req.body;

        const userId = (req as any).userId;

        // Basic Validation
        const { name, description, capital, isSelfMade } = data;
        if (!userId || !name || !description || isSelfMade === undefined) {
             return res.status(400).send({
                status: 'error',
                message: 'Missing required fields: userId, name, description, isSelfMade',
            });
        }

        // Prepare image data if uploaded
        let imageInput: { mimeType: string; data: Buffer } | null = null;
        if (file) {
             if (!file.mimetype.startsWith('image/')) {
                return res.status(400).send({
                    status: 'error',
                    message: 'Uploaded file is not a valid image type.',
                });
            }
            imageInput = {
                mimeType: file.mimetype,
                data: file.buffer, // Use buffer directly
            };
            console.log(`Received image: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`);
        } else {
            console.log("No mockup image provided for quotation.");
        }

        // Parse boolean and numeric types
        const parsedIsSelfMade = String(isSelfMade).toLowerCase() === 'true';
        const parsedCapital = capital ? parseFloat(capital) : 0;
         if (capital && isNaN(parsedCapital)) {
             return res.status(400).send({ status: 'error', message: 'Invalid format for capital.' });
         }

        try {
             console.log("Handing off to CreateQuotationUseCase...");
            // Use case handles the heavy lifting (Gemini, DB, Notification)
            const quotation = await this.createQuotationUseCase.run(
                userId.toString(), // Ensure string
                name,
                description,
                parsedCapital,
                parsedIsSelfMade,
                imageInput
            );

            if (quotation) {
                // Return minimal confirmation - user waits for notification
                 const responseData: Partial<Quotation> = { // Exclude text for brevity
                     id: quotation.id,
                     userId: quotation.userId,
                     name: quotation.name,
                     createdAt: quotation.createdAt
                 };
                return res.status(202).send({ // 202 Accepted: Processing started
                    status: 'processing',
                    message: 'Quotation request accepted and is being processed. You will receive a notification when ready.',
                    data: {
                        quotationInfo: responseData,
                    },
                });
            } else {
                 // If null, it means an error occurred during processing (logged in use case)
                return res.status(500).send({
                    status: 'error',
                    message: 'Failed to initiate or complete quotation generation process.',
                });
            }
        } catch (error) {
            console.error("Error in CreateQuotationController:", error);
            return res.status(500).send({
                status: 'error',
                message: 'An unexpected error occurred while processing the quotation request.',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}