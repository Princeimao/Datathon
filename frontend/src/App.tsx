import { useState } from "react";
import { Shield } from "lucide-react";
import { cn } from "./lib/utils";
import Dashboard from "./pages/Dashboard";
import CrimeMap from "./pages/CrimeMap";
import IntelligenceGraph from "./pages/IntelligenceGraph";
import TrendAnalysis from "./pages/TrendAnalysis";
import SimilarityWorkbench from "./pages/SimilarityWorkbench";
import BulkImport from "./pages/BulkImport";
import Footer from "./components/Footer";

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="flex min-h-screen bg-[#f5f7f5]">
      <Router>
        <aside className="fixed inset-y-0 left-0 z-40 flex flex-col border-r border-green-100 bg-white transition-all duration-300">
          <div className="flex items-center gap-3 border-b border-green-100 px-4 py-5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-green-700 text-white">
              <Shield size={20} />
            </div>
            <div>
              <h1 className="text-base font-semibold text-green-900 tracking-tight">
                KSP Intel
              </h1>
              <p className="text-[11px] text-green-600">
                Crime Intelligence Platform
              </p>
            </div>
          </div>

          <Sidebar activeTab={activeTab} />
        </aside>

        <main
          className={cn(
            "flex-1 min-w-0 transition-all duration-300 p-5",
            "ml-[260px]",
          )}
        >
          <Routes>
            <Route path="/" element={<Dashboard onNavigate={setActiveTab} />} />
            <Route path="/map" element={<CrimeMap />} />
            <Route path="/graph" element={<IntelligenceGraph />} />
            <Route path="/trend" element={<TrendAnalysis />} />
            <Route path="/similarity" element={<SimilarityWorkbench />} />
            <Route path="/import" element={<BulkImport />} />
          </Routes>
        </main>
      </Router>
    </div>
  );
}
