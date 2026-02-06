
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}


export const scanUtilities = onMessagePublished({
    topic: "scan-utilities",
    memory: "1GiB",
    timeoutSeconds: 120
}, async (event) => {

    const { address, scanId } = event.data.message.json;
    console.log(`[UTILITIES] Scanning for: ${address} (ID: ${scanId})`);

    // MOCK IMPLEMENTATION
    await new Promise(r => setTimeout(r, 1500));

    const powerStability = Math.random() > 0.1 ? "Stable" : "Unstable";

    const result = {
        scanType: "UTILITIES",
        details: {
            power: { provider: "Enel", stability: powerStability, reportedOutagesLastMonth: 2 },
            water: { provider: "Aguas Andinas", stability: "High", reportedCutsLastYear: 1 }
        }
    };

    await admin.firestore().collection("analysis").doc(scanId).set({
        results: {
            utilities: result
        },
        scrapers: {
            utilities: "completed"
        }
    }, { merge: true });

    console.log("[UTILITIES] Scan complete");
});
