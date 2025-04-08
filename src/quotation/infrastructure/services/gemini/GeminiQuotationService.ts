import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
    GenerationConfig,
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
        temperature: 1.0, // Controls randomness (0=deterministic, 1=max creative)
        topK: 1,
        topP: 1,
        maxOutputTokens: 16384, // Adjust based on expected report length and model limits
    };

    private safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    async generateQuotationReport(inputData: QuotationInputData, username: string): Promise<string> {
        if (!GEMINI_API_KEY) {
             throw new Error("Gemini API Key is not configured. Cannot generate report.");
        }

        const modelName = inputData.mockupImage ? VISION_MODEL_NAME : TEXT_MODEL_NAME;
        const model = genAI.getGenerativeModel({ model: modelName });

        const now = new Date(); // Obtiene la fecha y hora actuales
        const day = now.getDate(); // Obtiene el día del mes (1-31)
        const month = now.getMonth(); // Obtiene el mes (0-11, ¡Ojo: Enero es 0!)
        const year = now.getFullYear(); // Obtiene el año (4 dígitos)
    
        // Formatear la fecha en español (DD de Mes de YYYY)
        const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
        const formattedDate = `${day} de ${monthNames[month]} de ${year}`;
        // --- FIN: Modificación para la fecha ---

        console.log(`Using Gemini model: ${modelName}`);

        // --- Correction Starts Here ---
        // Change the type to Part[] and wrap strings in { text: ... }
        const promptParts: Part[] = [
             { text: this.constructPrompt(inputData, username, formattedDate) } // Wrap initial prompt string
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

    private constructPrompt(input: QuotationInputData, username: string, datenow: string): string {
        let prompt = `
        **ROL Y CONTEXTO:**
        ERES UN CONSULTOR EXPERTO EN DESARROLLO DE SOFTWARE, ESPECIALIZADO EN EL **MERCADO FREELANCE MEXICANO**. Actúas como un mentor o colega experimentado ayudando a un **desarrollador independiente (freelancer) o un equipo muy pequeño (1-3 personas máximo)** en México a estimar los costos *internos* para llevar a cabo un proyecto. Conoces los costos REALISTAS, procesos ágiles adaptados a freelancers, salarios promedio o **tarifas por hora FREELANCE competitivas** (locales y para clientes extranjeros - nearshoring), herramientas (priorizando gratuitas o de bajo costo), servicios en la nube (opciones económicas), y las particularidades de estimar y cotizar como freelancer en México. Entiendes el concepto de **costo de oportunidad** para un desarrollador solo.
    
        **TAREA PRINCIPAL:**
        Generar un informe DETALLADO que estime el **COSTO DE DESARROLLO INTERNO REALISTA para un FREELANCER o equipo pequeño** ubicado en México. El objetivo es que el desarrollador (${username}) entienda cuánto le costaría *personalmente* (en tiempo, esfuerzo y gastos directos mínimos) llevar a cabo este proyecto. **NO ESTÁS CALCULANDO COSTOS PARA UNA AGENCIA CON GRANDES GASTOS GENERALES (OVERHEAD).** Secundariamente, proporcionarás una base para una posible cotización a un cliente final, partiendo de este costo interno freelance.
    
        **DATOS DE ENTRADA:**
        * **Nombre del Proyecto:** ${input.name}
        * **Descripción Detallada del Proyecto:** ${input.description}
        * **Estructura del Equipo:** ${input.isSelfMade ? "**Desarrollador Solo (Freelancer)**" : "**Equipo Pequeño (Asume roles mínimos y/o compartidos, prioriza eficiencia)**"} <-- **IMPORTANTE: Adapta las estimaciones drásticamente según esta estructura.**
        * **Capital/Presupuesto Inicial Estimado (Opcional):** ${input.capital ? `$${input.capital.toFixed(2)} USD (o su equivalente aproximado en MXN)` : "No especificado"}
            ${input.capital ? "- Considera esta restricción presupuestaria. Si es INSUFICIENTE incluso para un enfoque freelance austero, indícalo CLARAMENTE y sugiere un mínimo viable." : ""}
        * **Mockup/Diseño Proporcionado:** ${input.mockupImage ? "Sí (analizar imagen adjunta)." : "No."}
    
        **ESTRUCTURA DEL INFORME REQUERIDO (EN ESPAÑOL):**
    
        1.  **Resumen Ejecutivo:** Breve descripción, complejidad estimada (considerando enfoque freelance), rango de **costo interno freelance** y cronograma general ajustado.
        2.  **Análisis del Proyecto y Alcance (Perspectiva Freelance):** Interpretación de requisitos, funcionalidades clave y delimitación del alcance **mínimo viable** si es necesario para ajustarse a un presupuesto/tiempo freelance.
        3.  **Análisis de Complejidad y Viabilidad (Freelance):** Evaluación de complejidad técnica y funcional desde la óptica de un desarrollador solo o equipo pequeño. Comentarios sobre viabilidad con el presupuesto/estructura indicada.
        4.  **Análisis del Mockup (Si aplica):** Evalúa complejidad del diseño. Si no hay mockup o es básico, sugiere si un diseño simple funcional es suficiente o si se necesita un UI Kit/plantilla para acelerar (enfoque freelance). Estima esfuerzo de implementación frontend.
        5.  **Pila Tecnológica Propuesta/Análisis (Enfoque Freelance):** Sugiere un stack eficiente y de bajo costo (considera tecnologías con buena comunidad, componentes reutilizables, BaaS si aplica). Comenta sobre el stack proporcionado y sus costos asociados (licencias mínimas o gratuitas).
        6.  **Estimación Detallada del Esfuerzo de Desarrollo (INTERNO - FREELANCE):**
            * **Desglose Funcional:** Detalla funcionalidades o módulos principales.
            * **Estimación de Esfuerzo por Funcionalidad:** Estima esfuerzo en **horas-persona REALISTAS para un freelancer/equipo pequeño**. Sé granular pero pragmático. Evita sobreestimar la coordinación o burocracia inexistente en este contexto.
            * **Esfuerzo por Roles (Si aplica equipo pequeño):** Estima horas totales para roles CLAVE (ej. Desarrollo Fullstack, quizá algo de QA básico). **Si es Desarrollador Solo, enfócate en el esfuerzo TOTAL de esa persona.** Minimiza o integra roles (PM, DevOps básico) en el rol principal.
            * **Esfuerzo Total Estimado (Horas-Persona):** Suma total de horas. **Sé conservador pero realista para el contexto freelance.**
        7.  **Costo Estimado de Desarrollo (INTERNO - FREELANCE en México):**
            * **Costos de Personal (Tiempo/Oportunidad):**
                * **Si es Desarrollador Solo:** Calcula el costo basado en las horas estimadas multiplicadas por una **TARIFA HORARIA FREELANCE REALISTA y COMPETITIVA para México** (MXN/hora) según el perfil (Jr, Mid, Sr). **NO USES TARIFAS DE AGENCIA.** Indica claramente la tarifa asumida. Este es el principal costo: el valor del tiempo del freelancer.
                * **Si es Equipo Pequeño:** Calcula el costo basado en horas por rol y tarifas **FREELANCE** por rol. Especifica tarifas asumidas (MXN/hora).
            * **Costos de Herramientas y Licencias:** **INVESTIGA PRECIOS ACTUALIZADOS** pero enfócate en **alternativas GRATUITAS o de MUY BAJO COSTO** viables para freelancers (IDEs gratuitos, tiers gratuitos de Figma/similares, etc.). Solo incluye costos si son estrictamente necesarios.
            * **Costos de Infraestructura (Desarrollo/Pruebas):** **INVESTIGA COSTOS** de servicios cloud **en sus niveles GRATUITOS o más ECONÓMICOS** (ej. AWS Free Tier, Vercel Hobby, Heroku Eco/Mini, opciones de VPS baratos en México) suficientes para desarrollo y pruebas iniciales.
            * **Otros Costos Directos MÍNIMOS:** Buffer **pequeño** para imprevistos (ej. **5-10% MÁXIMO** sobre los costos directos calculados).
            * **Rango de Costo Total Interno de Desarrollo (MXN):** Presenta un rango (optimista, realista) del costo total **PARA EL FREELANCER**.
        8.  **Base para Cotización a Cliente Final (Secundario):**
            * **Cálculo Base:** Explica CÓMO el freelancer puede calcular un precio: (Costo Interno Calculado Arriba + Margen de Ganancia Freelance + Impuestos si aplica). Sugiere un margen freelance razonable (ej. 30-60%, dependiendo complejidad y cliente).
            * **Diferenciación Cliente:** Comenta cómo ajustar la tarifa/margen si el cliente es extranjero (USA/Europa) vs. nacional.
            * **Rango de Cotización Sugerido (MXN y/o USD):** Rango de precio estimado PARA EL CLIENTE FINAL.
        9.  **Cronograma Estimado (Ajustado a Freelance):** Cronograma realista por fases, considerando que una sola persona o equipo pequeño puede tener menos paralelismo. Semanas o meses.
        10. **Simulación de Costos Operativos (Primer Año Post-Lanzamiento - ENFOQUE ECONÓMICO):**
            * **Costos de Infraestructura (Producción):** **INVESTIGA COSTOS MENSUALES/ANUALES** de opciones de hosting/cloud **ECONÓMICAS** (Shared Hosting, VPS básico, Serverless con bajo tráfico inicial, tiers de pago bajos de PaaS/BaaS). Incluye dominio, SSL básico. Asume carga inicial BAJA.
            * **Costos de Mantenimiento:** Estimación de horas/costo mensual para mantenimiento **BÁSICO** (correcciones críticas, actualizaciones seguridad). Puede ser una tarifa mensual pequeña o un banco de horas mínimo.
            * **Costos Recurrentes:** Licencias/APIs estrictamente necesarias en producción (considera alternativas gratuitas).
            * **Costo Operativo Anual Estimado (MXN):** Rango de costo ANUAL **MÍNIMO** para mantener la app funcionando.
        11. **Simulación de Rentabilidad Potencial (Primer Año - MUY CONSERVADORA):**
            * **Modelo de Ingresos Asumido:** Si aplica, haz una suposición SIMPLE y CONSERVADORA.
            * **Estimación de Ingresos vs. Costos Operativos:** Compara costos operativos ANUALES MÍNIMOS con proyección MUY CONSERVADORA de ingresos.
            * **Análisis:** Indica si podría cubrir costos operativos básicos o requeriría tracción. **NO INVENTES CIFRAS, enfócate en el punto de equilibrio operativo.**
        12. **Supuestos Clave Realizados:** Lista suposiciones (tarifa horaria freelance asumida, costos específicos de herramientas/cloud económicos, alcance simplificado si fue necesario, etc.).
        13. **Recomendaciones y Próximos Pasos (Para el Freelancer):** Sugerencias prácticas (validar estimación, buscar componentes reutilizables, empezar con MVP, etc.).
    
        **INSTRUCCIONES ADICIONALES IMPORTANTES:**
        a)  **IDIOMA:** Español (México).
        b)  **INVESTIGACIÓN WEB:** **CRUCIAL** buscar precios actualizados (México/USD), pero **prioriza opciones gratuitas o de bajo costo** adecuadas para freelancers. Indica fuentes/fechas si es posible.
        c)  **ENFOQUE FREELANCE:** **INSISTE** en la perspectiva del desarrollador independiente o equipo muy pequeño en México. Calcula el **costo interno/oportunidad**, no costos de agencia. Evita gastos generales (overhead) innecesarios.
        d)  **TONO:** Profesional, realista, pero también **orientado a la acción y eficiencia** para un freelancer. Sé conservador pero evita inflar innecesariamente para proyectos simples.
        e)  **FORMATO:** Markdown.
        f)  **SUGERENCIAS:** Propón alternativas eficientes (tecnológicas, de proceso) para un contexto freelance.
        g)  **ADAPTACIÓN:** Si el proyecto descrito es inherentemente grande y complejo, indícalo, pero aún así calcula el costo interno bajo la óptica freelance (aunque sea alto) antes de sugerir que excede la capacidad típica freelance.
    
        NOTAS:
    
        El nombre del desarrollador que solicita esta estimación es: ${username}. La fecha de generación de este reporte es: ${datenow}.
        `;
        return prompt;
    }
}