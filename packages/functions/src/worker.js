"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker = void 0;
const functions = __importStar(require("firebase-functions"));
const firebase_1 = require("./firebase");
const serpapi_1 = require("serpapi");
const vertexai_1 = require("@google-cloud/vertexai");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// Re-using logic from script (ideally this should be in a shared lib, but for MVP copying/importing is fine)
// We need to ensure we have access to the env vars in the Cloud Function environment
const PROJECT_ID = process.env.GCP_PROJECT_ID;
const LOCATION = process.env.VERTEX_AI_LOCATION || "us-central1";
const MODEL_NAME = "gemini-pro";
async function searchAddressRisks(address) {
    // Simplified neighbourhood logic for MVP: just use the address string provided
    // In a real app we'd reverse geocode or extract neighborhood from Places API data
    const queries = [
        `Cortes de luz ${address} problemas electricos`,
        `Inundaciones anegamientos ${address} historial lluvia`,
        `Seguridad robos delincuencia ${address} policial`,
    ];
    const allSnippets = [];
    for (const query of queries) {
        try {
            const json = await (0, serpapi_1.getJson)({
                engine: "google",
                q: query,
                api_key: process.env.SERPAPI_KEY,
                hl: "es",
                gl: "cl",
            });
            if (json.organic_results) {
                json.organic_results.forEach((result) => {
                    if (result.snippet) {
                        allSnippets.push(`Source: ${result.title} (${result.date || "No date"})\nSnippet: ${result.snippet}`);
                    }
                });
            }
        }
        catch (error) {
            console.error(`Error querying SerpApi for "${query}":`, error);
        }
    }
    return allSnippets;
}
async function analyzeRisksWithGemini(address, snippets) {
    var _a;
    if (!PROJECT_ID) {
        throw new Error("GCP_PROJECT_ID not set");
    }
    const vertexAI = new vertexai_1.VertexAI({ project: PROJECT_ID, location: LOCATION });
    const model = vertexAI.getGenerativeModel({ model: MODEL_NAME });
    const prompt = `
    Act as a Risk Assessment Expert. Analyze the following snippets found online regarding a specific location.

    Location: ${address}

    Snippets:
    ${snippets.join("\n\n")}

    Task:
    1. Evaluate the risk level for: Power Supply ("power_supply"), Security ("security"), and Natural Events ("natural_events").
    2. Assign a risk score from 0 (Safe) to 10 (High Risk) for each category.
    3. Calculate an overall risk score.
    4. Provide a summary and details.

    Output JSON structure ONLY:
    {
      "overall_score": number,
      "summary": string,
      "categories": {
        "power_supply": { "score": number, "label": string, "details": string },
        "security": { "score": number, "label": string, "details": string },
        "natural_events": { "score": number, "label": string, "details": string }
      }
    }
  `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0].content.parts[0].text;
        if (text) {
            const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
            return JSON.parse(jsonStr);
        }
        return null;
    }
    catch (error) {
        console.error("Gemini Error:", error);
        return null;
    }
}
exports.worker = functions.pubsub.topic("analysis-requests").onPublish(async (message) => {
    const data = message.json;
    const { jobId, address, email } = data;
    console.log(`Processing job ${jobId} for address: ${address}`);
    const reportRef = firebase_1.db.collection(firebase_1.REPORTS_COLLECTION).doc(jobId);
    try {
        await reportRef.update({ status: "PROCESSING" });
        // 1. Gather Data
        const snippets = await searchAddressRisks(address);
        let analysis = null;
        if (snippets.length > 0) {
            // 2. Analyze
            analysis = await analyzeRisksWithGemini(address, snippets);
        }
        else {
            // Fallback if no data found
            analysis = {
                overall_score: 0,
                summary: "No se encontraron datos de riesgo específicos en fuentes públicas recientes.",
                categories: {
                    power_supply: { score: 0, label: "Sin datos", details: "Sin información reciente." },
                    security: { score: 0, label: "Sin datos", details: "Sin información reciente." },
                    natural_events: { score: 0, label: "Sin datos", details: "Sin información reciente." }
                }
            };
        }
        if (!analysis) {
            await reportRef.update({ status: "FAILED" });
            return;
        }
        // 3. Save
        await reportRef.update({
            status: "COMPLETED",
            risk_analysis: analysis,
            updated_at: new Date().toISOString()
        });
        console.log(`Job ${jobId} completed.`);
        // 4. Send Email (Placeholder)
        if (email) {
            console.log(`Sending email to ${email}... (Not implemented yet)`);
            // TODO: Implement SendGrid/Mailgun logic here
        }
    }
    catch (error) {
        console.error(`Worker failed for job ${jobId}:`, error);
        await reportRef.update({ status: "FAILED" });
    }
});
//# sourceMappingURL=worker.js.map