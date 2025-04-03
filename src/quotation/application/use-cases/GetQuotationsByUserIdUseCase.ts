// quotation/application/use-cases/GetQuotationsByUserIdUseCase.ts
import { Quotation } from "../../domain/entities/Quotation";
import { QuotationRepository } from "../../domain/QuotationRepository";

export class GetQuotationsByUserIdUseCase {
    constructor(readonly quotationRepository: QuotationRepository) {}

    async run(userId: string): Promise<Quotation[] | null> {
        try {
            if (!userId) {
                console.warn("GetQuotationsByUserIdUseCase called without userId");
                return null;
            }

            // Fetch quotations, repository handles empty list vs error (returning null)
            const quotations = await this.quotationRepository.getQuotationsByUserId(userId);

            // Optionally filter/map results if needed (e.g., exclude quotationText for list view)
            // const summaryQuotations = quotations?.map(q => ({...q, quotationText: undefined }));
            // return summaryQuotations;

            return quotations; // Return full data for now

        } catch (error) {
            console.error(`Error in GetQuotationsByUserIdUseCase for userId ${userId}:`, error);
            return null;
        }
    }
}