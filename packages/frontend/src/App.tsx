import React, { useState, useEffect } from "react";
import AddressInput from "./components/AddressInput";
import { api } from "./api";
import { RiskReport } from "@homerisk/common";

// Helper to poll the API
const POLL_INTERVAL = 3000;

function App() {
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [report, setReport] = useState<RiskReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddressSelect = (addr: string, loc: { lat: number; lng: number }) => {
    setAddress(addr);
    setLocation(loc);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !address) {
      setError("Por favor selecciona una dirección válida.");
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await api.submitAnalysis(address, email, location);
      setJobId(res.job_id);
    } catch (err) {
      console.error(err);
      setError("Error al enviar la solicitud. Intenta nuevamente.");
      setLoading(false);
    }
  };

  // Polling Effect
  useEffect(() => {
    let interval: any;

    if (jobId && !report) {
      interval = setInterval(async () => {
        try {
          const data = await api.getReport(jobId);
          console.log("Polling status:", data.status);
          
          if (data.status === "COMPLETED") {
            setReport(data);
            setLoading(false);
            setJobId(null); // Stop polling
          } else if (data.status === "FAILED") {
            setError("El análisis falló. Por favor contacta soporte.");
            setLoading(false);
            setJobId(null);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, POLL_INTERVAL);
    }

    return () => clearInterval(interval);
  }, [jobId, report]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl">
        <h1 className="text-4xl font-bold mb-2 text-center text-blue-700">HomeRisk</h1>
        <p className="text-gray-600 mb-8 text-center text-lg">
          Inteligencia Artificial para evaluar tu próximo hogar.
        </p>
        
        {!report ? (
            <form onSubmit={handleSubmit} className="space-y-6">
            <AddressInput onAddressSelect={handleAddressSelect} />

            <div>
                <label className="block text-sm font-medium text-gray-700">Email (para recibir el reporte)</label>
                <input 
                type="email" 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                />
            </div>

            {error && <div className="text-red-500 text-sm text-center">{error}</div>}

            <button 
                type="submit" 
                disabled={loading || !location}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${loading || !location ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors`}
            >
                {loading ? "Procesando Análisis..." : "Analizar Riesgo"}
            </button>
            
            {loading && (
                <div className="text-center text-gray-500 text-sm animate-pulse">
                    Esto puede tomar unos segundos. Estamos consultando fuentes en tiempo real...
                </div>
            )}
            </form>
        ) : (
            <div className="space-y-6">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold text-green-600">¡Análisis Completado!</h2>
                    <p className="text-gray-500">Reporte para: {report.location_data.address_input}</p>
                </div>

                <div className="bg-blue-50 p-4 rounded-md">
                    <div className="flex justify-between items-center mb-2">
                         <span className="font-semibold text-lg">Riesgo General</span>
                         <span className="text-2xl font-bold text-blue-800">{report.risk_analysis?.overall_score}/10</span>
                    </div>
                    <p className="text-gray-700">{report.risk_analysis?.summary}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Power Supply */}
                    <div className="border p-4 rounded-md shadow-sm">
                        <h3 className="font-semibold text-gray-700 mb-1">Cortes de Luz</h3>
                        <div className="text-xl font-bold text-yellow-600 mb-2">{report.risk_analysis?.categories.power_supply.score}/10</div>
                        <p className="text-xs text-gray-500">{report.risk_analysis?.categories.power_supply.details}</p>
                    </div>

                    {/* Security */}
                     <div className="border p-4 rounded-md shadow-sm">
                        <h3 className="font-semibold text-gray-700 mb-1">Seguridad</h3>
                        <div className="text-xl font-bold text-red-600 mb-2">{report.risk_analysis?.categories.security.score}/10</div>
                         <p className="text-xs text-gray-500">{report.risk_analysis?.categories.security.details}</p>
                    </div>

                     {/* Natural Events */}
                     <div className="border p-4 rounded-md shadow-sm">
                        <h3 className="font-semibold text-gray-700 mb-1">Clima/Natural</h3>
                        <div className="text-xl font-bold text-green-600 mb-2">{report.risk_analysis?.categories.natural_events.score}/10</div>
                        <p className="text-xs text-gray-500">{report.risk_analysis?.categories.natural_events.details}</p>
                    </div>
                </div>
                
                 <button 
                    onClick={() => { setReport(null); setAddress(""); setLocation(null); setEmail(""); }}
                    className="w-full mt-4 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
                >
                    Analizar otra ubicación
                </button>
            </div>
        )}
      </div>
    </div>
  );
}

export default App;
