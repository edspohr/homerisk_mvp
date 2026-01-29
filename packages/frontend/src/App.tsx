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

  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [report, setReport] = useState<RiskReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Scroll ref to auto-scroll to preview
  const previewRef = useRef<HTMLDivElement>(null);

  const handleAddressSelect = React.useCallback((addr: string, loc: { lat: number; lng: number }, nb?: string) => {
    setAddress(addr);
    setLocation(loc);
    if (nb) setNeighborhood(nb);
    setShowPreview(true);
  }, []);

  // Auto-scroll to preview when it appears
  useEffect(() => {
    if (showPreview && previewRef.current) {
      previewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showPreview]);

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
      const res = await api.submitAnalysis(address, email, location, neighborhood, name, phone);
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

  const resetSearch = () => {
    setReport(null);
    setAddress("");
    setLocation(null);
    setEmail("");
    setShowPreview(false);
    setJobId(null);
  }

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900 overflow-x-hidden">
      
      {/* Hero Section */}
      <header className={`relative bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-800 text-white transition-all duration-500 ${showPreview || report ? "py-12" : "py-24 md:py-32"} px-4`}>
        {/* Navigation Bar */}
        <nav className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50">
            <div className="flex items-center gap-2 cursor-pointer" onClick={resetSearch}>
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-indigo-900 font-bold text-xl shadow-lg">H</div>
                <span className="text-xl md:text-2xl font-bold tracking-tight text-white hover:opacity-90 transition-opacity">HomeRisk AI</span>
            </div>
            <div className="hidden md:flex gap-8 text-sm font-medium text-blue-100">
                <a href="#" className="hover:text-white transition-colors">Cómo funciona</a>
                <a href="#pricing" className="hover:text-white transition-colors">Planes</a>
                <a href="mailto:partners@homerisk.com" className="hover:text-white transition-colors">Para Corredores</a>
            </div>
            {/* Mobile Menu - Simplified for MVP */}
            <a href="#pricing" className="md:hidden text-sm font-bold text-blue-200 hover:text-white transition-colors">Planes</a>
        </nav>

        <div className="max-w-4xl mx-auto text-center z-10 relative mt-10">
          {!showPreview && !report ? (
             <>
              <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight animate-fade-in-up">
                Descubre la realidad oculta <br className="hidden md:block" /> de tu próxima propiedad.
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-10 font-light max-w-2xl mx-auto animate-fade-in-up delay-100">
                No compres a ciegas. Analizamos cortes de luz, delincuencia, ruidos molestos, planes reguladores y conectividad en segundos.
              </p>
             </>
          ) : (
            <div className="mb-6 animate-fade-in">
                 <button onClick={resetSearch} className="text-blue-200 hover:text-white mb-2 text-sm flex items-center justify-center gap-1 mx-auto transition-colors">
                    ← Nueva Búsqueda
                 </button>
                 <h2 className="text-2xl md:text-3xl font-bold">Análisis para: {address}</h2>
            </div>
          )}

          {/* Search Bar Container */}
          <div className={`${showPreview || report ? "max-w-xl" : "max-w-2xl"} mx-auto transform transition-all duration-500 hover:scale-105`}>
             <div className="bg-white p-2 rounded-xl shadow-2xl flex items-center">
                <span className="pl-4 text-xl hidden sm:block">📍</span>
                <AddressInput 
                    onAddressSelect={handleAddressSelect} 
                    className="flex-grow"
                    inputClassName="w-full text-gray-900 text-lg py-3 px-4 outline-none border-none placeholder-gray-400"
                />
                 {!showPreview && !report && (
                    <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold transition-colors hidden sm:block">
                        Analizar
                    </button>
                 )}
             </div>
          </div>
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
        {!report && (
             <section className="bg-slate-50 border-b border-gray-200 py-4 px-4 overflow-hidden">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-center gap-4 text-sm text-gray-500">
                    <span className="font-semibold uppercase tracking-wide text-xs">Nuestra IA analiza:</span>
                    <div className="flex flex-wrap justify-center gap-6 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                        <span className="flex items-center gap-1"><span className="text-lg">📰</span> Noticias Locales</span>
                        <span className="flex items-center gap-1"><span className="text-lg">🚓</span> Reportes Policiales</span>
                        <span className="flex items-center gap-1"><span className="text-lg">📢</span> Redes Sociales</span>
                        <span className="flex items-center gap-1"><span className="text-lg">🏛️</span> Datos Gubernamentales</span>
                        <span className="flex items-center gap-1"><span className="text-lg">💬</span> Foros Vecinales</span>
                    </div>
                </div>
            </section>
        )}

        {/* Feature Grid (Home View) */}
        {!showPreview && !report && (
          <section className="py-20 px-4 max-w-7xl mx-auto">
            <div className="text-center mb-16">
                 <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Inteligencia Inmobiliaria Integral</h2>
                 <p className="text-xl text-gray-600 max-w-2xl mx-auto">Analizamos 7 dimensiones críticas que afectan tu calidad de vida y plusvalía.</p>
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

        {/* PREVIEW SECTION (Blurred Report) */}
        {showPreview && !report && (
            <div ref={previewRef} className="max-w-5xl mx-auto px-4 py-12 -mt-6">
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                    
                    {/* Preview Header */}
                    <div className="bg-gray-50 p-6 md:p-10 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-6">
                         <div className="text-center md:text-left">
                            <div className="inline-block bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">Reporte Preliminar</div>
                            <h2 className="text-2xl font-bold text-gray-900">Score de Habitabilidad</h2>
                            <p className="text-gray-500">Basado en datos públicos y reportes de usuarios</p>
                         </div>
                         <div className="flex items-center gap-4">
                             <div className="relative">
                                 <svg className="w-24 h-24 transform -rotate-90">
                                     <circle className="text-gray-200" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="48" cy="48" />
                                     <circle className="text-indigo-600" strokeWidth="8" strokeDasharray={251.2} strokeDashoffset={251.2 * (1 - 7.5/10)} strokeLinecap="round" stroke="currentColor" fill="transparent" r="40" cx="48" cy="48" />
                                 </svg>
                                 <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center flex-col">
                                     <span className="text-2xl font-bold text-indigo-900">7.5</span>
                                     <span className="text-xs text-gray-400">/10</span>
                                 </div>
                             </div>
                         </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3">
                         {/* Fake Map */}
                         <div className="bg-slate-100 lg:col-span-1 min-h-[300px] relative flex items-center justify-center overflow-hidden">
                             <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=-33.448890,-70.669265&zoom=14&size=600x600&scale=2&maptype=roadmap&sensor=false')] bg-cover bg-center grayscale opacity-30"></div>
                             <div className="relative p-6 text-center">
                                 <span className="text-4xl mb-2 block">🗺️</span>
                                 <p className="text-gray-500 font-medium">Mapa de Incidentes</p>
                                 <p className="text-xs text-gray-400">Visible en reporte completo</p>
                             </div>
                         </div>

                         {/* Blurred Categories */}
                         <div className="lg:col-span-2 p-8 relative">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 filter blur-sm select-none pointer-events-none opacity-50">
                                 {HABITABILITY_DIMENSIONS.slice(0, 4).map((dim, idx) => (
                                     <div key={idx} className="border p-4 rounded-lg">
                                         <div className="flex justify-between mb-2">
                                             <span className="font-bold text-gray-700">{dim.title}</span>
                                             <span className="font-bold text-gray-900">8/10</span>
                                         </div>
                                         <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                             <div className="h-full bg-gray-400 w-3/4"></div>
                                         </div>
                                         <p className="text-xs text-gray-500 mt-2">Detalle no disponible en vista previa...</p>
                                     </div>
                                 ))}
                             </div>

                             {/* Unlock Overlay (Email Form) */}
                             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] p-6">
                                 <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full border border-indigo-50 text-center transform scale-100 transition-transform">
                                      <h3 className="text-xl font-bold text-gray-900 mb-2">Desbloquea el Reporte Completo</h3>
                                      <p className="text-gray-600 mb-6 text-sm">Obtén el detalle de incidentes, cortes recientes y la calidad real de servicios en tu correo.</p>
                                      
                                      <form onSubmit={handleSubmit} className="space-y-4">
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                              <input 
                                                  type="text" 
                                                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border text-lg"
                                                  placeholder="Tu Nombre"
                                                  value={name}
                                                  onChange={(e) => setName(e.target.value)}
                                                  required
                                              />
                                              <input 
                                                  type="tel" 
                                                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border text-lg"
                                                  placeholder="Teléfono (+569...)"
                                                  value={phone}
                                                  onChange={(e) => setPhone(e.target.value)}
                                                  required
                                              />
                                          </div>
                                          <input 
                                              type="email" 
                                              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border text-lg"
                                              placeholder="tu@email.com"
                                              value={email}
                                              onChange={(e) => setEmail(e.target.value)}
                                              required
                                          />
                                          {error && <p className="text-red-600 text-xs text-left">{error}</p>}
                                          <button 
                                              type="submit" 
                                              disabled={loading}
                                              className={`w-full py-3 px-4 rounded-lg shadow-lg text-white font-bold text-lg ${loading ? 'bg-indigo-400' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700'} transition-all transform active:scale-95`}
                                          >
                                              {loading ? "Analizando..." : "Enviar Reporte Completo Gratuito"}
                                          </button>
                                          <p className="text-xs text-gray-400 mt-2">🔒 Tus datos están seguros. No enviamos spam.</p>
                                      </form>
                                 </div>
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        )}

        {/* FULL REPORT VIEW (Existing Logic Polished) */}
        {report && (
            <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 mb-10">
                    <div className="bg-green-50 p-8 text-center border-b border-green-100">
                        <div className="inline-flex items-center justify-center p-3 bg-green-100 rounded-full mb-4">
                            <span className="text-3xl">✅</span>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">¡Reporte Enviado!</h2>
                        <p className="text-gray-600">Revisa tu bandeja de entrada ({email}) para ver el PDF completo.</p>
                    </div>
                    
                    <div className="p-8">
                         <div className="flex items-center justify-between mb-8">
                             <div>
                                 <h3 className="text-xl font-bold text-gray-800">{report.location_data.address_input}</h3>
                                 <p className="text-sm text-gray-500">Coordenadas: {report.location_data.geo?.lat.toFixed(4)}, {report.location_data.geo?.lng.toFixed(4)}</p>
                             </div>
                             <div className="text-right">
                                 <div className="text-sm text-gray-500 uppercase tracking-widest font-semibold">Score</div>
                                 <div className="text-4xl font-black text-indigo-600">{report.risk_analysis?.overall_score}<span className="text-lg text-gray-400">/10</span></div>
                             </div>
                         </div>

                         <div className="prose max-w-none text-gray-600 mb-8">
                             <p>{report.risk_analysis?.summary}</p>
                         </div>

                        <h4 className="font-bold text-gray-900 mb-4 border-b pb-2">Desglose de Factores</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* We iterate over the categories from the report */}
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-gray-700">⚡ Suministro Eléctrico</span>
                                    <span className="bg-white px-2 py-1 rounded shadow-sm text-sm font-bold">{report.risk_analysis?.categories.power_supply.score}/10</span>
                                </div>
                                <p className="text-sm text-gray-500">{report.risk_analysis?.categories.power_supply.details}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-gray-700">🛡️ Seguridad</span>
                                    <span className="bg-white px-2 py-1 rounded shadow-sm text-sm font-bold">{report.risk_analysis?.categories.security.score}/10</span>
                                </div>
                                <p className="text-sm text-gray-500">{report.risk_analysis?.categories.security.details}</p>
                            </div>
                             <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-gray-700">🌊 Riesgos Naturales</span>
                                    <span className="bg-white px-2 py-1 rounded shadow-sm text-sm font-bold">{report.risk_analysis?.categories.natural_events.score}/10</span>
                                </div>
                                <p className="text-sm text-gray-500">{report.risk_analysis?.categories.natural_events.details}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </main>

      {/* Pricing Section (New) */}
      <section id="pricing" className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
             <div className="text-center mb-16">
                 <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Planes diseñados para ti</h2>
                 <p className="text-xl text-gray-600 max-w-2xl mx-auto">Ya sea que busques tu hogar ideal o gestiones múltiples propiedades.</p>
             </div>
             
             <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Plan Personal */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-transparent hover:border-indigo-500 transition-all duration-300">
                    <div className="p-8">
                        <div className="text-sm font-bold text-indigo-600 uppercase tracking-wide mb-2">Para Compradores</div>
                        <h3 className="text-3xl font-bold text-gray-900 mb-4">Personal</h3>
                        <p className="text-gray-500 mb-6">Toma la decisión correcta y evita sorpresas.</p>
                        <div className="flex items-baseline mb-8">
                            <span className="text-4xl font-extrabold text-gray-900">Gratis</span>
                            <span className="text-gray-500 ml-2">/ 1er reporte</span>
                        </div>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center text-gray-600">
                                <span className="mr-3 text-indigo-500">✓</span> 1 Reporte detallado de habitabilidad
                            </li>
                             <li className="flex items-center text-gray-600">
                                <span className="mr-3 text-indigo-500">✓</span> Análisis de cortes y seguridad
                            </li>
                             <li className="flex items-center text-gray-600">
                                <span className="mr-3 text-indigo-500">✓</span> Evaluación de entorno
                            </li>
                        </ul>
                        <button onClick={() => window.scrollTo(0,0)} className="w-full py-4 rounded-xl border-2 border-indigo-600 text-indigo-600 font-bold hover:bg-indigo-50 transition-colors">
                            Buscar Propiedad
                        </button>
                    </div>
                </div>

                {/* Plan Broker */}
                <div className="bg-slate-900 text-white rounded-2xl shadow-xl overflow-hidden relative transform md:-translate-y-4">
                     <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-500 to-purple-500 text-xs font-bold px-3 py-1 rounded-bl-lg text-white">RECOMENDADO</div>
                    <div className="p-8">
                        <div className="text-sm font-bold text-indigo-400 uppercase tracking-wide mb-2">Para Corredores</div>
                        <h3 className="text-3xl font-bold text-white mb-4">Broker Pro</h3>
                        <p className="text-slate-400 mb-6">Ofrece transparencia y cierra más ventas.</p>
                        <div className="flex items-baseline mb-8">
                            <span className="text-4xl font-extrabold text-white">UF 2.5</span>
                            <span className="text-slate-400 ml-2">/ mes</span>
                        </div>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center text-slate-300">
                                <span className="mr-3 text-indigo-400">✓</span> Reportes ilimitados
                            </li>
                             <li className="flex items-center text-slate-300">
                                <span className="mr-3 text-indigo-400">✓</span> Marca blanca (Tu logo)
                            </li>
                             <li className="flex items-center text-slate-300">
                                <span className="mr-3 text-indigo-400">✓</span> API Access
                            </li>
                            <li className="flex items-center text-slate-300">
                                <span className="mr-3 text-indigo-400">✓</span> Soporte prioritario
                            </li>
                        </ul>
                        <button className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg hover:shadow-indigo-500/50">
                            Empezar Prueba Gratis
                        </button>
                    </div>
                </div>
             </div>
        </div>
      </section>

      {/* B2B / API Section */}
      <section className="bg-slate-900 py-20 text-white px-4">
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

      <footer className="bg-slate-950 py-12 border-t border-slate-900 text-center text-slate-500 text-sm">
        <div className="max-w-4xl mx-auto px-4">
             <p className="mb-4">&copy; {new Date().getFullYear()} HomeRisk AI. Inteligencia de Datos Inmobiliarios.</p>
             <div className="flex justify-center gap-6">
                 <a href="#" className="hover:text-white transition-colors">Términos</a>
                 <a href="#" className="hover:text-white transition-colors">Privacidad</a>
                 <a href="#" className="hover:text-white transition-colors">Contacto</a>
             </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
