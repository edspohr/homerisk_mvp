import { onRequest } from "firebase-functions/v2/https";
import cors from "cors";
import { db, pubsub, ANALYSIS_TOPIC, REPORTS_COLLECTION, generateJobId } from "./firebase";
import { RiskReport } from "@homerisk/common";

// TODO: Update origins for production
const corsHandler = cors({ origin: ["http://localhost:5173", "https://homerisk-fb567.web.app"] });

export const ingest = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      const { address, email, name, phone, location } = req.body;

      if (!address || !location || !location.lat || !location.lng) {
        res.status(400).json({ error: "Missing required fields: address, location { lat, lng }" });
        return;
      }

      const jobId = generateJobId(address);
      const reportRef = db.collection(REPORTS_COLLECTION).doc(jobId);
      const doc = await reportRef.get();

      // Cache Logic
      if (doc.exists) {
        const data = doc.data() as RiskReport;
        
        // Calculate age in days
        const CACHE_TTL_DAYS = 30;
        const now = new Date().getTime();
        const createdAt = new Date(data.created_at).getTime();
        const daysDiff = (now - createdAt) / (1000 * 3600 * 24);

        if (daysDiff < CACHE_TTL_DAYS) {
             res.status(200).json({ job_id: jobId, status: data.status, message: "Request already exists (Cached)" });
             return;
        }
        // If older than 30 days, we proceed to overwrite/refresh
         console.log(`Cache expired for ${jobId} (Age: ${daysDiff.toFixed(1)} days). Refreshing...`);
      }

      // Create new Pending Report
      const initialReport: RiskReport = {
        report_id: jobId,
        status: "PENDING",
        request_metadata: {
          source: req.body.source || "WEB_B2C",
          timestamp: new Date().toISOString(),
          email: email,
          name: name,
          phone: phone,
        },
        location_data: {
          address_input: address,
          neighborhood: req.body.neighborhood || "",
          geo: location,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await reportRef.set(initialReport);

      // Publish to Pub/Sub
      const messageBuffer = Buffer.from(JSON.stringify({ jobId, address, location, email }));
      try {
        await pubsub.topic(ANALYSIS_TOPIC).publishMessage({ data: messageBuffer });
      } catch (error) {
         console.error("PubSub Error:", error);
         // If pubsub fails, update status to failed
         await reportRef.update({ status: "FAILED" });
         res.status(500).json({ error: "Internal Server Error: Message Queue Failed" });
         return;
      }

      res.status(202).json({ job_id: jobId, status: "PENDING" });

    } catch (error) {
      console.error("Ingest Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
});
