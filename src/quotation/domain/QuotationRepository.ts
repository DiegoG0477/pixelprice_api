// quotation/domain/QuotationRepository.ts
import { Quotation } from "./entities/Quotation";

export interface QuotationRepository {
    createQuotation(quotation: Quotation): Promise<Quotation | null>;
    getQuotationsByUserId(userId: string): Promise<Quotation[] | null>;
    getQuotationByName(projectName: string): Promise<Quotation | null>;
    getQuotationByProjectName(projectName: string): Promise<Quotation | null>;
}