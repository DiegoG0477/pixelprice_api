import { Quotation } from "../../domain/entities/Quotation";
import { QuotationRepository } from "../../domain/QuotationRepository";

export class GetQuotationByProjectNameUseCase {
    constructor(readonly quotationRepository: QuotationRepository) {}

    async run(projectName: string): Promise<Quotation | null> {
        try {
            if (!projectName) {
                console.warn("GetQuotationsByprojectNameUseCase called without projectName");
                return null;
            }

            // Fetch quotations, repository handles empty list vs error (returning null)
            const quotation = await this.quotationRepository.getQuotationByProjectName(projectName);

            // Optionally filter/map results if needed (e.g., exclude quotationText for list view)
            // const summaryQuotations = quotations?.map(q => ({...q, quotationText: undefined }));
            // return summaryQuotations;

            return quotation; // Return full data for now

        } catch (error) {
            console.error(`Error in GetQuotationByProjectNameUseCase for project name ${projectName}:`, error);
            return null;
        }
    }
}