
import * as admin from "firebase-admin";

admin.initializeApp();

export * from "./orchestrator";
export * from "./scrapers/telco";
export * from "./scrapers/utilities";
export * from "./scrapers/safety";
export * from "./aggregator";
