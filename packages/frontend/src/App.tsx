import React, { useState, useEffect, useRef } from "react";
import AddressInput from "./components/AddressInput";
import { api } from "./api";
import { RiskReport } from "@homerisk/common";

// Helper to poll the API
const POLL_INTERVAL = 3000;

// Mock Data for Habitability Dimensions
const HABITABILITY_DIMENSIONS = [
  { icon: "⚡", title: "Suministro", description: "Estabilidad eléctrica y agua", color: "bg-yellow-100 text-yellow-800" },
  { icon: "🛡️", title: "Seguridad", description: "Delincuencia y sensación de seguridad", color: "bg-blue-100 text-blue-800" },
  { icon: "🔊", title: "Entorno Acústico", description: "Ruidos molestos y construcción", color: "bg-purple-100 text-purple-800" },
  { icon: "🏗️", title: "Plusvalía y Urbano", description: "Permisos y plan regulador", color: "bg-green-100 text-green-800" },
  { icon: "🚌", title: "Conectividad", description: "Transporte y tiempos de traslado", color: "bg-indigo-100 text-indigo-800" },
  { icon: "🎓", title: "Servicios", description: "Calidad de colegios y salud", color: "bg-pink-100 text-pink-800" },
  { icon: "📶", title: "Internet", description: "Factibilidad real de fibra óptica", color: "bg-cyan-100 text-cyan-800" },
];

function App() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [report, setReport] = useState<RiskReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Scroll ref to auto-scroll to report
  const reportRef = useRef<HTMLDivElement>(null);

  const handleAddressSelect = React.useCallback((addr: string, loc: { lat: number; lng: number }, nb?: string) => {
    setAddress(addr);
    setLocation(loc);
    if (nb) setNeighborhood(nb);
  }, []);

  // Handle manual analysis fallback
  const handleManualAnalysis = React.useCallback((addressText: string) => {
    if (addressText.length < 3) return;
    setAddress(addressText);
    setLocation({ lat: -33.4488897, lng: -70.6692655 }); // Default/Fallback coords
    setNeighborhood("Santiago Centro");
  }, []);

  // Auto-scroll to report when it appears
  useEffect(() => {
    if (report && reportRef.current) {
      reportRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [report]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location && !address) {
      setError("Por favor selecciona una dirección válida.");
      return;
    }
    if (!email || !name) {
      setError("Por favor completa tu nombre y email.");
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);

    let finalLocation = location;
    let finalNeighborhood = neighborhood;

    // Fallback if user didn't select from dropdown (e.g. Maps failed)
    if (!finalLocation && address.length > 3) {
        finalLocation = { lat: -33.4488897, lng: -70.6692655 }; // Default Santiago
        finalNeighborhood = "Santiago Centro";
    }

    if (!finalLocation) {
        setError("Por favor selecciona una dirección válida del listado.");
        return;
    }

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await api.submitAnalysis(address, email, finalLocation, finalNeighborhood, name, phone);
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
    let errorCount = 0;

    if (jobId && !report) {
      interval = setInterval(async () => {
        try {
          const data = await api.getReport(jobId);
          console.log("Polling status:", data.status);
          
          if (data.status === "COMPLETED") {
            setReport(data);
            setLoading(false);
            setJobId(null);
          } else if (data.status === "FAILED") {
            setError("El análisis falló. Por favor intenta nuevamente.");
            setLoading(false);
            setJobId(null);
          }
          errorCount = 0;
        } catch (err) {
          console.error("Polling error:", err);
          errorCount++;
          if (errorCount > 5) {
             setError("Error de conexión. Verifica tu internet y vuelve a intentar.");
             setLoading(false);
             setJobId(null);
          }
        }
      }, POLL_INTERVAL);
    }

    return () => clearInterval(interval);
  }, [jobId, report]);

  const resetSearch = () => {
    setReport(null);
    setAddress("");
    setLocation(null);
    setEmail("");
    setName("");
    setPhone("");
    setJobId(null);
    setNeighborhood("");
  }

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900 overflow-x-hidden">
      
      {/* Hero Section */}
      <header className={`relative bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-800 text-white transition-all duration-500 ${report ? "py-12" : "py-20 md:py-28"} px-4`}>
        {/* Navigation Bar */}
        <nav className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50">
            <div className="flex items-center gap-2 cursor-pointer" onClick={resetSearch}>
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-indigo-900 font-bold text-xl shadow-lg">H</div>
                <span className="text-xl md:text-2xl font-bold tracking-tight text-white hover:opacity-90 transition-opacity">HomeRisk AI</span>
            </div>
            <div className="hidden md:flex gap-8 text-sm font-medium text-blue-100">
                <a href="#pricing" className="hover:text-white transition-colors">Planes</a>
                <a href="#api" className="hover:text-white transition-colors">API</a>
                <a href="#contact" className="hover:text-white transition-colors">Contacto</a>
            </div>
        </nav>

        <div className="max-w-4xl mx-auto text-center z-10 relative mt-8">
          {!report ? (
             <>
              <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight animate-fade-in-up">
                Analiza el riesgo de <br className="hidden md:block" /> tu próxima propiedad.
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-10 font-light max-w-2xl mx-auto animate-fade-in-up delay-100">
                Obtén un reporte completo de seguridad, cortes de luz y servicios al instante.
              </p>

              {/* Unified Search Form */}
              <div className="max-w-xl mx-auto bg-white p-6 md:p-8 rounded-2xl shadow-2xl animate-fade-in-up delay-200 text-left">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Comienza tu análisis gratuito</h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">Dirección</label>
                          <div className="bg-gray-50 rounded-lg p-1 border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                              <AddressInput 
                                  onAddressSelect={handleAddressSelect}
                                  onInputChange={(_) => {}} 
                                  onManualSubmit={handleManualAnalysis}
                                  className="w-full"
                                  inputClassName="w-full bg-transparent text-gray-900 px-3 py-2 outline-none placeholder-gray-400"
                              />
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">Tu Nombre</label>
                              <input 
                                  type="text" 
                                  className="w-full bg-gray-50 rounded-lg border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900"
                                  placeholder="Ej: Juan Pérez"
                                  value={name}
                                  onChange={(e) => setName(e.target.value)}
                                  required
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">Tu Email</label>
                              <input 
                                  type="email" 
                                  className="w-full bg-gray-50 rounded-lg border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900"
                                  placeholder="juan@email.com"
                                  value={email}
                                  onChange={(e) => setEmail(e.target.value)}
                                  required
                              />
                          </div>
                      </div>

                      {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">{error}</div>}

                      <button 
                          type="submit" 
                          disabled={loading || !address}
                          className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transform transition-all active:scale-95 ${
                              loading || !address
                              ? 'bg-indigo-300 cursor-not-allowed' 
                              : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl'
                          }`}
                      >
                          {loading ? (
                              <span className="flex items-center justify-center gap-2">
                                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Analizando...
                              </span>
                          ) : "Analizar Propiedad"}
                      </button>
                      <p className="text-xs text-center text-gray-400">Tus datos están seguros. Recibirás el reporte en pantalla y por email.</p>
                  </form>
              </div>
             </>
          ) : (
            <div className="mb-6 animate-fade-in">
                 <button onClick={resetSearch} className="text-blue-200 hover:text-white mb-2 text-sm flex items-center justify-center gap-1 mx-auto transition-colors">
                    ← Nueva Búsqueda
                 </button>
                 <h2 className="text-2xl md:text-3xl font-bold">Reporte para: {address}</h2>
            </div>
          )}
        </div>
        
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
      </header>

      <main className="flex-grow">
        
        {/* Trust Signals Strip */}
        <section className="bg-slate-50 border-b border-gray-200 py-4 px-4 overflow-hidden">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-center gap-4 text-sm text-gray-500">
                <span className="font-semibold uppercase tracking-wide text-xs">Nuestra IA analiza 24/7:</span>
                <div className="flex flex-wrap justify-center gap-6 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                    <span className="flex items-center gap-1"><span className="text-lg">⚡</span> Cortes de Luz</span>
                    <span className="flex items-center gap-1"><span className="text-lg">🚓</span> Seguridad</span>
                    <span className="flex items-center gap-1"><span className="text-lg">🌊</span> Riesgos Naturales</span>
                    <span className="flex items-center gap-1"><span className="text-lg">🔊</span> Ruidos</span>
                </div>
            </div>
        </section>

        {/* Feature Grid (Home View Only) */}
        {!report && (
          <section className="py-20 px-4 max-w-7xl mx-auto">
            <div className="text-center mb-16">
                 <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Inteligencia Inmobiliaria Integral</h2>
                 <p className="text-xl text-gray-600 max-w-2xl mx-auto">Analizamos 7 dimensiones críticas que afectan tu calidad de vida.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {HABITABILITY_DIMENSIONS.map((dim, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group">
                        <div className={`w-12 h-12 rounded-xl ${dim.color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
                            {dim.icon}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{dim.title}</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">{dim.description}</p>
                    </div>
                ))}
            </div>
          </section>
        )}

        {/* How it Works Section */}
        {!report && (
            <section className="py-20 px-4 bg-white border-t border-gray-100">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="text-indigo-600 font-bold uppercase tracking-wider text-sm mb-2 block">Proceso Simple</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">¿Cómo funciona HomeRisk?</h2>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-12 relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gray-100 -z-10"></div>

                        {[
                            { 
                                icon: "📍", 
                                title: "1. Ingresa la dirección", 
                                desc: "Busca la propiedad que te interesa evaluar. Nuestra base de datos cubre gran parte de la ciudad." 
                            },
                            { 
                                icon: "🧠", 
                                title: "2. Nuestra IA analiza", 
                                desc: "Cruzamos datos de delincuencia, cortes de luz, plusvalía y más de 10 fuentes oficiales en segundos." 
                            },
                            { 
                                icon: "✅", 
                                title: "3. Toma decisiones", 
                                desc: "Recibe un informe detallado con un Risk Score claro. Decide con información real, no con intuición." 
                            }
                        ].map((step, i) => (
                            <div key={i} className="flex flex-col items-center text-center group">
                                <div className="w-24 h-24 bg-white border-4 border-indigo-50 rounded-full flex items-center justify-center text-4xl shadow-lg mb-6 group-hover:scale-110 group-hover:border-indigo-100 transition-all duration-300 relative z-10">
                                    {step.icon}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                                <p className="text-gray-500 leading-relaxed px-4">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        )}

        {/* FULL REPORT VIEW */}
        {report && (
            <div ref={reportRef} className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 mb-10">
                    <div className="bg-green-50 p-6 md:p-8 text-center border-b border-green-100">
                        <div className="inline-flex items-center justify-center p-3 bg-green-100 rounded-full mb-4">
                            <span className="text-3xl">✅</span>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">¡Reporte Generado!</h2>
                        <p className="text-gray-600">Hemos enviado una copia detallada a <strong>{email}</strong>.</p>
                    </div>
                    
                    <div className="p-6 md:p-8">
                         <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
                             <div className="text-center md:text-left">
                                 <h3 className="text-2xl font-bold text-gray-800">{report.location_data.address_input}</h3>
                                 <p className="text-sm text-gray-500">Coordenadas: {report.location_data.geo?.lat.toFixed(4)}, {report.location_data.geo?.lng.toFixed(4)}</p>
                             </div>
                             <div className="text-center md:text-right bg-indigo-50 px-6 py-4 rounded-xl">
                                 <div className="text-xs text-indigo-500 uppercase tracking-widest font-bold mb-1">Risk Score</div>
                                 <div className="text-5xl font-black text-indigo-600 leading-none">{report.risk_analysis?.overall_score}<span className="text-2xl text-indigo-300">/10</span></div>
                             </div>
                         </div>

                         <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 mb-8">
                            <h4 className="font-bold text-gray-800 mb-2">Resumen Ejecutivo</h4>
                             <p className="text-gray-600 leading-relaxed">{report.risk_analysis?.summary}</p>
                         </div>

                        <h4 className="font-bold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2">
                            <span className="text-indigo-500">📊</span> Desglose de Factores
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-xl hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-bold text-gray-700 flex items-center gap-2">⚡ Suministro Eléctrico</span>
                                    <span className={`px-2 py-1 rounded text-sm font-bold ${getRiskClass(report.risk_analysis?.categories.power_supply.score || 0)}`}>
                                        {report.risk_analysis?.categories.power_supply.score}/10
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500">{report.risk_analysis?.categories.power_supply.details}</p>
                            </div>
                            
                            <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-xl hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-bold text-gray-700 flex items-center gap-2">🛡️ Seguridad</span>
                                    <span className={`px-2 py-1 rounded text-sm font-bold ${getRiskClass(report.risk_analysis?.categories.security.score || 0)}`}>
                                        {report.risk_analysis?.categories.security.score}/10
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500">{report.risk_analysis?.categories.security.details}</p>
                            </div>
                            
                             <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-xl hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-bold text-gray-700 flex items-center gap-2">🌊 Riesgos Naturales</span>
                                    <span className={`px-2 py-1 rounded text-sm font-bold ${getRiskClass(report.risk_analysis?.categories.natural_events.score || 0)}`}>
                                        {report.risk_analysis?.categories.natural_events.score}/10
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500">{report.risk_analysis?.categories.natural_events.details}</p>
                            </div>

                            {/* Placeholder for future expansion */}
                            <div className="p-5 bg-gray-50 border border-transparent rounded-xl flex items-center justify-center text-center">
                                <p className="text-sm text-gray-400">Más dimensiones disponibles en versión Pro</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </main>

      {/* Pricing Section - Simplified */}
      <section id="pricing" className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
             <div className="text-center mb-16">
                 <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Planes flexibles</h2>
                 <p className="text-xl text-gray-600 max-w-2xl mx-auto">Transparencia para todos.</p>
             </div>
             
             <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-transparent hover:border-indigo-500 transition-all duration-300">
                    <div className="p-8">
                        <div className="text-sm font-bold text-indigo-600 uppercase tracking-wide mb-2">Personal</div>
                        <h3 className="text-3xl font-bold text-gray-900 mb-4">Gratis</h3>
                        <p className="text-gray-500 mb-6">Ideal para evaluar tu próxima vivienda.</p>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center text-gray-600"><span className="mr-3 text-indigo-500">✓</span> 1 Reporte Completo</li>
                            <li className="flex items-center text-gray-600"><span className="mr-3 text-indigo-500">✓</span> Envío por Email</li>
                        </ul>
                        <button onClick={resetSearch} className="w-full py-4 rounded-xl border-2 border-indigo-600 text-indigo-600 font-bold hover:bg-indigo-50 transition-colors">
                            Buscar Ahora
                        </button>
                    </div>
                </div>

                <div className="bg-slate-900 text-white rounded-2xl shadow-xl overflow-hidden relative transform md:-translate-y-4">
                     <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-500 to-purple-500 text-xs font-bold px-3 py-1 rounded-bl-lg text-white">PRO</div>
                    <div className="p-8">
                        <div className="text-sm font-bold text-indigo-400 uppercase tracking-wide mb-2">Corredores</div>
                        <h3 className="text-3xl font-bold text-white mb-4">UF 2.5 <span className="text-lg text-slate-400 font-normal">/ mes</span></h3>
                        <p className="text-slate-400 mb-6">Herramientas profesionales de venta.</p>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center text-slate-300"><span className="mr-3 text-indigo-400">✓</span> Reportes ilimitados</li>
                            <li className="flex items-center text-slate-300"><span className="mr-3 text-indigo-400">✓</span> Marca blanca</li>
                        </ul>
                        <button className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg">
                            Prueba Gratis
                        </button>
                    </div>
                </div>
             </div>
        </div>
      </section>

      {/* B2B / API Section */}
      <section id="api" className="bg-slate-900 py-20 text-white px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <div>
                <span className="text-indigo-400 font-bold tracking-wider uppercase text-xs mb-4 block">Para Inmobiliarias y Corredores</span>
                <h2 className="text-4xl font-bold mb-6">Potencia tus ventas con datos transparentes.</h2>
                <p className="text-slate-400 mb-8 text-lg leading-relaxed">
                    Integra nuestra API y entrega reportes de habitabilidad certificados a tus clientes. Aumenta la confianza y acelera el cierre de ventas.
                </p>
                <ul className="space-y-4 mb-10">
                    {["API REST Documentada", "Validación de Servicios Básicos", "Widget embebible para tu sitio"].map((item, i) => (
                        <li key={i} className="flex items-center text-slate-300">
                             <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mr-3 text-sm">✓</span>
                             {item}
                        </li>
                    ))}
                </ul>
                <a href="mailto:partners@homerisk.com" className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-indigo-500/25">
                    Solicitar Demo API
                </a>
            </div>
            
            {/* Code Snippet Decoration */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative bg-[#0F172A] p-6 rounded-xl border border-slate-700 shadow-2xl overflow-hidden font-mono text-xs md:text-sm">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-4">
                        <div className="flex space-x-2">
                            <div className="w-3 h-3 rounded-full bg-red-500/20 text-red-500 border border-red-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500/20 text-yellow-500 border border-yellow-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500/20 text-green-500 border border-green-500/50"></div>
                        </div>
                        <span className="text-slate-500">risk_api_v1.json</span>
                    </div>
                    <div className="text-blue-300">
                        <span className="text-purple-400">const</span> <span className="text-yellow-200">analysis</span> = <span className="text-purple-400">await</span> homerisk.<span className="text-blue-400">eval</span>(<span className="text-green-300">"Av. Providencia 1234"</span>);
                    </div>
                    <br/>
                    <div className="text-slate-300">
                        <span className="text-slate-500">// Result</span><br/>
                        {`{`} <br/>
                        &nbsp;&nbsp;<span className="text-indigo-300">"score"</span>: <span className="text-orange-300">9.2</span>,<br/>
                        &nbsp;&nbsp;<span className="text-indigo-300">"electricity"</span>: <span className="text-green-300">"STABLE"</span>,<br/>
                        &nbsp;&nbsp;<span className="text-indigo-300">"security_level"</span>: <span className="text-green-300">"HIGH"</span>,<br/>
                        &nbsp;&nbsp;<span className="text-indigo-300">"fiber_optics"</span>: <span className="text-purple-400">true</span><br/>
                        {`}`}
                    </div>
                </div>
            </div>
        </div>
      </section>

      <footer id="contact" className="bg-slate-950 py-12 border-t border-slate-900 text-center text-slate-500 text-sm">
        <div className="max-w-4xl mx-auto px-4">
             <p className="mb-4">&copy; {new Date().getFullYear()} HomeRisk AI.</p>
             <div className="flex justify-center gap-6">
                 <a href="mailto:contacto@homerisk.com" className="hover:text-white">Contacto</a>
                 <a href="#" className="hover:text-white">Privacidad</a>
             </div>
        </div>
      </footer>
    </div>
  );
}

function getRiskClass(score: number): string {
    if (score >= 8) return "bg-green-100 text-green-800";
    if (score >= 5) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
}

export default App;
