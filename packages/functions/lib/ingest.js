"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingest = void 0;
const functions = __importStar(require("firebase-functions"));
const cors = __importStar(require("cors"));
const firebase_1 = require("./firebase");
const corsHandler = cors({ origin: true });
exports.ingest = functions.https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        try {
            if (req.method !== "POST") {
                res.status(405).send("Method Not Allowed");
                return;
            }
            const { address, email, location } = req.body;
            if (!address || !location || !location.lat || !location.lng) {
                res.status(400).json({ error: "Missing required fields: address, location { lat, lng }" });
                return;
            }
            const jobId = (0, firebase_1.generateJobId)(address);
            const reportRef = firebase_1.db.collection(firebase_1.REPORTS_COLLECTION).doc(jobId);
            const doc = await reportRef.get();
            // Check if report exists (Cache Logic - Fast Path)
            if (doc.exists) {
                const data = doc.data();
                // If completed or processing, return existing job_id
                // (For MVP we can assume data doesn't expire immediately, or add check here)
                res.status(200).json({ job_id: jobId, status: data.status, message: "Request already exists" });
                return;
            }
            // Create new Pending Report
            const initialReport = {
                report_id: jobId,
                status: "PENDING",
                request_metadata: {
                    source: req.body.source || "WEB_B2C",
                    timestamp: new Date().toISOString(),
                    email: email,
                },
                location_data: {
                    address_input: address,
                    neighborhood: "", // Will be filled by Worker or client can send it
                    geo: location,
                },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            await reportRef.set(initialReport);
            // Publish to Pub/Sub
            const messageBuffer = Buffer.from(JSON.stringify({ jobId, address, location, email }));
            try {
                await firebase_1.pubsub.topic(firebase_1.ANALYSIS_TOPIC).publishMessage({ data: messageBuffer });
            }
            catch (error) {
                console.error("PubSub Error:", error);
                // If pubsub fails, update status to failed
                await reportRef.update({ status: "FAILED" });
                res.status(500).json({ error: "Internal Server Error: Message Queue Failed" });
                return;
            }
            res.status(202).json({ job_id: jobId, status: "PENDING" });
        }
        catch (error) {
            console.error("Ingest Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });
});
//# sourceMappingURL=ingest.js.map