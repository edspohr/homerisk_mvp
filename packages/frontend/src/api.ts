import axios from "axios";
import { RiskReport } from "@homerisk/common";

// In production, VITE_API_BASE_URL should be "/api" to use Firebase Hosting rewrites
// In local dev with emulator, set to "http://127.0.0.1:5001/homerisk-fb567/us-central1"
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const api = {
  submitAnalysis: async (address: string, email: string, location: { lat: number, lng: number }, neighborhood?: string, name?: string, phone?: string) => {
    const response = await axios.post<{ job_id: string; status: string }>(`${API_BASE_URL}/submit-analysis`, {
      address,
      email,
      name,
      phone,
      location,
      neighborhood,
    });
    return response.data;
  },

  getReport: async (jobId: string) => {
    const response = await axios.get<RiskReport>(`${API_BASE_URL}/report/${jobId}`);
    return response.data;
  },
};

