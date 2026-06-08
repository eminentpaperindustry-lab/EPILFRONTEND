import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { getMyWorklists, createWorklist, updateWorklist, bulkUploadWorklists, downloadMyWorklists } from "../api/services";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const FREQUENCIES = ["Daily", "Weekly", "Monthly", "Yearly"];
const WORKING_TIMES = ["10M","15M","20","30M", "45M", "60M", "90M", "120M", "150M", "180M", "210M", "240M", "300M"];
const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTH_DATES = Array.from({ length: 31 }, (_, i) => i + 1);
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const PAGE_SIZE = 15;


export default function WorkList() {
  const { user } = useContext(AuthContext);
  const [worklists, setWorklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [customWorkingTime, setCustomWorkingTime] = useState("");
  const [form, setForm] = useState({ 
    WorklistName: "", 
    Frequency: "Daily", 
    WorkingTime: "60M",
    TemplateLinkRemark: ""
  });
  const [schedule, setSchedule] = useState({ scheduleDays: "", scheduleDates: "" });
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [yearlyMonth, setYearlyMonth] = useState("January");
  const [yearlyDate, setYearlyDate] = useState(1);
  const [saving, setSaving] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkData, setBulkData] = useState([]);
  const [bulkResult, setBulkResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const bulkModalRef = useRef();
  const addModalRef = useRef();

  const loadWorklists = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyWorklists();
      setWorklists(res.data.data || []);
    } catch (err) { toast.error("Failed to load worklists"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadWorklists(); }, [loadWorklists]);

  const handleClickOutside = (e, modalRef, closeFn) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      closeFn();
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ WorklistName: "", Frequency: "Daily", WorkingTime: "60M", TemplateLinkRemark: "" });
    setSchedule({ scheduleDays: "", scheduleDates: "" });
    setSelectedDays([]);
    setSelectedDates([]);
    setYearlyMonth("January");
    setYearlyDate(1);
    setCustomWorkingTime("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setCustomWorkingTime("");
  };

  const openEdit = (wl) => {
    setEditing(wl);
    setForm({ 
      WorklistName: wl.WorklistName, 
      Frequency: wl.Frequency, 
      WorkingTime: wl.WorkingTime,
      TemplateLinkRemark: wl.TemplateLink || wl.Remark || ""
    });
    
    // Parse schedule for edit
    if (wl.Frequency === "Weekly" && wl.ScheduleDays) {
      const days = wl.ScheduleDays.split(",");
      setSelectedDays(days);
      setSchedule({ scheduleDays: wl.ScheduleDays, scheduleDates: "" });
    } else if (wl.Frequency === "Monthly" && wl.ScheduleDates) {
      const dates = wl.ScheduleDates.split(",").map(Number);
      setSelectedDates(dates);
      setSchedule({ scheduleDays: "", scheduleDates: wl.ScheduleDates });
    } else if (wl.Frequency === "Yearly" && wl.ScheduleDates) {
      const parts = wl.ScheduleDates.split(" ");
      if (parts.length === 2) {
        setYearlyMonth(parts[0]);
        setYearlyDate(parseInt(parts[1]));
        setSchedule({ scheduleDays: "", scheduleDates: wl.ScheduleDates });
      }
    } else {
      setSelectedDays([]);
      setSelectedDates([]);
      setSchedule({ scheduleDays: "", scheduleDates: "" });
    }
    
    setCustomWorkingTime("");
    setShowModal(true);
  };

  const handleWorkingTimeChange = (value) => {
    if (value === "custom") {
      const customValue = customWorkingTime.trim();
      if (customValue && !isNaN(parseInt(customValue))) {
        setForm({ ...form, WorkingTime: `${parseInt(customValue)}M` });
      }
    } else {
      setForm({ ...form, WorkingTime: value });
    }
  };

  const handleDayToggle = (day) => {
    let newDays;
    if (selectedDays.includes(day)) {
      newDays = selectedDays.filter(d => d !== day);
    } else {
      newDays = [...selectedDays, day];
    }
    setSelectedDays(newDays);
    setSchedule({ scheduleDays: newDays.join(","), scheduleDates: "" });
  };

  const handleDateToggle = (date) => {
    let newDates;
    if (selectedDates.includes(date)) {
      newDates = selectedDates.filter(d => d !== date);
    } else {
      newDates = [...selectedDates, date];
    }
    setSelectedDates(newDates);
    setSchedule({ scheduleDays: "", scheduleDates: newDates.join(",") });
  };

  const handleYearlyChange = (month, date) => {
    setYearlyMonth(month);
    setYearlyDate(date);
    setSchedule({ scheduleDays: "", scheduleDates: `${month} ${date}` });
  };

  const handleSave = async () => {
    if (!form.WorklistName.trim()) return toast.warn("Worklist Name is required");
    if (!form.WorkingTime) return toast.warn("Working Time is required");
    
    // Validate schedule based on frequency
    if (form.Frequency === "Weekly" && !schedule.scheduleDays) {
      return toast.warn("Please select at least one day for Weekly frequency");
    }
    if (form.Frequency === "Monthly" && !schedule.scheduleDates) {
      return toast.warn("Please select at least one date for Monthly frequency");
    }
    if (form.Frequency === "Yearly" && !schedule.scheduleDates) {
      return toast.warn("Please select month and date for Yearly frequency");
    }
    
    setSaving(true);
    try {
      const val = form.TemplateLinkRemark.trim();
      const isUrl = val.startsWith('http://') || val.startsWith('https://') || val.includes('docs.google.com');
      
      const payload = {
        WorklistName: form.WorklistName,
        Frequency: form.Frequency,
        WorkingTime: form.WorkingTime,
        TemplateLink: isUrl ? val : "",
        Remark: !isUrl ? val : "",
        ScheduleDays: schedule.scheduleDays,
        ScheduleDates: schedule.scheduleDates
      };
      
      if (editing) {
        await updateWorklist(editing.WorkListId, payload);
        toast.success("Worklist updated");
      } else {
        await createWorklist(payload);
        toast.success("Worklist created");
      }
      closeModal();
      loadWorklists();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save");
    } finally { setSaving(false); }
  };

  const downloadSampleBulkUpload = () => {
    const sampleData = [
      { WorklistName: "Daily Sales Report", Frequency: "Daily", WorkingTime: "60M", ScheduleDays: "", ScheduleDates: "", TemplateLinkRemark: "https://docs.google.com/spreadsheets/d/1ABC123" },
      { WorklistName: "Weekly Team Meeting", Frequency: "Weekly", WorkingTime: "90M", ScheduleDays: "Monday,Wednesday,Friday", ScheduleDates: "", TemplateLinkRemark: "Meeting agenda and minutes" },
      { WorklistName: "Monthly Review", Frequency: "Monthly", WorkingTime: "120M", ScheduleDays: "", ScheduleDates: "1,15,30", TemplateLinkRemark: "https://docs.google.com/spreadsheets/d/2XYZ456" },
      { WorklistName: "Annual Report", Frequency: "Yearly", WorkingTime: "180M", ScheduleDays: "", ScheduleDates: "December 25", TemplateLinkRemark: "https://docs.google.com/presentation/d/3QRS789" },
      { WorklistName: "Client Follow-up", Frequency: "Weekly", WorkingTime: "45M", ScheduleDays: "Tuesday,Thursday", ScheduleDates: "", TemplateLinkRemark: "Call all pending clients" }
    ];
    
    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws['!cols'] = [{wch:30}, {wch:12}, {wch:10}, {wch:25}, {wch:15}, {wch:50}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sample_Bulk_Upload");
    XLSX.writeFile(wb, `Sample_Bulk_Upload_Format.xlsx`);
    toast.success("✅ Sample Bulk Upload file downloaded!");
  };

  const downloadSamplePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(33, 33, 33);
    doc.text("📋 Sample Bulk Upload Format", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Follow this exact format for bulk upload:", 14, 30);
    
    const sampleData = [
      ["Daily Sales Report", "Daily", "60M", "", "", "https://docs.google.com/..."],
      ["Weekly Team Meeting", "Weekly", "90M", "Monday,Wednesday,Friday", "", "Meeting agenda"],
      ["Monthly Review", "Monthly", "120M", "", "1,15,30", "https://docs.google.com/..."],
      ["Annual Report", "Yearly", "180M", "", "December 25", "https://docs.google.com/..."],
    ];
    
    autoTable(doc, {
      startY: 40,
      head: [["WorklistName", "Frequency", "WorkingTime", "ScheduleDays", "ScheduleDates", "TemplateLinkRemark"]],
      body: sampleData,
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 7 },
    });
    
    doc.save(`Sample_Bulk_Upload_Format.pdf`);
    toast.success("✅ Sample PDF format downloaded!");
  };

  const downloadPDFReport = () => {
    if (worklists.length === 0) {
      toast.info("No data to download");
      return;
    }
    
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleString();
    
    doc.setFontSize(18);
    doc.setTextColor(33, 33, 33);
    doc.text("My WorkList Report", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Employee: ${user?.name}`, 14, 30);
    doc.text(`Generated: ${currentDate}`, 14, 36);
    doc.text(`Total Worklists: ${worklists.length}`, 14, 42);
    
    const tableData = worklists.map((wl, idx) => [
      idx + 1,
      wl.WorklistName,
      wl.Frequency,
      wl.ScheduleDays || wl.ScheduleDates || "-",
      wl.WorkingTime,
      wl.TemplateLink || wl.Remark || "-"
    ]);
    
    autoTable(doc, {
      startY: 50,
      head: [["#", "Worklist Name", "Frequency", "Schedule", "Time", "Link/Remark"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
    });
    
    doc.save(`MyWorkList_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF Report downloaded");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (rows.length < 2) return toast.warn("Empty file");

        const headers = rows[0].map(h => String(h).trim().toLowerCase());
        
        const nameIdx = headers.findIndex(h => h.includes("worklistname") || h.includes("name"));
        const freqIdx = headers.findIndex(h => h.includes("frequency") || h.includes("freq"));
        const timeIdx = headers.findIndex(h => h.includes("workingtime") || h.includes("time"));
        const daysIdx = headers.findIndex(h => h.includes("scheduledays") || h.includes("days"));
        const datesIdx = headers.findIndex(h => h.includes("scheduledates") || h.includes("dates"));
        const remarkIdx = headers.findIndex(h => h.includes("templatelinkremark") || h.includes("remark") || h.includes("link"));

        const parsed = rows.slice(1)
          .filter(r => r && r.some(c => c !== undefined && c !== null && String(c).trim() !== ""))
          .map((r, i) => {
            let workingTime = String(r[timeIdx] || "").trim();
            if (workingTime && !workingTime.toUpperCase().endsWith('M') && !isNaN(parseInt(workingTime))) {
              workingTime = `${parseInt(workingTime)}M`;
            }
            
            const remarkValue = remarkIdx !== -1 ? String(r[remarkIdx] || "").trim() : "";
            const isUrl = remarkValue.startsWith('http://') || remarkValue.startsWith('https://');
            
            return {
              row: i + 2,
              WorklistName: String(r[nameIdx] || "").trim(),
              Frequency: String(r[freqIdx] || "Daily").trim(),
              WorkingTime: workingTime,
              ScheduleDays: daysIdx !== -1 ? String(r[daysIdx] || "").trim() : "",
              ScheduleDates: datesIdx !== -1 ? String(r[datesIdx] || "").trim() : "",
              TemplateLink: isUrl ? remarkValue : "",
              Remark: !isUrl ? remarkValue : ""
            };
          })
          .filter(d => d.WorklistName && d.Frequency && d.WorkingTime);

        setBulkData(parsed);
        setBulkResult(null);
        toast.success(`${parsed.length} rows loaded!`);
      } catch (err) { 
        toast.error("Invalid file format. Please download sample file first."); 
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleBulkUpload = async () => {
    if (!bulkData.length) return toast.warn("No valid data to upload");
    setUploading(true);
    try {
      const res = await bulkUploadWorklists(bulkData);
      setBulkResult(res.data);
      toast.success(`Uploaded ${res.data?.summary?.created || 0} worklists`);
      loadWorklists();
    } catch (err) { 
      toast.error("Bulk upload failed. Please check format."); 
    }
    finally { setUploading(false); }
  };

  const handleDownload = async () => {
    try {
      const res = await downloadMyWorklists();
      const data = res.data.data || [];
      if (!data.length) return toast.info("No data to download");
      const ws = XLSX.utils.json_to_sheet(data.map(d => ({ 
        WorklistName: d.WorklistName, 
        Frequency: d.Frequency, 
        WorkingTime: d.WorkingTime,
        ScheduleDays: d.ScheduleDays || "",
        ScheduleDates: d.ScheduleDates || "",
        TemplateLinkRemark: d.TemplateLink || d.Remark || ""
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "MyWorkList");
      XLSX.writeFile(wb, `MyWorkList_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Excel Downloaded");
    } catch (err) { toast.error("Download failed"); }
  };

  const closeBulkModal = () => {
    setShowBulk(false);
    setBulkData([]);
    setBulkResult(null);
  };

  const getScheduleDisplay = (wl) => {
    if (wl.Frequency === "Weekly" && wl.ScheduleDays) {
      return `📅 ${wl.ScheduleDays}`;
    }
    if (wl.Frequency === "Monthly" && wl.ScheduleDates) {
      return `📅 Dates: ${wl.ScheduleDates}`;
    }
    if (wl.Frequency === "Yearly" && wl.ScheduleDates) {
      return `📅 Every ${wl.ScheduleDates}`;
    }
    return `📅 Every day`;
  };

  const filtered = worklists.filter((w) =>
    !search || w.WorklistName.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800">My WorkList</h1>
          <p className="text-xs text-slate-400 font-bold mt-1">Welcome, {user?.name} • {worklists.length} worklists</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700">+ Add</button>
          <button onClick={() => setShowBulk(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700">📤 Bulk Upload</button>
          <button onClick={handleDownload} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-700">📥 Download Excel</button>
          <button onClick={downloadPDFReport} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-700">📄 Download PDF</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <input type="text" placeholder="🔍 Search worklists..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>

      {loading ? (
        <div className="text-center py-20"><div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-300">
          <p className="text-slate-400 font-bold">No worklists found</p>
          <button onClick={openCreate} className="mt-4 text-blue-600 font-bold text-sm hover:underline">Create your first worklist</button>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {paginatedData.map((wl, idx) => (
              <div key={wl.WorkListId} className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-400">#{(page - 1) * PAGE_SIZE + idx + 1}</span>
                      <h3 className="font-black text-slate-800 text-base">{wl.WorklistName}</h3>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs font-medium text-slate-500">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${
                        wl.Frequency === "Daily" ? "bg-blue-100 text-blue-700" : 
                        wl.Frequency === "Weekly" ? "bg-amber-100 text-amber-700" : 
                        wl.Frequency === "Monthly" ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"
                      }`}>{wl.Frequency}</span>
                      <span>⏰ {wl.WorkingTime}</span>
                      <span className="text-green-600">{getScheduleDisplay(wl)}</span>
                    </div>
                    {(wl.TemplateLink || wl.Remark) && (
                      <div className="mt-3 pt-2 border-t border-slate-100">
                        {wl.TemplateLink && (
                          <div className="flex items-center gap-2 text-xs mb-1">
                            <span className="font-bold text-slate-500">📎 Template:</span>
                            <a href={wl.TemplateLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                              {wl.TemplateLink.length > 50 ? wl.TemplateLink.substring(0, 50) + "..." : wl.TemplateLink}
                            </a>
                          </div>
                        )}
                        {wl.Remark && (
                          <div className="flex items-start gap-2 text-xs">
                            <span className="font-bold text-slate-500">💬 Remark:</span>
                            <span className="text-slate-600 break-words">{wl.Remark}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(wl)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-700">✏️ Edit</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-4 mt-6">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 bg-slate-200 rounded-lg font-bold text-sm disabled:opacity-50">◀ Prev</button>
              <span className="text-sm font-bold text-slate-600 self-center">Page {page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-slate-200 rounded-lg font-bold text-sm disabled:opacity-50">Next ▶</button>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4" onClick={(e) => handleClickOutside(e, addModalRef, closeModal)}>
          <div ref={addModalRef} className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto relative">
            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            <h2 className="text-lg font-black text-slate-800 mb-4">{editing ? "✏️ Edit WorkList" : "➕ Add WorkList"}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Worklist Name *</label>
                <input type="text" value={form.WorklistName} onChange={(e) => setForm({ ...form, WorklistName: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Enter worklist name" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Frequency *</label>
                <select value={form.Frequency} onChange={(e) => {
                  setForm({ ...form, Frequency: e.target.value });
                  setSelectedDays([]);
                  setSelectedDates([]);
                  setSchedule({ scheduleDays: "", scheduleDates: "" });
                }} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              
              {/* Schedule Section based on Frequency */}
              {form.Frequency === "Weekly" && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Select Days *</label>
                  <div className="flex flex-wrap gap-2">
                    {WEEK_DAYS.map(day => (
                      <button key={day} type="button" onClick={() => handleDayToggle(day)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedDays.includes(day) ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                  {selectedDays.length > 0 && <p className="text-xs text-blue-600">✅ Selected: {selectedDays.join(", ")}</p>}
                </div>
              )}
              
              {form.Frequency === "Monthly" && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Select Dates *</label>
                  <div className="grid grid-cols-7 gap-1 max-h-32 overflow-y-auto p-2 border rounded-lg">
                    {MONTH_DATES.map(date => (
                      <button key={date} type="button" onClick={() => handleDateToggle(date)} className={`px-2 py-1 rounded text-xs font-bold transition-all ${selectedDates.includes(date) ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                        {date}
                      </button>
                    ))}
                  </div>
                  {selectedDates.length > 0 && <p className="text-xs text-purple-600">✅ Selected: {selectedDates.join(", ")}</p>}
                </div>
              )}
              
              {form.Frequency === "Yearly" && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Select Month and Date *</label>
                  <div className="flex gap-3">
                    <select value={yearlyMonth} onChange={(e) => handleYearlyChange(e.target.value, yearlyDate)} className="flex-1 border rounded-lg px-3 py-2 text-sm">
                      {MONTHS.map(month => <option key={month} value={month}>{month}</option>)}
                    </select>
                    <select value={yearlyDate} onChange={(e) => handleYearlyChange(yearlyMonth, parseInt(e.target.value))} className="w-24 border rounded-lg px-3 py-2 text-sm">
                      {MONTH_DATES.map(date => <option key={date} value={date}>{date}</option>)}
                    </select>
                  </div>
                  <p className="text-xs text-orange-600">✅ Every year on {yearlyMonth} {yearlyDate}</p>
                </div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Working Time (Minutes) *</label>
                <select value={WORKING_TIMES.includes(form.WorkingTime) ? form.WorkingTime : "custom"} onChange={(e) => handleWorkingTimeChange(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mb-2">
                  <option value="30M">30 Minutes</option><option value="45M">45 Minutes</option>
                  <option value="60M">60 Minutes (1 Hour)</option><option value="90M">90 Minutes (1.5 Hours)</option>
                  <option value="120M">120 Minutes (2 Hours)</option><option value="150M">150 Minutes (2.5 Hours)</option>
                  <option value="180M">180 Minutes (3 Hours)</option><option value="210M">210 Minutes (3.5 Hours)</option>
                  <option value="240M">240 Minutes (4 Hours)</option><option value="300M">300 Minutes (5 Hours)</option>
                  <option value="custom">Custom Minutes...</option>
                </select>
                {(!WORKING_TIMES.includes(form.WorkingTime) || form.WorkingTime === "custom") && (
                  <input type="number" placeholder="Enter minutes (e.g., 75)" value={customWorkingTime} onChange={(e) => { setCustomWorkingTime(e.target.value); if (e.target.value && !isNaN(parseInt(e.target.value))) { setForm({ ...form, WorkingTime: `${parseInt(e.target.value)}M` }); } }} className="w-full border rounded-lg px-3 py-2 text-sm" />
                )}
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">📎 Template Link / Remark</label>
                <textarea value={form.TemplateLinkRemark} onChange={(e) => setForm({ ...form, TemplateLinkRemark: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows="3" placeholder="Paste Google Sheet link OR add any remark/note..." />
                <p className="text-xs text-slate-400 mt-1">💡 If it starts with http:// or https:// it will be saved as Template Link, otherwise as Remark</p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeModal} className="px-4 py-2 bg-gray-200 rounded-lg font-bold text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 disabled:bg-blue-300">{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulk && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4" onClick={(e) => handleClickOutside(e, bulkModalRef, closeBulkModal)}>
          <div ref={bulkModalRef} className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl max-h-[85vh] overflow-y-auto relative">
            <button onClick={closeBulkModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            <h2 className="text-lg font-black text-slate-800 mb-4">📤 Bulk Upload WorkLists</h2>
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-blue-700 text-sm font-medium">👤 Uploading for: <strong>{user?.name}</strong></div>
            
            <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
              <p className="text-base font-bold text-amber-800 mb-2">📋 Sample Bulk Upload Format</p>
              <div className="flex gap-3 mb-3">
                <button onClick={downloadSampleBulkUpload} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex-1">📥 Sample Bulk Upload (Excel)</button>
                <button onClick={downloadSamplePDF} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex-1">📄 Sample Bulk Upload (PDF)</button>
              </div>
              <div className="text-xs text-amber-700">
                <p className="font-bold">Columns: WorklistName, Frequency, WorkingTime, ScheduleDays, ScheduleDates, TemplateLinkRemark</p>
                <p className="mt-1">• Weekly: ScheduleDays = "Monday,Wednesday,Friday"</p>
                <p>• Monthly: ScheduleDates = "1,15,30"</p>
                <p>• Yearly: ScheduleDates = "December 25"</p>
              </div>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center mb-4">
              <input type="file" accept=".xlsx,.csv" onChange={handleFileUpload} className="block w-full text-sm" />
            </div>

            {bulkData.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-bold">{bulkData.length} rows ready</p>
                <div className="max-h-40 overflow-y-auto text-xs border rounded-lg">
                  <table className="w-full"><tbody>
                    {bulkData.slice(0, 5).map((d, i) => (<tr key={i} className="border-t"><td className="p-2">{d.WorklistName}</td><td className="p-2">{d.Frequency}</td><td className="p-2">{d.WorkingTime}</td></tr>))}
                  </tbody></table>
                </div>
              </div>
            )}

            {bulkResult && (
              <div className="mb-4 p-3 bg-slate-50 rounded-lg text-xs">
                <p className="text-emerald-600">✅ Created: {bulkResult.summary?.created || 0}</p>
                <p className="text-amber-600">⏭️ Skipped: {bulkResult.summary?.skipped || 0}</p>
                <p className="text-rose-600">❌ Errors: {bulkResult.summary?.errors || 0}</p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={closeBulkModal} className="px-4 py-2 bg-gray-200 rounded-lg">Close</button>
              <button onClick={handleBulkUpload} disabled={uploading || !bulkData.length} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">{uploading ? "Uploading..." : `Upload ${bulkData.length} rows`}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}