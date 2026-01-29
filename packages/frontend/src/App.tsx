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

  const [neighborhood, setNeighborhood] = useState("");

  const handleAddressSelect = React.useCallback((addr: string, loc: { lat: number; lng: number }, nb?: string) => {
    setAddress(addr);
    setLocation(loc);
    if (nb) setNeighborhood(nb);
  }, []);

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
      const res = await api.submitAnalysis(address, email, location, neighborhood);
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
    <div className="min-h-screen flex flex-col font-sans text-gray-900 bg-white">
      {/* Hero Section */}
      <header className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white pt-16 pb-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight">
            ¿Tu próximo hogar es realmente seguro?
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-8 font-light max-w-3xl mx-auto">
            Evita sorpresas desagradables. Obtén un reporte gratuito con datos históricos sobre:
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm md:text-base font-semibold text-blue-900">
             <span className="bg-blue-200 px-4 py-2 rounded-full shadow-sm">⚡️ Estabilidad Eléctrica</span>
             <span className="bg-blue-200 px-4 py-2 rounded-full shadow-sm">💧 Cortes de Agua</span>
             <span className="bg-blue-200 px-4 py-2 rounded-full shadow-sm">🚔 Seguridad y Delincuencia</span>
             <span className="bg-blue-200 px-4 py-2 rounded-full shadow-sm">🌧 Inundaciones</span>
          </div>
        </div>
      </header>

      {/* Main Content Area: Report Generation */}
      <main className="flex-grow -mt-10 px-4 pb-12">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100">
          <div className="p-8">
            {!report ? (
              <>
                <div className="text-center mb-8">
                  <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded uppercase tracking-wide">Gratis para usuarios</span>
                  <h2 className="text-2xl font-bold mt-2">Solicita tu Informe de Riesgo</h2>
                  <p className="text-gray-500 text-sm mt-1">Te lo enviaremos a tu correo en minutos.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-1">
                    <AddressInput onAddressSelect={handleAddressSelect} />
                    <p className="text-xs text-gray-400">Ej: Av. Providencia 1234, Santiago</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input 
                      type="email" 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border"
                      placeholder="nombre@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4">
                      <div className="flex">
                        <div className="ml-3">
                          <p className="text-sm text-red-700">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={loading || !location}
                    className={`w-full flex justify-center py-4 px-4 border border-transparent rounded-lg shadow-md text-base font-medium text-white ${loading || !location ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all`}
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analizando Datos...
                      </span>
                    ) : "Obtener Reporte Gratis"}
                  </button>
                  
                  {loading && (
                    <p className="text-center text-gray-500 text-xs mt-2 animate-pulse">
                      Consultando bases de datos de servicios, noticias y registros históricos...
                    </p>
                  )}
                </form>
              </>
            ) : (
                <div className="space-y-8 animate-fade-in">
                    <div className="text-center border-b pb-6">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900">¡Análisis Listo!</h2>
                        <p className="text-gray-500 mt-2">Hemos enviado una copia detallada a <strong>{email}</strong></p>
                        <p className="text-indigo-600 font-medium mt-1">{report.location_data.address_input}</p>
                    </div>

                    <div className="bg-indigo-50 p-6 rounded-lg text-center">
                        <h3 className="text-indigo-900 font-semibold uppercase tracking-wider text-sm mb-2">Riesgo General</h3>
                        <div className="text-5xl font-extrabold text-indigo-700">{report.risk_analysis?.overall_score}<span className="text-2xl text-indigo-400">/10</span></div>
                        <p className="text-indigo-800 mt-4 leading-relaxed max-w-lg mx-auto">{report.risk_analysis?.summary}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                            <h4 className="font-bold text-gray-700 mb-2 flex items-center">
                                ⚡️ Eléctrico
                            </h4>
                            <div className="text-2xl font-bold text-gray-900 mb-1">{report.risk_analysis?.categories.power_supply.score}/10</div>
                            <p className="text-xs text-gray-500 line-clamp-3">{report.risk_analysis?.categories.power_supply.details}</p>
                        </div>
                        <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                            <h4 className="font-bold text-gray-700 mb-2 flex items-center">
                                🛡 Seguridad
                            </h4>
                            <div className="text-2xl font-bold text-gray-900 mb-1">{report.risk_analysis?.categories.security.score}/10</div>
                             <p className="text-xs text-gray-500 line-clamp-3">{report.risk_analysis?.categories.security.details}</p>
                        </div>
                         <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                            <h4 className="font-bold text-gray-700 mb-2 flex items-center">
                                🌊 Natural
                            </h4>
                            <div className="text-2xl font-bold text-gray-900 mb-1">{report.risk_analysis?.categories.natural_events.score}/10</div>
                             <p className="text-xs text-gray-500 line-clamp-3">{report.risk_analysis?.categories.natural_events.details}</p>
                        </div>
                    </div>
                    
                     <button 
                        onClick={() => { setReport(null); setAddress(""); setLocation(null); setEmail(""); }}
                        className="w-full mt-6 py-3 text-indigo-600 font-medium border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                        Analizar otra ubicación
                    </button>
                </div>
            )}
          </div>
        </div>
      </main>

      {/* B2B / API Section */}
      <section className="bg-gray-900 py-16 text-white px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
                <span className="text-green-400 font-bold tracking-wider uppercase text-sm mb-2 block">Para Corredores e Inmobiliarias</span>
                <h2 className="text-3xl font-bold mb-4">Accede a nuestra Base de Datos de Riesgo</h2>
                <p className="text-gray-400 mb-6 text-lg">
                    Diferénciate de la competencia entregando transparencia total. Integra nuestra API para acceder a datos estructurados de habitabilidad y riesgo para cualquier propiedad en tu cartera.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <div className="flex items-start">
                         <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center text-gray-900 font-bold text-xs">✓</div>
                         <p className="ml-3 text-gray-300 text-sm">Validación de calidad de servicios básicos</p>
                    </div>
                    <div className="flex items-start">
                         <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center text-gray-900 font-bold text-xs">✓</div>
                         <p className="ml-3 text-gray-300 text-sm">Historial delictual geolocalizado</p>
                    </div>
                     <div className="flex items-start">
                         <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center text-gray-900 font-bold text-xs">✓</div>
                         <p className="ml-3 text-gray-300 text-sm">Lead Magnet para captación de clientes</p>
                    </div>
                    <div className="flex items-start">
                         <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center text-gray-900 font-bold text-xs">✓</div>
                         <p className="ml-3 text-gray-300 text-sm">Integración API Full REST</p>
                    </div>
                </div>
                
                <a href="mailto:partners@homerisk.com" className="inline-block bg-white text-gray-900 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors shadow-lg">
                    Solicitar Acceso a la API
                </a>
            </div>
            <div className="bg-gray-800 p-6 rounded-xl font-mono text-sm text-green-400 shadow-2xl border border-gray-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-gray-700 px-3 py-1 text-xs text-gray-300 rounded-bl-lg">GET /api/v1/property_risk</div>
                <div className="flex space-x-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <pre className="overflow-x-auto custom-scrollbar">
{`// Respuesta Certificada B2B
{
  "address": "Av. Apoquindo 4500",
  "habitability_score": 92,
  "utility_reliability": {
    "power_outages_avg_year": 0.5,
    "water_cuts_avg_year": 0
  },
  "security_index": "MEDIUM_LOW",
  "flood_risk_zone": false,
  "market_value_impact": "+2.5%"
}`}
                </pre>
            </div>
        </div>
      </section>

      <footer className="bg-gray-100 py-8 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} HomeRisk AI. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

export default App;
