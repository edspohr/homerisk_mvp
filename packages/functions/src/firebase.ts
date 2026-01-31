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
export function generateJobId(lat: number, lng: number): string {
  const crypto = require('crypto');
  // Truncate to 4 decimal places (approx 11m precision) to group neighbors
  const latKey = lat.toFixed(4);
  const lngKey = lng.toFixed(4);
  const key = `${latKey},${lngKey}`;
  return crypto.createHash('md5').update(key).digest('hex');
}
