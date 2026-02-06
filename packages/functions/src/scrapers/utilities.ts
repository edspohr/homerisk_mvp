
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import * as admin from "firebase-admin";
import { getJson } from "serpapi";

if (!admin.apps.length) {
  admin.initializeApp();
}



// Re-trigger deploy for secrets update
export const scanUtilities = onMessagePublished({
    topic: "scan-utilities",
    memory: "1GiB",
    timeoutSeconds: 120
}, async (event) => {

    const { address, scanId } = event.data.message.json;
    console.log(`[UTILITIES] Real-time search for: ${address}`);

    try {
        const query = `cortes luz agua ${address} problemas recientes`;
        // Fetch real data
        const json = await getJson({
            engine: "google",
            q: query,
            api_key: process.env.SERPAPI_KEY,
            gl: "cl",
            hl: "es",
            num: 5
        });

        const snippets = json.organic_results?.map((r: any) => ({
            source: r.title,
            text: r.snippet,
            link: r.link,
            date: r.date
        })) || [];

        // CALCULATE STABILITY SCORE
        let stabilityScore = 100;
        const negativeKeywords = ["corte", "sin luz", "interrupción", "falla", "reposición", "problem"];
        
        snippets.forEach((s: any) => {
            const text = (s.title + " " + s.text).toLowerCase();
            const foundKeyword = negativeKeywords.some(k => text.includes(k));
            if (foundKeyword) {
                stabilityScore -= 15; // Deduct 15 points per negative report
            }
        });
        
        // Clamp score
        stabilityScore = Math.max(0, Math.min(100, stabilityScore));

        // Update Firestore
        await admin.firestore().collection("analysis").doc(scanId).set({
            results: {
                utilities: {
                    scanType: "REAL_SEARCH",
                    rawData: snippets,
                    stabilityScore: stabilityScore,
                    summary_hint: snippets.length > 0 ? "Datos encontrados en web pública." : "No se encontraron reportes recientes de cortes."
                }
            },
            scrapers: { utilities: "completed" }
        }, { merge: true });

    } catch (error) {
        console.error("Utilities Scan Failed:", error);
        // Fallback to error state, do NOT use fake mocks
        await admin.firestore().collection("analysis").doc(scanId).set({
            results: { utilities: { error: "Could not fetch real data" } },
            scrapers: { utilities: "completed" }
        }, { merge: true });
    }
});
