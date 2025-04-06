import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
    IStylesOptions,
    //IParagraphOptions,
    LevelFormat,
    TableLayoutType,
} from "docx";
import { marked } from "marked";
import { IDocxGeneratorService } from "../../../application/services/IDocxGeneratorService";
import { Quotation } from "../../../domain/entities/Quotation";

const HEADING_1_STYLE_ID = "MyHeading1";
const HEADING_2_STYLE_ID = "MyHeading2";
const HEADING_3_STYLE_ID = "MyHeading3";
const CODE_STYLE_ID = "CodeStyle";
const DEFAULT_FONT = "Calibri";
// In this solution we don't use an alternate font on the run styles since docx v9.3.0 doesn't support it directly in style definitions.

export class DocxGeneratorService implements IDocxGeneratorService {
    // According to how the repository "remark-docx" structures the styles,
    // the default styles are defined under the property 'default.paragraph'
    // instead of specifying a direct "run".
    private documentStyles: IStylesOptions = {
        default: {
            document: {
                run: {
                    font: "Calibri",
                    size: 22
                },
                paragraph: {
                    // Propiedades de párrafo por defecto si las necesitas
                }
            }
        },
        paragraphStyles: [
            {
                id: HEADING_1_STYLE_ID,
                name: "Heading 1 Custom",
                basedOn: "Normal",
                next: "Normal",
                quickFormat: true,
                run: { font: DEFAULT_FONT, size: 32, bold: true },
            },
            {
                id: HEADING_2_STYLE_ID,
                name: "Heading 2 Custom",
                basedOn: "Normal",
                next: "Normal",
                quickFormat: true,
                run: { font: DEFAULT_FONT, size: 26, bold: true },
            },
            {
                id: HEADING_3_STYLE_ID,
                name: "Heading 3 Custom",
                basedOn: "Normal",
                next: "Normal",
                quickFormat: true,
                run: { font: DEFAULT_FONT, size: 24, bold: true },
            },
            {
                id: CODE_STYLE_ID,
                name: "Code Style",
                basedOn: "Normal",
                next: "Normal",
                run: { font: "Courier New", size: 20 },
            },
            {
                id: "Caption",
                name: "Caption Style",
                basedOn: "Normal",
                next: "Normal",
                run: { italics: true, color: "999999", size: 20 },
            },
        ],
    };

    private numberingConfig = {
        config: [
            {
                reference: "markdown-bullet-list",
                levels: [
                    {
                        level: 0,
                        format: LevelFormat.BULLET,
                        text: "\u2022",
                        alignment: AlignmentType.LEFT,
                        style: {
                            paragraph: { indent: { left: 720, hanging: 360 } },
                            run: { font: DEFAULT_FONT, size: 22 },
                        },
                    },
                ],
            },
        ],
    };

    async generateQuotationDocx(quotation: Quotation): Promise<Buffer> {
        try {
            const markdownText = quotation.quotationText;
            if (!markdownText) {
                console.warn(
                    `Quotation text for ${quotation.name} is empty. Generating basic DOCX.`
                );
                const emptyDoc = new Document({
                    styles: this.documentStyles,
                    sections: [
                        {
                            children: [
                                new Paragraph({
                                    text: "Error: No quotation text provided.",
                                }),
                            ],
                        },
                    ],
                });
                return await Packer.toBuffer(emptyDoc);
            }

            // Parse Markdown to tokens using marked.
            const tokens = marked.lexer(markdownText);
            const docChildren: (Paragraph | Table)[] = [];

            // Title and metadata paragraphs.
            docChildren.push(
                new Paragraph({
                    text: `Cotización de Proyecto de Software: ${quotation.name}`,
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    text: `Descargado el: ${new Date().toLocaleDateString()}`,
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({ text: "" })
            );

            // Process each Markdown token.
            for (const token of tokens) {
                switch (token.type) {
                    case "heading":
                        docChildren.push(
                            new Paragraph({
                                style: this.mapMarkdownHeadingStyle(token.depth),
                                spacing: { after: 100 },
                                children: this.createTextRunsFromMarkdownTokens(
                                    token.tokens || [{
                                        type: "text",
                                        raw: token.text,
                                        text: token.text,
                                    }]
                                ),
                            })
                        );
                        break;
                    case "paragraph":
                        docChildren.push(
                            new Paragraph({
                                spacing: { after: 100 },
                                children: this.createTextRunsFromMarkdownTokens(token.tokens),
                            })
                        );
                        break;
                    case "list":
                        for (const item of token.items) {
                            docChildren.push(
                                new Paragraph({
                                    numbering: {
                                        reference: "markdown-bullet-list",
                                        level: 0,
                                    },
                                    spacing: { after: 50 },
                                    children: this.createTextRunsFromMarkdownTokens(item.tokens),
                                })
                            );
                        }
                        // Extra space after list.
                        docChildren.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
                        break;
                    case "table":
                        if (token.header && token.rows) {
                            docChildren.push(
                                this.createTableFromMarkdownTokens(token.header, token.rows)
                            );
                            docChildren.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
                        }
                        break;
                    case "space":
                        docChildren.push(new Paragraph({ children: [] }));
                        break;
                    case "hr":
                        docChildren.push(
                            new Paragraph({
                                spacing: { before: 100, after: 100 },
                                border: {
                                    bottom: {
                                        color: "auto",
                                        space: 1,
                                        style: "single",
                                        size: 6,
                                    },
                                },
                                children: [],
                            })
                        );
                        break;
                    case "code":
                        docChildren.push(
                            new Paragraph({
                                style: CODE_STYLE_ID,
                                children: [new TextRun({ text: token.text })],
                            })
                        );
                        break;
                    case "blockquote":
                        docChildren.push(
                            new Paragraph({
                                indent: { left: 720 },
                                children: this.createTextRunsFromMarkdownTokens(token.tokens),
                            })
                        );
                        break;
                    default:
                        if ("text" in token && token.text && token.text.trim()) {
                            console.warn(`Unhandled token type: ${token.type}. Treating as plain text.`);
                            docChildren.push(
                                new Paragraph({
                                    children: [new TextRun({ text: token.raw })],
                                })
                            );
                        } else if (token.raw && token.raw.trim()) {
                            console.warn(`Unhandled token type: ${token.type}. Using raw content.`);
                            docChildren.push(
                                new Paragraph({
                                    children: [new TextRun({ text: token.raw })],
                                })
                            );
                        }
                }
            }

            // Footer paragraph.
            docChildren.push(new Paragraph({ children: [] }));
            docChildren.push(
                new Paragraph({
                    text: "--- Fin del Reporte ---",
                    style: "Caption",
                })
            );

            const doc = new Document({
                styles: this.documentStyles,
                numbering: this.numberingConfig,
                sections: [
                    {
                        properties: {},
                        children: docChildren,
                    },
                ],
            });

            const buffer = await Packer.toBuffer(doc);
            console.log(`DOCX buffer created successfully from Markdown for quotation: ${quotation.name}`);
            return buffer;
        } catch (error) {
            console.error(`Failed to generate DOCX for quotation ID ${quotation.id}:`, error);
            throw new Error(`DOCX generation failed: ${error instanceof Error ? error.message : error}`);
        }
    }

    // Map Markdown heading depth to our defined style IDs.
    private mapMarkdownHeadingStyle(depth: number): string {
        if (depth <= 1) return HEADING_1_STYLE_ID;
        if (depth === 2) return HEADING_2_STYLE_ID;
        if (depth === 3) return HEADING_3_STYLE_ID;
        return "Normal";
    }

    private createTextRunsFromMarkdownTokens(
        tokens: any[] | undefined,
        currentFormat: { bold?: boolean; italics?: boolean; code?: boolean; strike?: boolean } = {}
    ): TextRun[] {
        const runs: TextRun[] = [];
        if (!tokens) return runs;
        for (const token of tokens) {
            switch (token.type) {
                case "text":
                    runs.push(
                        new TextRun({
                            text: token.text,
                            bold: currentFormat.bold,
                            italics: currentFormat.italics,
                            strike: currentFormat.strike,
                            font: currentFormat.code ? "Courier New" : DEFAULT_FONT,
                        })
                    );
                    break;
                case "strong":
                    runs.push(...this.createTextRunsFromMarkdownTokens(token.tokens, { ...currentFormat, bold: true }));
                    break;
                case "em":
                    runs.push(...this.createTextRunsFromMarkdownTokens(token.tokens, { ...currentFormat, italics: true }));
                    break;
                case "codespan":
                    runs.push(new TextRun({ text: token.text, style: CODE_STYLE_ID }));
                    break;
                case "link":
                    runs.push(...this.createTextRunsFromMarkdownTokens(token.tokens, currentFormat));
                    runs.push(new TextRun({ text: ` (${token.href})`, italics: true }));
                    break;
                case "del":
                    runs.push(...this.createTextRunsFromMarkdownTokens(token.tokens, { ...currentFormat, strike: true }));
                    break;
                case "br":
                    runs.push(new TextRun({ break: 1 }));
                    break;
                default:
                    if ("tokens" in token && token.tokens) {
                        runs.push(...this.createTextRunsFromMarkdownTokens(token.tokens, currentFormat));
                    } else if ("text" in token && token.text) {
                        runs.push(new TextRun({
                            text: token.text,
                            bold: currentFormat.bold,
                            italics: currentFormat.italics,
                            strike: currentFormat.strike,
                            font: currentFormat.code ? "Courier New" : DEFAULT_FONT,
                        }));
                    }
            }
        }
        return runs;
    }

    private createTableFromMarkdownTokens(headerTokens: any[], rowsTokens: any[][]): Table {
        // Calcular el ancho mínimo para cada columna basado en el contenido
        const columnWidths = headerTokens.map((_, index) => {
            const columnContent = [
                headerTokens[index],
                ...rowsTokens.map(row => row[index])
            ];
            // Usar un mínimo de 2000 twips (aproximadamente 1.5 pulgadas) o más según el contenido
            //return Math.max(2000, Math.min(5000, columnContent.length * 1000));
            return Math.max(1500, Math.min(3000, columnContent.length * 800));
        });
    
        const createTableCell = (cellTokens: any[] | undefined, isHeader: boolean = false, columnIndex: number): TableCell => {
            const runs = this.createTextRunsFromMarkdownTokens(cellTokens, isHeader ? { bold: true } : {});
            return new TableCell({
                children: [
                    new Paragraph({
                        children: runs,
                        alignment: AlignmentType.LEFT, // Cambiado a LEFT para mejor legibilidad
                        spacing: { before: 100, after: 100 }
                    })
                ],
                margins: {
                    top: 100,
                    bottom: 100,
                    left: 200,  // Aumentado el margen izquierdo
                    right: 200, // Aumentado el margen derecho
                },
                verticalAlign: "center",
                width: {
                    size: columnWidths[columnIndex],
                    type: WidthType.DXA, // Usar DXA (twips) para mejor control
                },
                shading: isHeader ? { fill: "DDDDDD" } : undefined,
            });
        };
    
        const headerRow = new TableRow({
            children: headerTokens.map((cell: any, index) => 
                createTableCell(cell.tokens, true, index)
            ),
            tableHeader: true,
            height: {
                value: 500,
                rule: "atLeast",
            },
        });
    
        const dataRows = rowsTokens.map(
            (row: any[]) => new TableRow({
                children: row.map((cell, index) => 
                    createTableCell(cell.tokens, false, index)
                ),
                height: {
                    value: 400,
                    rule: "atLeast",
                },
            })
        );
    
        return new Table({
            width: {
                size: 9000, // Ancho fijo para la tabla (aproximadamente 6 pulgadas)
                type: WidthType.DXA,
            },
            borders: {
                top: {
                    style: "single",
                    size: 1,
                    color: "999999",
                },
                bottom: {
                    style: "single",
                    size: 1,
                    color: "999999",
                },
                left: {
                    style: "single",
                    size: 1,
                    color: "999999",
                },
                right: {
                    style: "single",
                    size: 1,
                    color: "999999",
                },
                insideHorizontal: {
                    style: "single",
                    size: 1,
                    color: "999999",
                },
                insideVertical: {
                    style: "single",
                    size: 1,
                    color: "999999",
                },
            },
            rows: [headerRow, ...dataRows],
            alignment: AlignmentType.CENTER,
            layout: TableLayoutType.FIXED,
            columnWidths: columnWidths, // Especificar anchos de columna explícitamente
            margins: {
                top: 100,
                bottom: 100,
                right: 100,
                left: 100,
            },
        });
    }
}