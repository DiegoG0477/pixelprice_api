export class Quotation {
    constructor(
        readonly id: string,          // Keep ID as string
        readonly userId: string,        // Corresponds to user_id (string for consistency)
        readonly name: string,          // Project name
        readonly quotationText: string, // Full text content from Gemini
        readonly docxPath?: string | null, // Optional: path if stored server-side
        readonly createdAt?: Date      // Optional, based on schema default
    ) {}
}