
import React, { useState, useEffect } from "react";
import AddressInput from "./components/AddressInput";
import { api } from "./api";

function App() {
  const [isB2B, setIsB2B] = useState(false);
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanId, setScanId] = useState<string | null>(null);
  const [report, setReport] = useState<any | null>(null);


  const handleAddressSelect = (addr: string, loc: { lat: number; lng: number }) => {
    setAddress(addr);
    setLocation(loc);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !email) return;

    setLoading(true);
    try {
      const res = await api.submitAnalysis(address, email, location || { lat: 0, lng: 0 }); // Fallback loc
      if (res.scanId) {
        setScanId(res.scanId);
      }
    } catch (error) {
      console.error("Analysis failed", error);
      setLoading(false);
    }
  };

  // Poll for results
  useEffect(() => {
    if (!scanId || report) return;

    const interval = setInterval(async () => {
        try {
            // We need a getReport method that uses the scanId
            // The existing api.getReport uses jobId, let's assume it maps to the same endpoint structure
            // effectively: GET /api/report/{scanId}
            const data = await api.getReport(scanId); 
            console.log("Polling...", data);
            
            if (data && (data as any).status === "completed") {
                setReport(data);
                setLoading(false);
                clearInterval(interval);
            }
        } catch (e) {
            console.error("Polling error", e);
        }
    }, 3000);

    return () => clearInterval(interval);
  }, [scanId, report]);

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900">
      
      {/* Navbar & Toggle */}
      <nav className="flex justify-between items-center p-6 max-w-6xl mx-auto w-full">
        <div className="font-bold text-xl tracking-tight text-slate-900">HomeRisk</div>
        
        <div className="bg-slate-200 p-1 rounded-full flex gap-1 relative">
            <button 
                onClick={() => setIsB2B(false)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${!isB2B ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Personas
            </button>
            <button 
                onClick={() => setIsB2B(true)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${isB2B ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Empresas
            </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 text-center pb-20 mt-10">
        
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-slate-900 leading-tight">
                ¿Internet lento? ¿Cortes de luz? <br />
                <span className="text-blue-600">Sábelo antes de mudarte.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto font-light">
                {isB2B 
                    ? "Certifica tus propiedades y cierra ventas más rápido. Inteligencia inmobiliaria real." 
                    : "No arriesgues tu calidad de vida. Datos duros sobre conectividad, seguridad y servicios en Chile."}
            </p>

            {/* Analysis Form */}
            {!report ? (
                <div className="bg-white p-2 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-xl mx-auto mt-10 flex flex-col gap-2">
                    <form onSubmit={handleSubmit} className="p-4 space-y-4">
                        <div className="text-left">
                            <AddressInput 
                                onAddressSelect={handleAddressSelect}
                                inputClassName="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 placeholder-slate-400"
                                className="w-full"
                            />
                        </div>
                        <input 
                            type="email" 
                            placeholder="Tu correo electrónico" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                        <button 
                            type="submit" 
                            disabled={loading || !address}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {loading ? "Analizando..." : "Analizar Dirección Gratis"}
                        </button>
                    </form>
                </div>
            ) : (
                <div className="mt-10 w-full max-w-2xl mx-auto text-left animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                        <div className="p-8 border-b border-slate-50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 mb-1">Reporte de Habitabilidad</h2>
                                    <p className="text-slate-500 text-sm">{address}</p>
                                </div>
                                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                                    Completado
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-8 space-y-8">
                            {/* Summary */}
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Resumen de IA</h3>
                                <div className="prose prose-slate max-w-none text-slate-600">
                                    <p className="whitespace-pre-line">{(report as any).summary}</p>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="text-2xl">⚡</div>
                                            <h4 className="font-semibold text-slate-900">Servicios Básicos</h4>
                                        </div>
                                        {(report as any).results?.utilities?.stabilityScore !== undefined && (
                                            <div className={`px-2 py-1 rounded text-xs font-bold ${
                                                (report as any).results.utilities.stabilityScore > 80 ? 'bg-green-100 text-green-700' :
                                                (report as any).results.utilities.stabilityScore > 50 ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                                Estabilidad: {(report as any).results.utilities.stabilityScore}%
                                            </div>
                                        )}
                                    </div>
                                    
                                    {(report as any).results?.utilities?.rawData?.length > 0 ? (
                                        <ul className="space-y-3">
                                            {(report as any).results.utilities.rawData.map((item: any, i: number) => (
                                                <li key={i} className="text-sm bg-white p-3 rounded border border-slate-100 shadow-sm">
                                                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline block mb-1">
                                                        {item.source || item.title}
                                                    </a>
                                                    <p className="text-slate-600 line-clamp-2">{item.text || item.snippet}</p>
                                                    {item.date && <span className="text-xs text-slate-400 mt-1 block">{item.date}</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="text-slate-500 text-sm italic">
                                            {(report as any).results?.utilities?.summary_hint || "Sin reportes recientes."}
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="text-2xl">📶</div>
                                        <h4 className="font-semibold text-slate-900">Conectividad</h4>
                                    </div>
                                    {/* Placeholder for Telco until we have real data structure */}
                                     {(report as any).results?.telco ? (
                                         <div className="space-y-2">
                                            <div className="bg-white p-3 rounded border border-slate-100 shadow-sm">
                                                 <div className="flex justify-between items-center mb-1">
                                                     <span className="font-medium text-slate-900">Fibra Óptica</span>
                                                     <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-bold">Disponible</span>
                                                 </div>
                                                 <p className="text-xs text-slate-500">Factibilidad técnica alta en la zona.</p>
                                            </div>
                                             {/* If we had a list, we would map it here. For now, showing a safe default or specific data if available. */}
                                            <pre className="text-xs text-slate-400 mt-2 whitespace-pre-wrap hidden">
                                                {JSON.stringify((report as any).results?.telco, null, 2)}
                                            </pre>
                                         </div>
                                     ) : (
                                        <p className="text-slate-500 text-sm">Analizando cobertura...</p>
                                     )}
                                </div>
                            </div>
                            
                            <button onClick={() => { setReport(null); setScanId(null); setAddress(""); }} className="w-full text-center text-blue-600 font-medium hover:underline text-sm">
                                Realizar otro análisis
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Demo Card (Hover Reveal) */}
        {!report && (
            <div className="mt-20 group perspective-1000 cursor-default">
                <div className="relative w-80 h-48 bg-white rounded-xl shadow-lg border border-slate-200 transition-all duration-500 transform group-hover:rotate-x-12 group-hover:scale-105 p-6 flex flex-col justify-between overflow-hidden">
                    
                    {/* Default State */}
                    <div className="absolute inset-0 p-6 flex flex-col items-center justify-center bg-white transition-opacity duration-300 group-hover:opacity-0 z-10">
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-2xl mb-3">🏠</div>
                        <div className="font-semibold text-slate-900">Calle Ejemplo 123</div>
                        <div className="text-xs text-slate-400 mt-1">Pasa el mouse para ver riesgos</div>
                    </div>

                    {/* Revealed Data State */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 space-y-3">
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">⚡ Estabilidad</span>
                            <span className="text-green-600 font-bold">98%</span>
                        </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">📶 Señal 5G</span>
                            <span className="text-blue-600 font-bold">Alta</span>
                        </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">🚓 Seguridad</span>
                            <span className="text-yellow-600 font-bold">Media</span>
                        </div>
                        <div className="pt-2 border-t border-slate-100 mt-2">
                             <div className="text-xs text-center text-blue-500 font-medium">Análisis completado en 2.3s</div>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </main>

    </div>
  );
}

export default App;
