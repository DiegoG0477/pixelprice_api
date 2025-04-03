import { Quotation } from "../../domain/entities/Quotation";

export interface IDocxGeneratorService {
    /**
     * Generates a DOCX document buffer from quotation data.
     * @param quotation The quotation entity containing the text.
     * @returns A Promise resolving to a Buffer containing the DOCX file content.
     * @throws Error if DOCX generation fails.
     */
    generateQuotationDocx(quotation: Quotation): Promise<Buffer>;
}