// quotation/domain/QuotationRepository.ts
import { Quotation } from "./entities/Quotation";

export interface QuotationRepository {
    createQuotation(quotation: Quotation): Promise<Quotation | null>;
    getQuotationsByUserId(userId: string): Promise<Quotation[] | null>;
    getQuotationById(id: string): Promise<Quotation | null>;
    // Potentially add: deleteQuotation, updateQuotation, etc.
}