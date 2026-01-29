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
exports.ANALYSIS_TOPIC = exports.REPORTS_COLLECTION = exports.pubsub = exports.db = void 0;
exports.generateJobId = generateJobId;
const admin = __importStar(require("firebase-admin"));
const pubsub_1 = require("@google-cloud/pubsub");
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.db = admin.firestore();
exports.pubsub = new pubsub_1.PubSub();
exports.REPORTS_COLLECTION = "reports";
exports.ANALYSIS_TOPIC = "analysis-requests";
// Helper to sanitize/normalize address for ID generation
function generateJobId(address) {
    const crypto = require('crypto');
    const normalized = address.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    return crypto.createHash('md5').update(normalized).digest('hex');
}
//# sourceMappingURL=firebase.js.map