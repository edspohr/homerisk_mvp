import { getJson } from "serpapi";
import { VertexAI, GenerativeModel } from "@google-cloud/vertexai";
import * as dotenv from "dotenv";

dotenv.config();

// Configuration
const PROJECT_ID = process.env.GCP_PROJECT_ID || "your-project-id";
const LOCATION = process.env.VERTEX_AI_LOCATION || "us-central1";
const MODEL_NAME = "gemini-pro";

interface RiskAnalysisResult {
  overall_score: number;
  summary: string;
  categories: {
    [key: string]: {
      score: number;
      label: string;
      details: string;
    };
  };
}

async function searchAddressRisks(address: string, neighborhood: string) {
  const queries = [
    `Cortes de luz ${neighborhood} ${address} problemas electricos`,
    `Inundaciones anegamientos ${neighborhood} ${address} lluvia`,
    `Seguridad robos delincuencia ${neighborhood} ${address} policial`,
  ];

  const allSnippets: string[] = [];

  console.log(`Searching for risks in: ${neighborhood}, ${address}...`);

  for (const query of queries) {
    console.log(`  - Querying: "${query}"`);
    try {
      const json = await getJson({
        engine: "google",
        q: query,
        api_key: process.env.SERPAPI_KEY,
        hl: "es",
        gl: "cl", // Assuming Chile based on the example (Address "Av. Siempre Viva 742" with lat -33)
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
  neighborhood: string,
  snippets: string[]
): Promise<RiskAnalysisResult | null> {
  const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
  const model: GenerativeModel = vertexAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `
    Act as a Risk Assessment Expert for real estate. Analyze the following snippets found online regarding a specific location.

    Location: ${address}, Neighborhood: ${neighborhood}

    Snippets from Search Results:
    ${snippets.join("\n\n")}

    Task:
    1. Evaluate the risk level for: Power Supply (Cortes de luz), Security (Seguridad), and Natural Events (Inundaciones/Anegamientos).
    2. Assign a risk score from 0 (Safe) to 10 (High Risk) for each category.
    3. Calculate an overall risk score (average).
    4. Provide a brief summary and detailed explanation for each category referencing the snippets if possible.

    Output format: JSON only.
    Structure:
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

  console.log("Analyzing with Gemini...");

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.candidates?.[0].content.parts[0].text;
    
    if (text) {
        // Simple cleanup to extract JSON if Gemini wraps it in markdown blocks
        const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(jsonStr) as RiskAnalysisResult;
    }
    return null;

  } catch (error) {
    console.error("Error analyzing with Gemini:", error);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const location = args[0] || "Av. Providencia 1234, Santiago";
  const neighborhood = args[1] || "Providencia";
  
  const snippets = await searchAddressRisks(location, neighborhood);
  
  if (snippets.length === 0) {
      console.log("No information found for this location.");
      return;
  }

  const analysis = await analyzeRisksWithGemini(location, neighborhood, snippets);
  
  console.log("\nActual Risk Analysis Result from Gemini:");
  console.log(JSON.stringify(analysis, null, 2));
}

main().catch(console.error);
