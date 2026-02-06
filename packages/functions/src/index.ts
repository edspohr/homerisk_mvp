import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export * from "./orchestrator";
export * from "./scrapers/telco";
export * from "./scrapers/utilities";
export * from "./scrapers/safety";
export * from "./aggregator";
export * from "./read";
