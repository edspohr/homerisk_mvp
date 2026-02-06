
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { onRequest } from "firebase-functions/v2/https";
import { PubSub } from "@google-cloud/pubsub";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const pubsub = new PubSub();


// HTTP Entry Point
export const submitAnalysis = onRequest({ cors: true }, async (req, res) => {
  try {
      const { address, email, name } = req.body; // Changed from userEmail to email to match likely frontend usage, but I'll standardize on 'email'
      if (!address) {
          res.status(400).send({ error: "Address is required" });
          return;
      }

      // Generate a scan ID mechanism
      const scanRef = admin.firestore().collection("analysis").doc();
      const scanId = scanRef.id;

      // Initialize document immediately
      await scanRef.set({
          address,
          userEmail: email, // Store as userEmail
          userName: name || "",
          status: "processing",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          scrapers: {
              telco: "pending",
              utilities: "pending",
              safety: "pending"
          }
      });

      // Publish to Topic to trigger orchestrator details
      await pubsub.topic("analysis-requests").publishMessage({
          json: { address, scanId, userEmail: email }
      });

      res.status(200).send({ success: true, scanId });
  } catch (error) {
      console.error("Submit failed:", error);
      res.status(500).send({ error: "Internal Server Error" });
  }
});

export const orchestrator = onMessagePublished({
    topic: "analysis-requests",
    memory: "512MiB"
}, async (event) => {
  try {
    const { address, scanId } = event.data.message.json;
    console.log(`Orchestrating analysis for: ${address} (ID: ${scanId})`);

    // Payload for scrapers
    const payload = { json: { address, scanId } };
    
    // Trigger parallel scrapers via Pub/Sub topics
    const topics = ["scan-telco", "scan-utilities", "scan-safety"];
    
    const publishPromises = topics.map(topic => 
      pubsub.topic(topic).publishMessage(payload)
    );

    await Promise.all(publishPromises);
    console.log(`Triggered all scrapers for scanId: ${scanId}`);

  } catch (error) {
    console.error("Orchestrator failed:", error);
  }
});
