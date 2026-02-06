import { onRequest } from "firebase-functions/v2/https";
import cors from "cors";
import * as admin from "firebase-admin";
import { RiskReport } from "@homerisk/common";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const corsHandler = cors({ origin: true });

export const read = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== "GET") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      // Supports both query param and path param via rewrites
      const jobId = req.query.job_id as string;
      const pathJobId = req.path.split("/").pop();
      const finalId = jobId || pathJobId;

      if (!finalId) {
        res.status(400).json({ error: "Missing job_id" });
        return;
      }

      // CRITICAL FIX: Pointing to 'analysis' collection, not 'reports'
      const reportRef = db.collection("analysis").doc(finalId);
      const doc = await reportRef.get();

      if (!doc.exists) {
        res.status(404).json({ error: "Report not found" });
        return;
      }


      // Cast to generic or specific type
      const data = doc.data() as RiskReport;
      res.status(200).json(data);

    } catch (error) {
      console.error("Read Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
});
