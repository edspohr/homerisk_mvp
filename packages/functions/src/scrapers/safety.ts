
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}


export const scanSafety = onMessagePublished({
    topic: "scan-safety",
    memory: "1GiB",
    timeoutSeconds: 120
}, async (event) => {

    const { address, scanId } = event.data.message.json;
    console.log(`[SAFETY] Scanning for: ${address} (ID: ${scanId})`);

    // MOCK IMPLEMENTATION (Simulating STOP Carabineros)
    await new Promise(r => setTimeout(r, 1000));

    const result = {
        scanType: "SAFETY",
        details: {
            stopQuadrant: "145",
            crimeIndex: "Medium",
            recentEvents: [
                { type: "Robo lugar habitado", count: 2, trend: "down" },
                { type: "Portonazo", count: 0, trend: "stable" }
            ],
            policeStation: "19 Comisaría Providencia"
        }
    };

    await admin.firestore().collection("analysis").doc(scanId).set({
        results: {
            safety: result
        },
        scrapers: {
            safety: "completed"
        }
    }, { merge: true });

    console.log("[SAFETY] Scan complete");
});
