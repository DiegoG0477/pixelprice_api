import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
    GenerationConfig,
    //Content, // Keep Content if used elsewhere, otherwise optional
    Part // <--- Import the Part type
} from "@google/generative-ai";
import { IGeminiQuotationService, QuotationInputData } from "../../../application/services/IGeminiQuotationService";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error("FATAL ERROR: GEMINI_API_KEY environment variable is not set.");
}

// Use stable model names from the 1.5 series
const TEXT_MODEL_NAME = "gemini-1.5-flash-latest";
const VISION_MODEL_NAME = "gemini-1.5-flash-latest";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "YOUR_API_KEY_FALLBACK"); // Fallback only for type safety if check above is removed

export class GeminiQuotationService implements IGeminiQuotationService {

    // Configuration for the generation request
    private generationConfig: GenerationConfig = {
        temperature: 1, // Controls randomness (0=deterministic, 1=max creative)
        topK: 1,
        topP: 1,
        maxOutputTokens: 8192, // Adjust based on expected report length and model limits
    };

    private safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    async generateQuotationReport(inputData: QuotationInputData): Promise<string> {
        if (!GEMINI_API_KEY) {
             throw new Error("Gemini API Key is not configured. Cannot generate report.");
        }

        const modelName = inputData.mockupImage ? VISION_MODEL_NAME : TEXT_MODEL_NAME;
        const model = genAI.getGenerativeModel({ model: modelName });

        console.log(`Using Gemini model: ${modelName}`);

        // --- Correction Starts Here ---
        // Change the type to Part[] and wrap strings in { text: ... }
        const promptParts: Part[] = [
             { text: this.constructPrompt(inputData) } // Wrap initial prompt string
        ];

        // Add image data if provided (only for vision model)
        if (inputData.mockupImage && modelName === VISION_MODEL_NAME) {
            console.log("Adding mockup image to Gemini prompt...");
             promptParts.push({ // Image part is already a valid Part object
                inlineData: {
                    mimeType: inputData.mockupImage.mimeType,
                    data: inputData.mockupImage.data.toString("base64"),
                },
            });
            // Wrap the follow-up text instruction
            promptParts.push({ text: "\nBased on the details above and the provided mockup image, generate the quotation report." });
        } else if (inputData.mockupImage) {
             console.warn(`Image provided but using text model (${modelName}). Image will be ignored.`);
        }
        // --- Correction Ends Here ---

        try {
            console.log(`Sending request to Gemini API for project: ${inputData.name}...`);

            // The structure passed to generateContent is now correct
            const result = await model.generateContent({
                 contents: [{ role: "user", parts: promptParts }], // promptParts is now correctly typed as Part[]
                 generationConfig: this.generationConfig,
                 safetySettings: this.safetySettings,
             });

            console.log(`Received response from Gemini API.`);

             // --- Refined Response Handling ---
             const response = result.response; // Get the response object

             // Check for prompt feedback first (e.g., safety blocks)
             if (response.promptFeedback?.blockReason) {
                 const blockReason = response.promptFeedback.blockReason;
                 console.error(`Gemini request was blocked. Reason: ${blockReason}`);
                 throw new Error(`Gemini generation failed. Request blocked: ${blockReason}`);
             }

             // Check if candidates exist and have content
             if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content) {
                 console.error("Gemini response is missing candidates or content.");
                 // Check finish reason on the candidate if it exists
                 const finishReason = response.candidates?.[0]?.finishReason;
                 throw new Error(`Gemini generation failed: No valid content received. Finish Reason: ${finishReason || 'Unknown'}`);
             }

              // Check finish reason on the first candidate
              const finishReason = response.candidates[0].finishReason;
              if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
                  // Other reasons might indicate issues (SAFETY, RECITATION, OTHER)
                  console.warn(`Gemini generation finished with reason: ${finishReason}. Content might be incomplete or problematic.`);
                  // Decide if you want to throw an error here based on the reason
                  if (finishReason === 'SAFETY') {
                      throw new Error(`Gemini generation failed: Response blocked due to safety settings.`);
                  }
              } else if (finishReason === 'MAX_TOKENS') {
                   console.warn(`Gemini response may be truncated due to reaching max output tokens.`);
              }

             // Safely get the text
             const responseText = response.text(); // .text() handles combining parts if needed

             if (!responseText) {
                 console.error("Gemini response text is empty even though content exists.");
                 throw new Error("Gemini generation failed: Received empty text response.");
             }
             // --- End Refined Response Handling ---

            console.log(`Successfully generated quotation report text from Gemini for project: ${inputData.name}`);
            // console.log("Gemini Response Text (first 100 chars):", responseText.substring(0, 100));

            return responseText;

        } catch (error) {
            // Catch errors from the API call itself or thrown during response handling
            console.error(`Error calling Gemini API or processing response: ${error instanceof Error ? error.message : error}`);
            throw new Error(`Gemini API request failed: ${error instanceof Error ? error.message : 'Unknown API error'}`);
        }
    }

    private constructPrompt(input: QuotationInputData): string {
        // Construct a detailed prompt for Gemini
        let prompt = `Generate a comprehensive software project quotation report based on the following details. Structure the report professionally with clear sections (e.g., Introduction, Scope, Technology Stack Estimate, Feature Breakdown Estimate, Timeline Estimate, Cost Estimate, Assumptions, Next Steps).

        **Project Name:** ${input.name}

        **Project Description:**
        ${input.description}

        **Development Team Structure:** ${input.isSelfMade ? "Solo Developer / Self-Made" : "Team-Based Project (Assume standard team roles like PM, Devs, QA if applicable)"}

        **Estimated Initial Capital/Budget (Optional):** ${input.capital ? `$${input.capital.toFixed(2)}` : "Not specified"}
        ${input.capital ? "- Consider this budget constraint in your estimations if possible." : ""}

        **Key Requirements for the Report:**
        1.  **Analyze Complexity:** Based on the description ${input.mockupImage ? "and the provided mockup image" : ""}, assess the overall complexity.
        2.  **Estimate Design Effort:** ${input.mockupImage ? "Evaluate the provided mockup. Estimate the time/cost needed for a UI/UX designer to refine/implement this design, considering its complexity." : "No mockup provided; assume standard design effort or mention the need for design phase."}
        3.  **Technology Stack:** Suggest a suitable technology stack if not specified, or comment on the feasibility of any mentioned technologies. Estimate effort related to stack setup/configuration.
        4.  **Feature Breakdown:** If possible from the description, break down major features and estimate effort (e.g., in hours, days, or story points) for each.
        5.  **Timeline:** Provide a rough timeline estimate (e.g., weeks or months) for development phases (Design, Development, Testing, Deployment).
        6.  **Cost Estimation:** Provide a cost range based on estimated effort and typical freelance or agency rates (clearly state your assumed rate or basis). Factor in team structure (solo vs. team).
        7.  **Assumptions:** Clearly list any assumptions made during the estimation.
        8.  **Professional Tone:** Use clear, concise, and professional language suitable for a client proposal.
        9.  **Format:** Output the report as well-structured text. Use markdown for formatting if possible (headings, lists, bold text).

        **${input.mockupImage ? "Note on Mockup: The following image provides a visual reference for the project's UI/UX." : ""}**
        
        NOTE: THE REPORT HAVE TO BE WRITTEN IN SPANISH
        `;
        // The image part itself is added separately in the main function if vision model is used.

        return prompt;
    }
}