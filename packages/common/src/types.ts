export interface LocationData {
  address_input: string;
  neighborhood: string;
  geo?: {
    lat: number;
    lng: number;
  };
}

export interface RiskCategory {
  score: number;
  label: string;
  details: string;
}

export interface RiskAnalysis {
  overall_score: number;
  summary: string;
  categories: {
    power_supply: RiskCategory;
    security: RiskCategory;
    natural_events: RiskCategory;
    [key: string]: RiskCategory;
  };
  evidence_sources?: {
    title: string;
    url: string;
    date?: string;
  }[];
}

export type ReportStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface RiskReport {
  report_id: string; // uuid or hash
  status: ReportStatus;
  request_metadata: {
    source: "B2B_API" | "WEB_B2C";
    timestamp: string; // ISO Date
    email?: string;
  };
  location_data: LocationData;
  risk_analysis?: RiskAnalysis;
  created_at: string;
  updated_at: string;
}
