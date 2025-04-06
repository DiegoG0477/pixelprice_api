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

        const datenow = Date.now().toLocaleString();

        console.log(`Using Gemini model: ${modelName}`);

        // --- Correction Starts Here ---
        // Change the type to Part[] and wrap strings in { text: ... }
        const promptParts: Part[] = [
             { text: this.constructPrompt(inputData, username, datenow) } // Wrap initial prompt string
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
        // Construct a detailed prompt for Gemini
        let prompt = `
        **ROL Y CONTEXTO:**
        ERES UN CONSULTOR EXPERTO EN DESARROLLO DE SOFTWARE Y GESTIÓN DE PROYECTOS, ESPECIALIZADO EN EL MERCADO MEXICANO. Conoces a fondo los costos, procesos, salarios promedio (tanto para talento local como para trabajo remoto/nearshoring), herramientas, licencias, servicios en la nube (AWS, Azure, GCP, proveedores locales si aplica), y las particularidades de estimar, cotizar y ejecutar proyectos de software en México. Entiendes la diferencia entre trabajar para un cliente nacional y uno extranjero (e.g., USA, Europa).
    
        **TAREA PRINCIPAL:**
        Generar un informe DETALLADO que estime el **COSTO DE DESARROLLO INTERNO** para un desarrollador o equipo de desarrollo ubicado en México, basado en los detalles proporcionados. El objetivo es que el desarrollador entienda cuánto le costaría *a él/ella/su equipo* llevar a cabo este proyecto. Secundariamente, proporcionarás una base para una posible cotización a un cliente final.
    
        **DATOS DE ENTRADA:**
        *   **Nombre del Proyecto:** ${input.name}
        *   **Descripción Detallada del Proyecto (incluye propósito, plataforma, stack, integraciones, seguridad, escalabilidad, infraestructura, funcionalidades clave, roles, pantallas, reportes, características premium, mantenimiento, accesibilidad, compatibilidad, idiomas, detalles del desarrollador):**
            ${input.description}
        *   **Estructura del Equipo:** ${input.isSelfMade ? "Desarrollador Solo / Auto-desarrollado" : "Proyecto Basado en Equipo (Asume roles estándar: PM, Desarrolladores ( Frontend, Backend, Móvil según aplique), QA, Diseñador UI/UX si es necesario)"}
        *   **Capital/Presupuesto Inicial Estimado (Opcional):** ${input.capital ? `$${input.capital.toFixed(2)} USD (o su equivalente aproximado en MXN)` : "No especificado"}
            ${input.capital ? "- Considera esta restricción presupuestaria. Si es insuficiente para el alcance descrito, indícalo CLARAMENTE y sugiere un capital inicial y total más realista para el desarrollo." : ""}
        *   **Mockup/Diseño Proporcionado:** ${input.mockupImage ? "Sí (analizar imagen adjunta)." : "No."}
    
        **ESTRUCTURA DEL INFORME REQUERIDO (EN ESPAÑOL):**
    
        1.  **Resumen Ejecutivo:** Breve descripción del proyecto, complejidad estimada, rango de costo interno de desarrollo y cronograma general.
        2.  **Análisis del Proyecto y Alcance:** Interpretación de los requisitos, funcionalidades clave identificadas y delimitación del alcance estimado.
        3.  **Análisis de Complejidad y Viabilidad:** Evaluación general de la complejidad técnica y funcional. Comentarios sobre la viabilidad con el presupuesto/equipo indicado (si aplica).
        4.  **Análisis del Mockup (Si aplica):** ${input.mockupImage ? "Evalúa la calidad y complejidad del diseño UI/UX del mockup. Estima el esfuerzo adicional (tiempo/costo) si se requiere un diseñador profesional para refinarlo o implementarlo. Comenta cómo el diseño impacta la complejidad del desarrollo." : "No se proporcionó mockup; se asumirá un esfuerzo de diseño estándar o se indicará la necesidad de una fase de diseño explícita."}
        5.  **Pila Tecnológica Propuesta/Análisis:** Sugiere un stack tecnológico adecuado (frontend, backend, base de datos, móvil si aplica) si no se especificó, o comenta sobre el stack proporcionado. Considera costos asociados (licencias, etc.).
        6.  **Estimación Detallada del Esfuerzo de Desarrollo (INTERNO):**
            *   **Desglose Funcional:** Detalla las funcionalidades o módulos principales identificados.
            *   **Estimación de Esfuerzo por Funcionalidad:** Para cada funcionalidad, estima el esfuerzo en **horas-persona** o **story points**. Si es posible, intenta aplicar principios similares a los **Puntos de Función COSMIC** para cuantificar el tamaño funcional, explicando tu metodología de forma simplificada. Sé granular.
            *   **Esfuerzo por Roles:** Estima horas totales para: Diseño UI/UX (si aplica), Desarrollo Frontend, Desarrollo Backend, Desarrollo Móvil (si aplica), QA/Pruebas, Gestión de Proyecto, Despliegue/DevOps.
            *   **Esfuerzo Total Estimado (Horas-Persona):** Suma total de horas.
        7.  **Costo Estimado de Desarrollo (INTERNO - para el Desarrollador/Equipo en México):**
            *   **Costos de Personal:** Basado en las horas estimadas por rol y **tarifas horarias PROMEDIO REALISTAS para México** (especifica las tarifas asumidas por rol, ej. Dev Jr, Mid, Sr, PM, QA, Diseñador en MXN/hora o USD/hora si es para cliente extranjero). Diferencia si es un solo desarrollador (costo de oportunidad) o un equipo.
            *   **Costos de Herramientas y Licencias:** **INVESTIGA EN LA WEB PRECIOS ACTUALIZADOS** para licencias de software, IDEs (si no son gratuitos), herramientas de diseño (ej. Figma), servicios específicos (ej. API de Mapas, Email), etc., necesarios DURANTE el desarrollo.
            *   **Costos de Infraestructura (Desarrollo/Pruebas):** **INVESTIGA COSTOS** de servicios cloud (ej. Instancias EC2/VMs, bases de datos gestionadas, repositorios) necesarios para el entorno de desarrollo y staging.
            *   **Otros Costos Directos:** (Pequeño buffer para imprevistos, ~10-15%).
            *   **Rango de Costo Total Interno de Desarrollo (MXN y/o USD):** Presenta un rango (optimista, pesimista) del costo total para el desarrollador/equipo.
        8.  **Base para Cotización a Cliente Final (Opcional/Secundario):**
            *   **Cálculo Base:** Explica cómo derivar un precio para el cliente (Costo Interno + Margen de Ganancia + Impuestos si aplica). Sugiere un margen razonable (ej. 30-50%).
            *   **Diferenciación Cliente Nacional vs. Extranjero:** Comenta cómo ajustar la cotización si el cliente es de USA/Europa vs. México (tarifas potencialmente más altas para clientes extranjeros).
            *   **Rango de Cotización Sugerido (MXN y/o USD):** Proporciona un rango de precio estimado para el cliente final.
        9.  **Cronograma Estimado:** Proporciona un cronograma realista por fases (Diseño, Desarrollo por sprints/módulos, Pruebas, Despliegue) en semanas o meses.
        10. **Simulación de Costos Operativos (Primer Año Post-Lanzamiento):**
            *   **Costos de Infraestructura (Producción):** **INVESTIGA COSTOS MENSUALES/ANUALES** de hosting/cloud (servidores, bases de datos, CDN, almacenamiento), dominios, certificados SSL, etc., basados en una estimación de carga inicial (pocos usuarios).
            *   **Costos de Mantenimiento:** Estimación de horas/costo mensual para correcciones, pequeñas mejoras, actualizaciones de dependencias (basado en un % del esfuerzo inicial o tarifa fija).
            *   **Costos Recurrentes:** Licencias de software/SaaS que continúan en producción (APIs de terceros, etc.).
            *   **Costo Operativo Anual Estimado (MXN y/o USD):** Rango de costo total para mantener la aplicación funcionando el primer año.
        11. **Simulación de Rentabilidad Potencial (Primer Año - Especulativo):**
            *   **Modelo de Ingresos Asumido:** Si el proyecto tiene un modelo de negocio implícito (venta, suscripción, publicidad), haz una suposición BÁSICA y sencilla. Si no, indica que no es posible estimar ingresos.
            *   **Estimación de Ingresos vs. Costos Operativos:** Compara los costos operativos anuales con una proyección MUY CONSERVADORA de ingresos (si se asumió un modelo).
            *   **Análisis:** Indica si, bajo esos supuestos conservadores, el proyecto podría acercarse a la rentabilidad o requeriría una tracción significativa. **NO INVENTES CIFRAS DE VENTAS DETALLADAS**, solo una simulación básica conceptual.
        12. **Supuestos Clave Realizados:** Lista todas las asunciones hechas (tarifas horarias, costos de licencias/cloud específicos, alcance detallado si no estaba claro, etc.).
        13. **Recomendaciones y Próximos Pasos:** Sugerencias sobre tecnologías, procesos, o pasos siguientes para el desarrollador (ej. validar estimaciones, crear prototipo, etc.).
    
        **INSTRUCCIONES ADICIONALES IMPORTANTES:**
        a)  **IDIOMA:** El informe completo DEBE estar en **Español (México)**.
        b)  **INVESTIGACIÓN WEB:** Es **CRUCIAL** que utilices tus capacidades de búsqueda web para obtener precios **actualizados y específicos para México (o USD si aplica a servicios globales)** de licencias, servicios cloud (sé específico si puedes inferir el tipo de servicio, ej. AWS t3.micro, Azure App Service S1, etc.), APIs, etc. Indica las fuentes o fechas de consulta si es posible. ¡Las estimaciones genéricas sin precios investigados son menos útiles!
        c)  **ENFOQUE EN EL DESARROLLADOR:** Recuerda que el objetivo principal es calcular el **costo interno** para el desarrollador/equipo en México. La cotización al cliente es secundaria.
        d)  **TONO PROFESIONAL Y REALISTA:** Usa un lenguaje claro, profesional pero directo. Sé realista con las estimaciones de tiempo y costo. Es mejor ser conservador.
        e)  **FORMATO:** Utiliza Markdown para una buena estructura (encabezados, listas, negritas).
        f)  **SUGERENCIAS:** Siéntete libre de proponer mejoras o alternativas (tecnológicas, de proceso) si lo consideras pertinente.

        NOTAS: 

        Si en reporte por alguna razón deseas ingresar el nombre del desarrollador, este es: ${username}, si quieres implementar la fecha de hoy en el reporte, esa es: ${datenow}
        `;
        return prompt;
    }
}