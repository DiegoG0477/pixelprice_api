// quotation/infrastructure/adapters/MysqlQuotationRepository.ts
import { query } from "../../../shared/database/mysqlAdapter"; // Adjust path
import { Quotation } from "../../domain/entities/Quotation";
import { QuotationRepository } from "../../domain/QuotationRepository";

export class MysqlQuotationRepository implements QuotationRepository {

    async createQuotation(quotation: Quotation): Promise<Quotation | null> {
        // Assuming table 'quotations' with columns: id, user_id, name, quotation_text, created_at
        // Removed docx_path as we generate on download
        const sql = "INSERT INTO quotations(user_id, name, quotation_text) VALUES(?, ?, ?)";
        // Ensure userId is converted to number if the DB column expects INT
        const params: any[] = [parseInt(quotation.userId, 10), quotation.name, quotation.quotationText];
        try {
            const [result]: any = await query(sql, params);

            if (result.insertId) {
                // Return a new Quotation object with the generated ID
                return new Quotation(
                    result.insertId.toString(),
                    quotation.userId,
                    quotation.name,
                    quotation.quotationText
                    // createdAt is set by DB default
                );
            }
            return null; // Insert failed
        } catch (error: any) {
            console.error("Error in createQuotation:", error);
            // Could check for foreign key constraint errors (e.g., invalid user_id)
            return null;
        }
    }

    async getQuotationsByUserId(userId: string): Promise<Quotation[] | null> {
        const sql = "SELECT id, user_id, name, created_at FROM quotations WHERE user_id = ? ORDER BY created_at DESC";
        // Note: Selectively excluding quotation_text for list view efficiency
        const params: any[] = [parseInt(userId, 10)];
        try {
            const [rows]: any = await query(sql, params);
            if (!rows) {
                return []; // Return empty array if none found
            }
            // Map database rows to Quotation domain objects (without text)
            const quotations: Quotation[] = rows.map((row: any) => new Quotation(
                row.id.toString(),
                row.user_id.toString(), // Ensure userId is string
                row.name,
                '', // Placeholder for text, not fetched here
                null, // docxPath not stored
                row.created_at
            ));
            return quotations;
        } catch (error) {
            console.error("Error in getQuotationsByUserId:", error);
            return null;
        }
    }

    async getQuotationById(id: string): Promise<Quotation | null> {
        // Fetching the full text here as it's needed for download/details
        const sql = "SELECT id, user_id, name, quotation_text, created_at FROM quotations WHERE id = ?";
        const params: any[] = [parseInt(id, 10)];
        try {
            const [rows]: any = await query(sql, params);

            if (rows && rows.length > 0) {
                const row = rows[0];
                return new Quotation(
                    row.id.toString(),
                    row.user_id.toString(),
                    row.name,
                    row.quotation_text, // Include the full text
                    null, // docxPath not stored
                    row.created_at
                );
            }
            return null; // Not found
        } catch (error) {
            console.error(`Error in getQuotationById for ID ${id}:`, error);
            return null;
        }
    }
}