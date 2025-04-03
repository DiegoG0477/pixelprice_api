export interface QuotationInputData {
    name: string;
    description: string;
    capital?: number; // Optional based on input type Double vs double
    isSelfMade: boolean;
    mockupImage?: { // Structure to hold image data
        mimeType: string; // e.g., 'image/png', 'image/jpeg'
        data: Buffer;    // Raw image data
    };
}

export interface IGeminiQuotationService {
    /**
     * Generates a software project quotation report using Gemini API.
     * @param inputData Data provided by the user including project details and optional mockup.
     * @returns A Promise resolving to the generated quotation text (string).
     * @throws Error if the API call fails or returns an error.
     */
    generateQuotationReport(inputData: QuotationInputData): Promise<string>;
}