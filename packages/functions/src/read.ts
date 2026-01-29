import { onRequest } from "firebase-functions/v2/https";
import cors from "cors";
import { db, REPORTS_COLLECTION } from "./firebase";
import { RiskReport } from "@homerisk/common";

const corsHandler = cors({ origin: ["http://localhost:5173", "https://homerisk-fb567.web.app"] });

export const read = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== "GET") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      const jobId = req.query.job_id as string;
      const pathJobId = req.path.split("/").pop(); // Support /report/{job_id} style if strictly rewritten, else use query param

      const finalId = jobId || pathJobId;

      if (!finalId) {
        res.status(400).json({ error: "Missing job_id" });
        return;
      }

      const reportRef = db.collection(REPORTS_COLLECTION).doc(finalId);
      const doc = await reportRef.get();

      if (!doc.exists) {
        res.status(404).json({ error: "Report not found" });
        return;
      }

      const data = doc.data() as RiskReport;
      res.status(200).json(data);

    } catch (error) {
      console.error("Read Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
});
