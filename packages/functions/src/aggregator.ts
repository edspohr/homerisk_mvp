
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { VertexAI } from "@google-cloud/vertexai";

if (!admin.apps.length) {
  admin.initializeApp();
}

// Initialize Vertex AI
const vertexAI = new VertexAI({ project: "homerisk-fb567", location: "us-central1" });


export const aggregator = onDocumentUpdated("analysis/{scanId}", async (event) => {
    const newValue = event.data?.after.data();
    // oldValue is not used
    const scanId = event.params.scanId;

    if (!newValue) return;

    // Check if processing is already done or in progress
    if (newValue.status === "completed") return;

    // Check if all scrapers are completed
    const scrapers = newValue.scrapers || {};
    const allDone = scrapers.telco === "completed" && 
                    scrapers.utilities === "completed" && 
                    scrapers.safety === "completed";

    if (!allDone) {
        console.log(`[AGGREGATOR] Scan ${scanId} waiting for scrapers...`);
        return;
    }

    console.log(`[AGGREGATOR] All scrapers done for ${scanId}. Generating summary...`);

    try {
        const results = newValue.results;
        
        // Prepare prompt for Gemini
        const model = vertexAI.preview.getGenerativeModel({
            model: "gemini-2.0-flash-001",

            generation_config: {
                max_output_tokens: 1024,
                temperature: 0.2,
            },
        });

        const prompt = `
            Actúa como un experto en Inteligencia Inmobiliaria para Chile.
            Analiza los siguientes datos recolectados para la dirección "${newValue.address}":

            1. Conectividad (ISP): ${JSON.stringify(results.telco)}
            2. Servicios Básicos (Luz/Agua): ${JSON.stringify(results.utilities)}
            3. Seguridad (Delincuencia): ${JSON.stringify(results.safety)}

            Genera un reporte conciso en ESPAÑOL.
            Estructura:
            - **Resumen Ejecutivo**: 1 párrafo con la conclusión de habitabilidad.
            - **Riesgos Detectados**: Lista de alertas rojas o amarillas.
            - **Oportunidades**: Puntos fuertes (ej. Fibra óptica factible).
            
            Tono: Profesional, directo, basado en datos.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const summaryText = response.candidates?.[0].content.parts[0].text;

        await admin.firestore().collection("analysis").doc(scanId).update({
            status: "completed",
            summary: summaryText,
            completedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`[AGGREGATOR] Summary generated for ${scanId}`);

    } catch (error) {
        console.error("Aggregator failed:", error);
        await admin.firestore().collection("analysis").doc(scanId).update({
            status: "error",
            error: JSON.stringify(error)
        });
    }
});
