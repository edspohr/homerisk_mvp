
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}


export const scanTelco = onMessagePublished({
    topic: "scan-telco",
    memory: "1GiB",
    timeoutSeconds: 120
}, async (event) => {

    const { address, scanId } = event.data.message.json;
    console.log(`[TELCO] Scanning for: ${address} (ID: ${scanId})`);

    // MOCK IMPLEMENTATION
    await new Promise(r => setTimeout(r, 2000)); 

    const result = {
        scanType: "TELCO",
        details: [
            { provider: "Movistar", technology: "FIBRA", speed: 940, feasible: true },
            { provider: "VTR", technology: "HFC", speed: 600, feasible: true },
            { provider: "Entel", technology: "FIBRA", speed: 940, feasible: false },
        ]
    };

    // Update the main analysis document
    await admin.firestore().collection("analysis").doc(scanId).set({
        results: {
            telco: result
        },
        scrapers: {
            telco: "completed"
        }
    }, { merge: true });

    console.log("[TELCO] Scan complete");
});
