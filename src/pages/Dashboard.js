import React, { useState, useEffect, useContext } from "react";
import axios from "../api/axios";
import { AuthContext } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useContext(AuthContext);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [weekRange, setWeekRange] = useState({ start: "", end: "" });

  const [delData, setDelData] = useState({});
  const [checkData, setCheckData] = useState({});
  const [htAssigned, setHtAssigned] = useState({});
  const [htCreated, setHtCreated] = useState({});
  const [stAssigned, setStAssigned] = useState({});
  const [stCreated, setStCreated] = useState({});

  const loadData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setIsUpdating(true);

      const params = { month: selectedMonth, week: selectedWeek };
      const [delRes, clRes, htRes, stRes] = await Promise.all([
        axios.get("/delegations/filter", { params }),
        axios.get("/checklist/filter", { params }),
        axios.get("/helpTickets/filter", { params }),
        axios.get("/support-tickets/filter", { params }) 
      ]);

      setDelData(delRes.data || {});
      setCheckData(clRes.data || {});
      setWeekRange({ 
        start: delRes.data?.weekStart || "N/A", 
        end: delRes.data?.weekEnd || "N/A" 
      });
      setHtAssigned(htRes.data?.assigned || {});
      setHtCreated(htRes.data?.created || {});
      setStAssigned(stRes.data?.assigned || {});
      setStCreated(stRes.data?.created || {});

      setLoading(false);
      setIsUpdating(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
      setIsUpdating(false);
    }
  };

  useEffect(() => { loadData(true); }, []);
  useEffect(() => { loadData(false); }, [selectedMonth, selectedWeek]);

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="mt-4 text-xs font-black text-slate-500 tracking-[0.3em]">SYNCHRONIZING...</p>
    </div>
  );

  return (
    <div className="h-screen w-full flex flex-col bg-[#f8fafc] overflow-hidden font-sans">
      
      {/* --- 1. STRICT FULL-WIDTH HEADER --- */}
      <div className="w-full bg-[#0f172a] text-white px-6 py-3 border-b border-slate-800 flex-shrink-0">
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight uppercase italic leading-none">Dashboard</h1>
              <p className="text-[10px] font-bold text-blue-400 mt-1 uppercase tracking-widest">{weekRange.start} — {weekRange.end}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 p-1 rounded-xl">
             <div className="flex items-center px-4 border-r border-slate-700">
                <span className="text-[10px] font-black text-slate-500 uppercase mr-3">Month</span>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-transparent text-sm font-black outline-none cursor-pointer">
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i + 1} className="text-black">{new Date(0, i).toLocaleString("default", { month: "long" })}</option>
                  ))}
                </select>
             </div>
             <div className="flex items-center px-4">
                <span className="text-[10px] font-black text-slate-500 uppercase mr-3">Week</span>
                <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value === "all" ? "all" : Number(e.target.value))} className="bg-transparent text-sm font-black outline-none cursor-pointer">
                  <option value="all" className="text-black">All Weeks</option>
                  {[1, 2, 3, 4, 5].map(w => <option key={w} value={w} className="text-black">Week {w}</option>)}
                </select>
             </div>
          </div>
        </div>
      </div>

      {/* --- 2. FULL WIDTH CONTENT AREA --- */}
      <div className="flex-1 overflow-y-auto w-full relative">
        
        {/* Loading Overlay for Filters */}
        {isUpdating && (
          <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-sm flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        <div className="w-full p-6 space-y-6">
          
          <Section title="Delegation Summary" accent="bg-blue-600">
            <Card title="Total Work" value={delData.totalWork} theme="blue" />
           
            <Card title="Completed" value={delData.completedTaskCount} theme="emerald" />
            <Card title="On Time" value={delData.onTimeCount} theme="cyan" />
             <Card title="Pending" value={delData.pendingTaskCount} theme="amber" />
            <Card title="Pending %" value={`${delData.pendingTaskPercentage}%`} theme="indigo" />
            <Card title="Delayed %" value={`${delData.delayedWorkPercentage}%`} theme="rose" />
          </Section>

          <Section title="Checklist Summary" accent="bg-emerald-600">
            <Card title="Total Tasks" value={checkData.totalTasks} theme="blue" />
            
            <Card title="Completed" value={checkData.completedTasks} theme="emerald" />
            <Card title="On Time" value={checkData.onTimeTasks} theme="cyan" />
            <Card title="Pending" value={checkData.pendingTasks} theme="amber" />
            <Card title="Pending %" value={`${checkData.pendingPercentage}%`} theme="indigo" />
            <Card title="Delayed %" value={`${checkData.delayedPercentage}%`} theme="rose" />
          </Section>

          {/* HELP TICKETS - COMPACT BUT FULL WIDTH */}
          <Section title="Help Ticket Analytics" accent="bg-indigo-600">
            <div className="col-span-full border-b border-slate-100 pb-2 mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Assigned Tickets</span>
            </div>
            <Card title="Total" value={htAssigned.assignedTotalTicket} theme="slate" />
            
            <Card title="Completed" value={htAssigned.assignedCompletedTicket} theme="emerald" />
            <Card title="On Time" value={htAssigned.assignedOnTime} theme="cyan" />
            <Card title="Pending" value={htAssigned.assignedPendingTicket} theme="amber" />
            <Card title="Pending %" value={`${htAssigned.assignedPendingPercentage}%`} theme="indigo" />
            <Card title="Delay %" value={`${htAssigned.assignedDelayPercentage}%`} theme="rose" />

            <div className="col-span-full border-b border-slate-100 pb-2 mb-2 mt-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Created Tickets</span>
            </div>
            <Card title="Total" value={htCreated.createdTotalTicket} theme="slate" />
          
            <Card title="Completed" value={htCreated.createdCompletedTicket} theme="emerald" />
            <Card title="On Time" value={htCreated.createdOnTime} theme="cyan" />
              <Card title="Pending" value={htCreated.createdPendingTicket} theme="amber" />
            <Card title="Pending %" value={`${htCreated.createdPendingPercentage}%`} theme="indigo" />
            <Card title="Delay %" value={`${htCreated.createdDelayPercentage}%`} theme="rose" />
          </Section>

          {/* SUPPORT TICKETS - COMPACT BUT FULL WIDTH */}
          <Section title="Support Ticket Analytics" accent="bg-rose-600">
             <div className="col-span-full border-b border-slate-100 pb-2 mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Assigned Tickets</span>
            </div>
            <Card title="Total" value={stAssigned.assignedTotalTicket} theme="slate" />
           
            <Card title="Completed" value={stAssigned.assignedCompletedTicket} theme="emerald" />
            <Card title="On Time" value={stAssigned.assignedOnTime} theme="cyan" />
             <Card title="Pending" value={stAssigned.assignedPendingTicket} theme="amber" />
            <Card title="Pending %" value={`${stAssigned.assignedPendingPercentage}%`} theme="indigo" />
            <Card title="Delay %" value={`${stAssigned.assignedDelayPercentage}%`} theme="rose" />

            <div className="col-span-full border-b border-slate-100 pb-2 mb-2 mt-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Created Tickets</span>
            </div>
            <Card title="Total" value={stCreated.createdTotalTicket} theme="slate" />
           
            <Card title="Completed" value={stCreated.createdCompletedTicket} theme="emerald" />
            <Card title="On Time" value={stCreated.createdOnTime} theme="cyan" />
             <Card title="Pending" value={stCreated.createdPendingTicket} theme="amber" />
            <Card title="Pending %" value={`${stCreated.createdPendingPercentage}%`} theme="indigo" />
            <Card title="Delay %" value={`${stCreated.createdDelayPercentage}%`} theme="rose" />
          </Section>

        </div>
      </div>
    </div>
  );
}

// --- FULL WIDTH STYLED COMPONENTS ---

function Section({ title, accent, children }) {
  return (
    <div className="w-full bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
      <div className="bg-slate-50/50 px-6 py-3 border-b border-slate-100 flex items-center gap-3">
        <div className={`w-1 h-5 ${accent} rounded-full`}></div>
        <h2 className="text-xs font-black text-slate-700 uppercase tracking-widest">{title}</h2>
      </div>
      <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {children}
      </div>
    </div>
  );
}

const THEMES = {
  blue: "bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700",
  amber: "bg-amber-500 text-white shadow-amber-100 hover:bg-amber-600",
  emerald: "bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700",
  cyan: "bg-cyan-600 text-white shadow-cyan-100 hover:bg-cyan-700",
  indigo: "bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700",
  rose: "bg-rose-600 text-white shadow-rose-100 hover:bg-rose-700",
  slate: "bg-slate-700 text-white shadow-slate-100 hover:bg-slate-800"
};

function Card({ title, value, theme }) {
  return (
    <div className={`${THEMES[theme]} p-5 rounded-xl flex flex-col items-center justify-center transition-all duration-300 hover:scale-[1.03] hover:shadow-xl cursor-default group`}>
      <h3 className="text-[9px] font-black uppercase tracking-tighter mb-2 opacity-80 group-hover:opacity-100 text-center leading-none">
        {title}
      </h3>
      <p className="text-2xl font-black leading-none drop-shadow-md">
        {value || 0}
      </p>
    </div>
  );
}