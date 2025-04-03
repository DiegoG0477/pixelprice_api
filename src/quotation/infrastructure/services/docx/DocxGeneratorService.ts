// quotation/infrastructure/services/docx/DocxGeneratorService.ts
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { IDocxGeneratorService } from "../../../application/services/IDocxGeneratorService";
import { Quotation } from "../../../domain/entities/Quotation";

export class DocxGeneratorService implements IDocxGeneratorService {

    async generateQuotationDocx(quotation: Quotation): Promise<Buffer> {
        try {
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({
                            text: `Software Project Quotation: ${quotation.name}`,
                            heading: HeadingLevel.TITLE,
                            alignment: 'center',
                        }),
                        new Paragraph({ text: "" }), // Spacer
                        new Paragraph({
                            text: `Generated on: ${new Date().toLocaleDateString()}`,
                            style: "Emphasis", // Example style
                        }),
                         new Paragraph({ text: "" }), // Spacer

                        // Add more structure based on how Gemini formats the text
                        // This basic example just dumps the text.
                        // You might need to parse quotation.quotationText if it has markdown or sections.
                         new Paragraph({
                            children: [
                                new TextRun({
                                    text: "Quotation Details:",
                                    bold: true,
                                    size: 28 // Example: 14pt font size
                                })
                            ],
                            spacing: { before: 200, after: 100 } // Spacing in twentieths of a point
                        }),
                        // Simple split by newline for basic formatting
                        ...quotation.quotationText.split('\n').map(line =>
                            new Paragraph({ text: line })
                        ),

                         new Paragraph({ text: "" }), // Spacer
                         new Paragraph({ text: "--- End of Report ---", alignment: 'center', style: "Caption" })
                    ],
                }],
                 styles: { // Define custom styles if needed
                     paragraphStyles: [
                         {
                             id: "Caption",
                             name: "Caption Style",
                             basedOn: "Normal",
                             next: "Normal",
                             run: {
                                 italics: true,
                                 color: "999999",
                                 size: 20, // 10pt
                             },
                             paragraph: {
                                 spacing: { after: 120 },
                             },
                         },
                     ]
                 }
            });

            // Use Packer to generate the buffer
            const buffer = await Packer.toBuffer(doc);
            console.log(`DOCX buffer created for quotation: ${quotation.name}`);
            return buffer;

        } catch (error) {
            console.error(`Failed to generate DOCX for quotation ID ${quotation.id}:`, error);
            throw new Error(`DOCX generation failed: ${error instanceof Error ? error.message : error}`);
        }
    }
}