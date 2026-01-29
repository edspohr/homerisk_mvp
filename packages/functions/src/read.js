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
exports.read = void 0;
const functions = __importStar(require("firebase-functions"));
const cors = __importStar(require("cors"));
const firebase_1 = require("./firebase");
const corsHandler = cors({ origin: true });
exports.read = functions.https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        try {
            if (req.method !== "GET") {
                res.status(405).send("Method Not Allowed");
                return;
            }
            const jobId = req.query.job_id;
            const pathJobId = req.path.split("/").pop(); // Support /report/{job_id} style if strictly rewritten, else use query param
            const finalId = jobId || pathJobId;
            if (!finalId) {
                res.status(400).json({ error: "Missing job_id" });
                return;
            }
            const reportRef = firebase_1.db.collection(firebase_1.REPORTS_COLLECTION).doc(finalId);
            const doc = await reportRef.get();
            if (!doc.exists) {
                res.status(404).json({ error: "Report not found" });
                return;
            }
            const data = doc.data();
            res.status(200).json(data);
        }
        catch (error) {
            console.error("Read Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });
});
//# sourceMappingURL=read.js.map