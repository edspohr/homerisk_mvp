import axios from "axios";
import { RiskReport } from "@homerisk/common";

// In production, this would be the actual API Gateway URL
// In local dev, we might proxy or use localhost functions emulator
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://us-central1-homerisk-fb567.cloudfunctions.net";

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
