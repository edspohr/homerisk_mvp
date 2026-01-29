import * as admin from "firebase-admin";
import { PubSub } from "@google-cloud/pubsub";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
export const pubsub = new PubSub();

export const REPORTS_COLLECTION = "reports";
export const ANALYSIS_TOPIC = "analysis-requests";

// Helper to sanitize/normalize address for ID generation
export function generateJobId(address: string): string {
  const crypto = require('crypto');
  const normalized = address.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  return crypto.createHash('md5').update(normalized).digest('hex');
}
