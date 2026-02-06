import axios from "axios";
import { RiskReport } from "@homerisk/common";

// In production, use relative /api to leverage Firebase Hosting rewrites
// In local dev, if VITE_API_BASE_URL is not set, we default to /api anyway, assuming proxy.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const api = {

  submitAnalysis: async (address: string, email: string, location: { lat: number, lng: number }, neighborhood?: string, name?: string, phone?: string) => {
    const response = await axios.post<{ scanId: string; success: boolean }>(`${API_BASE_URL}/submit-analysis`, {
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

