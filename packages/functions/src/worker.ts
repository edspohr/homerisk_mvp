
import { db, REPORTS_COLLECTION } from "./firebase";
import { RiskAnalysis } from "@homerisk/common";
import { getJson } from "serpapi";
import { VertexAI } from "@google-cloud/vertexai";
import * as dotenv from "dotenv";
import { sendRiskReportEmail } from "./email";


dotenv.config();

// Re-using logic from script (ideally this should be in a shared lib, but for MVP copying/importing is fine)
// We need to ensure we have access to the env vars in the Cloud Function environment
const PROJECT_ID = process.env.GCP_PROJECT_ID;
const LOCATION = process.env.VERTEX_AI_LOCATION || "us-central1";
const MODEL_NAME = "gemini-pro";

async function searchAddressRisks(address: string, neighborhood?: string) {
  // Use neighborhood for broader search context if available
  const context = neighborhood ? `${neighborhood}, ${address}` : address;
  const queries = [
    `Cortes de luz ${context} problemas electricos`,
    `Inundaciones anegamientos ${context} historial lluvia`,
    `Seguridad robos delincuencia ${context} policial`,
    // Broad search for neighborhood specifically if available
    ...(neighborhood ? [`Delincuencia en barrio ${neighborhood} seguridad`, `Cortes de agua en ${neighborhood}`] : [])
  ];

  const allSnippets: string[] = [];

  for (const query of queries) {
    try {
      const json = await getJson({
        engine: "google",
        q: query,
        api_key: process.env.SERPAPI_KEY,
        hl: "es",
        gl: "cl",
      });
      
      if (json.organic_results) {
        json.organic_results.forEach((result: any) => {
          if (result.snippet) {
            allSnippets.push(`Source: ${result.title} (${result.date || "No date"})\nSnippet: ${result.snippet}`);
          }
        });
      }
    } catch (error) {
      console.error(`Error querying SerpApi for "${query}":`, error);
    }
  }
  return allSnippets;
}

async function analyzeRisksWithGemini(
  address: string,
  snippets: string[]
): Promise<RiskAnalysis | null> {
  if (!PROJECT_ID) {
    throw new Error("GCP_PROJECT_ID not set");
  }

  const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
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
    const text = response.candidates?.[0].content.parts[0].text;
    
    if (text) {
        const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(jsonStr) as RiskAnalysis;
    }
    return null;
  } catch (error) {
    console.error("Gemini Error or JSON Parse Error:", error);
    // Returning null here causes the worker to mark status as FAILED, preventing infinite retries.
    return null;
  }
}

import { onMessagePublished } from "firebase-functions/v2/pubsub";

export const worker = onMessagePublished("analysis-requests", async (event) => {
  // In v2, event.data is the PubSub message object
  const message = event.data.message;
  // .json helper might not exist directly on V2 message, usually it is just .json if compiled correctly or we parse .data string.
  // Actually event.data.message has properties.
  // Let's use robust parsing.
  let data: any; 
  try {
     data = message.json;
  } catch (e) {
     // If .json getter fails or doesn't exist, try decoding base64
     if (message.data) {
        data = JSON.parse(Buffer.from(message.data, 'base64').toString());
     }
  }

  if (!data) {
      console.error("No data found in message");
      return;
  }

  const { jobId, address, email } = data;

  console.log(`Processing job ${jobId} for address: ${address}`);

  const reportRef = db.collection(REPORTS_COLLECTION).doc(jobId);

  try {
    await reportRef.update({ status: "PROCESSING" });

    // 1. Gather Data
    // Fetch full request data to get neighborhood if available
    const docSnap = await reportRef.get();
    const docData = docSnap.data();
    const neighborhood = docData?.location_data?.neighborhood || "";

    const snippets = await searchAddressRisks(address, neighborhood);
    let analysis: RiskAnalysis | null = null;

    if (snippets.length > 0) {
        // 2. Analyze
        analysis = await analyzeRisksWithGemini(address, snippets);
    } else {
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
    
    // 4. Send Email
    if (email) {
        console.log(`Sending email to ${email}...`);
        await sendRiskReportEmail(email, address, analysis);
    }

  } catch (error) {
    console.error(`Worker failed for job ${jobId}:`, error);
    await reportRef.update({ status: "FAILED" });
  }
});
