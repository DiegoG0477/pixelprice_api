// quotation/application/use-cases/GenerateQuotationDocxUseCase.ts
import { QuotationRepository } from "../../domain/QuotationRepository";
import { IDocxGeneratorService } from "../services/IDocxGeneratorService";

export class GenerateQuotationDocxUseCase {
    constructor(
        private quotationRepository: QuotationRepository,
        private docxService: IDocxGeneratorService
    ) {}

    async run(quotationId: string, requestingUserId: string): Promise<Buffer | null> {
        try {
            // 1. Fetch quotation data, ensuring the requesting user owns it
            const quotation = await this.quotationRepository.getQuotationById(quotationId);

            if (!quotation) {
                console.warn(`Quotation not found for ID: ${quotationId}`);
                return null; // Not found
            }

            // 2. Authorization check (optional but recommended)
            if (quotation.userId !== requestingUserId) {
                console.warn(`User ${requestingUserId} attempted to download quotation ${quotationId} owned by user ${quotation.userId}`);
                // Depending on policy, return null, throw error, or handle differently
                return null; // Forbidden (simplified handling)
            }

            // 3. Generate DOCX buffer using the service
            const docxBuffer = await this.docxService.generateQuotationDocx(quotation);
            console.log(`Generated DOCX buffer for quotation ID: ${quotationId}`);

            return docxBuffer;

        } catch (error) {
            console.error(`Error in GenerateQuotationDocxUseCase for ID ${quotationId}:`, error);
            return null; // Indicate failure
        }
    }
}