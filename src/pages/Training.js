import React, { useState, useEffect, useCallback } from "react";
import {
  getApprovedTrainings, getTrainingQuestionsForTest, getMyTrainings, startTraining, updateTrainingProgress, getUserProfile,
} from "../api/services";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const STATUS_BADGE = {
  Pending: "bg-amber-100 text-amber-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Completed: "bg-emerald-100 text-emerald-800",
};

const isUrl = (s) => /^https?:\/\//i.test(s || "");
const isYoutube = (u) => /(youtube\.com|youtu\.be)/i.test(u || "");
const isGoogle = (u) => /(drive\.google\.com|docs\.google\.com)/i.test(u || "");

const youtubeEmbed = (url) => {
  const m = url.match(/(?:v=|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : "";
};
const drivePreview = (url) => {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? `https://drive.google.com/file/d/${m[1]}/preview` : "";
};
const renderableVideoUrl = (video) => {
  if (!isUrl(video)) return "";
  if (isYoutube(video)) return youtubeEmbed(video) || video;
  if (isGoogle(video)) return drivePreview(video) || video;
  return video;
};

export default function Training() {
  const [templates, setTemplates] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // "list" | "learn"
  const [selected, setSelected] = useState(null);
  const [record, setRecord] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(1);
  const [contentTab, setContentTab] = useState("document"); // document | video | qa
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [qaResult, setQaResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [userDepartment, setUserDepartment] = useState("");

  // Tools
  const [tools, setTools] = useState({ documents: "", translite: "", summary: "" });
  const [savingTool, setSavingTool] = useState("");

  // ================= LOADERS =================
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Get user profile to know their department
      const profileRes = await getUserProfile();
      const userDept = profileRes.data?.department || "";
      setUserDepartment(userDept);
      
      const [tRes, mRes] = await Promise.all([getApprovedTrainings(userDept), getMyTrainings()]);
      setTemplates(tRes.data.templates || []);
      setRecords(mRes.data.records || []);
    } catch (err) { console.error(err); toast.error("Failed to load trainings"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const myRecordFor = (templateId) => records.find((r) => r.TemplateId === templateId);

  const syncRecord = (newRec) => {
    setRecord(newRec);
    const newRecords = records.map((r) => (r.TemplateId === newRec.TemplateId ? { ...r, ...newRec } : r));
    if (!records.some((r) => r.TemplateId === newRec.TemplateId)) newRecords.push(newRec);
    setRecords(newRecords);
    setTools({
      documents: newRec.ToolsDocuments || "",
      translite: newRec.ToolsTranslite || "",
      summary: newRec.ToolsSummary || "",
    });
  };

  // ================= ACTIONS =================
  const handleStart = async (template) => {
    setBusy(true);
    try {
      const res = await startTraining(template.TemplateId);
      // Ensure template has indices, fallback to empty array
      const templateWithIndices = { 
        ...template, 
        indices: template.indices || [] 
      };
      setSelected(templateWithIndices);
      syncRecord(res.data.record);
      setCurrentIndex(1);
      setContentTab(templateWithIndices.indices[0]?.Document ? "document" : "video");
      setAnswers({});
      setQaResult(res.data.record.Progress && res.data.record.Progress.qa ? res.data.record.Progress.qa : null);
      // Set view after selected to avoid race condition
      setView("learn");
      const qRes = await getTrainingQuestionsForTest(template.TemplateId);
      setQuestions(qRes.data.questions || []);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not start training");
    } finally { setBusy(false); }
  };

  const handleContinue = async (template) => {
    const rec = myRecordFor(template.TemplateId);
    // Ensure template has indices, fallback to empty array
    const templateWithIndices = { 
      ...template, 
      indices: template.indices || [] 
    };
    setSelected(templateWithIndices);
    syncRecord(rec);
    setCurrentIndex(1);
    setContentTab("document");
    setQaResult(rec.Progress && rec.Progress.qa ? rec.Progress.qa : null);
    // Set view after selected to avoid race condition
    setView("learn");
    try {
      const qRes = await getTrainingQuestionsForTest(template.TemplateId);
      setQuestions(qRes.data.questions || []);
    } catch (err) { console.error(err); }
  };

  const goBackToList = () => { setView("list"); setSelected(null); setRecord(null); setQuestions([]); };

  const markDoc = async () => {
    setBusy(true);
    try {
      const res = await updateTrainingProgress({ templateId: selected.TemplateId, docIndex: currentIndex });
      syncRecord(res.data.record);
      toast.success("Document marked as read ✅");
    } catch (err) { toast.error(err.response?.data?.error || "Update failed"); }
    finally { setBusy(false); }
  };

  const markVideo = async () => {
    setBusy(true);
    try {
      const res = await updateTrainingProgress({ templateId: selected.TemplateId, videoIndex: currentIndex });
      syncRecord(res.data.record);
      toast.success("Video marked as watched ✅");
    } catch (err) { toast.error(err.response?.data?.error || "Update failed"); }
    finally { setBusy(false); }
  };

  const submitQa = async () => {
    if (!questions.length) return toast.warn("No questions available");
    const unanswered = questions.filter((q) => !answers[q.QaId]);
    if (unanswered.length) return toast.warn("Please answer all questions");
    setBusy(true);
    try {
      const res = await updateTrainingProgress({ templateId: selected.TemplateId, qaAnswers: answers });
      syncRecord(res.data.record);
      setQaResult(res.data.record.Progress.qa);
      toast.success(`QA Test submitted ✅ Score: ${res.data.record.Progress.qa.correct}/${res.data.record.Progress.qa.total}`);
    } catch (err) { toast.error(err.response?.data?.error || "Submit failed"); }
    finally { setBusy(false); }
  };

  const saveTool = async (field) => {
    setSavingTool(field);
    try {
      const res = await updateTrainingProgress({
        templateId: selected.TemplateId,
        tools: { documents: tools.documents, translite: tools.translite, summary: tools.summary },
      });
      syncRecord(res.data.record);
      toast.success("Tool saved 💾");
    } catch (err) { toast.error("Save failed"); }
    finally { setSavingTool(""); }
  };

  // ================= DERIVED =================
  const progressOf = record ? (record.Progress && typeof record.Progress === "object" ? record.Progress : {}) : {};
  const totalIndexes = selected ? selected.indices.length : 0;
  const docsDone = (progressOf.docs || []).map(String);
  const vidsDone = (progressOf.vids || []).map(String);
  const indexLocked = (i) => {
    if (i <= 1) return false;
    const prev = String(i - 1);
    return !docsDone.includes(prev) || !vidsDone.includes(prev);
  };
  const allContentDone = totalIndexes > 0 && docsDone.length >= totalIndexes && vidsDone.length >= totalIndexes;
  const qaDone = !!(progressOf.qa && progressOf.qa.attempted);
  const allDone = allContentDone && qaDone;

  // ============================================================
  // RENDER - LIST VIEW
  // ============================================================
  // Separate templates into Common and Department categories
  const allCommonTemplates = templates.filter(t => t.Department === "Common");
  const allDeptTemplates = templates.filter(t => t.Department !== "Common");

  // Logic: 
  // - Common trainings HAMESHA dikhein (agar available hain)
  // - Department trainings SIRF tab dikhein jab Common COMPLETED ho ya Department STARTED ho
  const commonRecords = allCommonTemplates.map(t => myRecordFor(t.TemplateId)).filter(Boolean);
  const deptRecords = allDeptTemplates.map(t => myRecordFor(t.TemplateId)).filter(Boolean);

  const allCommonCompleted = allCommonTemplates.length > 0 && 
    allCommonTemplates.every(t => {
      const rec = myRecordFor(t.TemplateId);
      return rec && rec.Status === "Completed";
    });
  
  const anyDeptStarted = deptRecords.some(r => r && r.Status !== "Pending");
  const anyDeptCompleted = deptRecords.some(r => r && r.Status === "Completed");

  // Show department section only if Common is completed OR department is started
  const showDeptSection = allCommonTemplates.length === 0 || allCommonCompleted || anyDeptStarted;

  // Completed Common templates (for completed section)
  const completedCommon = allCommonTemplates.filter(t => {
    const rec = myRecordFor(t.TemplateId);
    return rec && rec.Status === "Completed";
  });

  // In Progress/Available Common templates
  const activeCommon = allCommonTemplates.filter(t => {
    const rec = myRecordFor(t.TemplateId);
    return !rec || rec.Status !== "Completed";
  });

  const renderTemplateCard = (t) => {
    const rec = myRecordFor(t.TemplateId);
    return (
      <div key={t.TemplateId} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-gray-800">{t.TemplateName || t.TemplateId}</h3>
            {rec ? (
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_BADGE[rec.Status] || STATUS_BADGE.Pending}`}>{rec.Status}</span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Pending</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            🏢 {t.Department} &nbsp;•&nbsp; 🆔 {t.TemplateId}
          </p>
        </div>
        <div className="px-4 py-3 text-sm text-gray-600 space-y-1">
          <p>📑 Indices: <b>{t.indices.length}</b></p>
          <p>❓ Questions: <b>{t.QuestionCount || 0}</b></p>
          {rec ? (
            <p>🎯 Score: <span className="font-black text-blue-700">{rec.TotalScore}/300</span>
              <span className="text-xs text-gray-400"> ({Math.min(100, Math.round(rec.TotalScore / 3))}%)</span></p>
          ) : (
            <p>🎯 Max Score: <b>{t.TemplateScore || 100}</b></p>
          )}
        </div>
        <div className="px-4 py-2">
          {rec && rec.Status === "In Progress" && (
            <div className="h-1 bg-blue-600 rounded-full mb-2" style={{ width: `${Math.min(100, Math.round(rec.TotalScore / 3))}%` }} />
          )}
        </div>
        <div className="px-4 py-2.5 border-t border-gray-200">
          {!rec ? (
            <button onClick={() => handleStart(t)} disabled={busy}
              className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-bold hover:bg-blue-700">🚀 Start Training</button>
          ) : rec.Status === "Completed" ? (
            <button onClick={() => handleContinue(t)}
              className="w-full bg-emerald-600 text-white rounded-lg py-2 text-sm font-bold hover:bg-emerald-700">✅ Completed - View</button>
          ) : (
            <button onClick={() => handleContinue(t)} disabled={busy}
              className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-bold hover:bg-indigo-700">▶ Continue Training</button>
          )}
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDER - LIST VIEW (Common First, Then Department)
  // ============================================================
  const renderList = () => {
    const showDeptSection = allCommonTemplates.length === 0 || allCommonCompleted || anyDeptStarted;
    
    return (
      <div className="space-y-4">
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl shadow p-5">
          <h2 className="text-lg font-black">🎓 Training Module</h2>
          <p className="text-sm mt-1 text-blue-100">Select a template and click <b>Start Training</b>. Complete indices one by one.</p>
        </div>

        {/* Department Info */}
        {userDepartment && (
          <div className="bg-purple-600 text-white rounded-xl shadow p-3">
            <p className="text-sm font-bold">👤 Department: <span className="font-black">{userDepartment}</span></p>
            {allCommonTemplates.length > 0 && !allCommonCompleted && (
              <p className="text-xs text-purple-200 mt-1">🌐 Complete Common Trainings first to unlock Department trainings</p>
            )}
            {allCommonTemplates.length > 0 && allCommonCompleted && (
              <p className="text-xs text-green-200 mt-1">✅ Common completed! Now you can do Department trainings.</p>
            )}
          </div>
        )}

        {loading ? <p className="text-center py-10">⏳ Loading...</p> : templates.length === 0 ? (
          <div className="text-center py-10 text-gray-500">📭 No approved trainings available yet!</div>
        ) : (
          <>
            {/* Common Section */}
            {allCommonTemplates.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">🌐</span>
                  <h3 className="text-lg font-black">Common Trainings</h3>
                  <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded-full">{allCommonTemplates.length}</span>
                  {allCommonCompleted && <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-full">✅ Done</span>}
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-purple-700">{completedCommon.length}/{allCommonTemplates.length} completed{!allCommonCompleted && ` — ${allCommonTemplates.length - completedCommon.length} remaining`}</p>
                </div>

                {activeCommon.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-500 mb-2">📝 Active:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeCommon.map(renderTemplateCard)}
                    </div>
                  </div>
                )}

                {completedCommon.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-2">✅ Completed:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {completedCommon.map(renderTemplateCard)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Department Section - Only if allowed */}
            {allDeptTemplates.length > 0 && showDeptSection && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">🏢</span>
                  <h3 className="text-lg font-black">{userDepartment || "Department"} Trainings</h3>
                  <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">{allDeptTemplates.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allDeptTemplates.map(renderTemplateCard)}
                </div>
              </div>
            )}

            {/* Department Locked */}
            {allDeptTemplates.length > 0 && !showDeptSection && (
              <div className="text-center py-8 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl">
                <p className="text-4xl mb-2">🔒</p>
                <p className="font-black text-gray-600">Department Trainings Locked</p>
                <p className="text-sm text-gray-500 mt-1">Complete {allCommonTemplates.length} Common Training(s) first</p>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // ============================================================
  // RENDER - LEARN VIEW
  // ============================================================
  const curIndex = (selected && selected.indices && selected.indices.length > 0)
    ? selected.indices[Math.min(currentIndex, totalIndexes) - 1] || selected.indices[0] || { IndexName: "Index 1", Document: "", Video: "" }
    : { IndexName: "Index 1", Document: "", Video: "" };
  const locked = indexLocked(currentIndex);

  const indexIcon = (i) => {
    const s = String(i);
    const d = docsDone.includes(s);
    const v = vidsDone.includes(s);
    if (d && v) return "✅";
    if (indexLocked(i)) return "🔒";
    return "📄";
  };

  const renderDocVideo = () => {
    if (contentTab === "document") {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h5 className="text-sm font-black text-gray-700 mb-2">📄 Document - {curIndex.IndexName}</h5>
          {curIndex.Document ? (
            isUrl(curIndex.Document) ? (
              <iframe src={curIndex.Document} title="Document" className="w-full h-80 border rounded-lg" />
            ) : (
              <div className="bg-gray-100 rounded-lg p-6 text-sm text-gray-600">
                📄 <b>{curIndex.Document}</b><br />
                <span className="text-xs text-gray-400">(Document link/name stored as text hai.)</span>
              </div>
            )
          ) : (
            <p className="text-sm text-gray-400">Koi document upload nahi hai.</p>
          )}
          <div className="flex gap-2 mt-3">
            {curIndex.Document && isUrl(curIndex.Document) && (
              <a href={curIndex.Document} target="_blank" rel="noreferrer"
                className="px-3 py-2 bg-gray-700 text-white rounded-lg text-xs font-bold">↗ Open in new tab</a>
            )}
            <button onClick={markDoc} disabled={busy || docsDone.includes(String(currentIndex))}
              className={`px-4 py-2 rounded-lg text-sm font-bold ${docsDone.includes(String(currentIndex)) ? "bg-emerald-100 text-emerald-700" : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300"}`}>
              {docsDone.includes(String(currentIndex)) ? "✅ Document Read" : "✅ Mark as Read"}
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h5 className="text-sm font-black text-gray-700 mb-2">🎬 Video - {curIndex.IndexName}</h5>
        {curIndex.Video ? (
          isUrl(curIndex.Video) ? (
            <iframe src={renderableVideoUrl(curIndex.Video)} title="Video" className="w-full h-80 border rounded-lg" allowFullScreen />
          ) : (
            <div className="bg-gray-100 rounded-lg p-6 text-sm text-gray-600">
              🎬 <b>{curIndex.Video}</b><br />
              <span className="text-xs text-gray-400">(Video link/name stored as text hai.)</span>
            </div>
          )
        ) : (
          <p className="text-sm text-gray-400">Koi video upload nahi hai.</p>
        )}
        <div className="flex gap-2 mt-3">
          {curIndex.Video && isUrl(curIndex.Video) && (
            <a href={curIndex.Video} target="_blank" rel="noreferrer"
              className="px-3 py-2 bg-gray-700 text-white rounded-lg text-xs font-bold">↗ Open in new tab</a>
          )}
          <button onClick={markVideo} disabled={busy || vidsDone.includes(String(currentIndex))}
            className={`px-4 py-2 rounded-lg text-sm font-bold ${vidsDone.includes(String(currentIndex)) ? "bg-emerald-100 text-emerald-700" : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300"}`}>
            {vidsDone.includes(String(currentIndex)) ? "✅ Video Watched" : "✅ Mark as Watched"}
          </button>
        </div>
      </div>
    );
  };

  const renderQaPanel = () => {
    if (!allContentDone) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mt-2 text-center">
          <p className="text-4xl mb-2">🔒</p>
          <h4 className="font-black text-amber-800">Q/A Test Locked</h4>
          <p className="text-sm text-amber-700 mt-2">
            Saare Indices complete karein ({docsDone.length}/{totalIndexes} docs, {vidsDone.length}/{totalIndexes} videos) tab Q/A Test khulega.
          </p>
        </div>
      );
    }
    if (questions.length === 0) {
      return (
        <div className="bg-emerald-100 border border-emerald-300 rounded-xl p-6 mt-2 text-center">
          <p className="text-3xl mb-2">🎉</p>
          <h4 className="font-black text-emerald-800">Training Completed!</h4>
          <p className="text-sm text-emerald-700 mt-1">Is training me koi Q/A nahi tha, isliye training complete ho gayi.</p>
        </div>
      );
    }
    if (qaResult && qaResult.attempted) {
      return (
        <div className="mt-3 p-5 bg-emerald-100 border border-emerald-300 rounded-xl">
          <p className="text-3xl mb-1">🏆</p>
          <p className="font-black text-emerald-800">Q/A Test Complete!</p>
          <p className="text-sm mt-2">Score: <b>{qaResult.correct}/{qaResult.total}</b> ({Math.round((qaResult.correct / qaResult.total) * 100)}%)</p>
          <p className="text-xs text-emerald-700 mt-1">Aap training bhi complete kar chuke hain ✅</p>
        </div>
      );
    }
    return (
      <div className="space-y-3 mt-2">
        <p className="text-xs text-gray-500">* Har question ka ek option select karke <b>Submit</b> karein.</p>
        {questions.map((q, qi) => (
          <div key={q.QaId} className="border border-gray-200 rounded-lg p-3">
            <p className="text-sm font-bold text-gray-700">Q{qi + 1}. {q.Question}</p>
            <div className="flex flex-col gap-1 mt-1">
              {["A", "B", "C", "D"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-100 rounded px-2 py-1">
                  <input type="radio" name={`qa-${q.QaId}`} checked={answers[q.QaId] === opt}
                    onChange={() => setAnswers({ ...answers, [q.QaId]: opt })} />
                  <span className={q[`Option${opt}`] ? "" : "text-gray-300"}>{opt}) {q[`Option${opt}`] || "(empty)"}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <button onClick={submitQa} disabled={busy}
          className="w-full bg-emerald-600 text-white rounded-lg py-2.5 font-black text-sm hover:bg-emerald-700 disabled:bg-emerald-300">
          {busy ? "Submitting..." : "✅ Submit Q/A Test"}
        </button>
      </div>
    );
  };

  const renderLeftNav = () => {
    // Defensive: return empty if selected is null
    if (!selected || !selected.indices) {
      return <div className="bg-white rounded-xl shadow p-4 text-center text-gray-500">Loading...</div>;
    }
    return (
      <div className="bg-white rounded-xl shadow p-4 space-y-1">
        {/* Department */}
        <div className="flex items-center gap-2 px-2 py-2 bg-gray-100 rounded-lg text-sm font-black text-gray-700">
          🏢 Department: <span className="text-blue-700">{selected.Department || "Common"}</span>
        </div>

        {/* Template Name */}
        <div className="flex items-center gap-2 px-2 py-2 bg-blue-50 rounded-lg text-xs font-bold text-blue-800">
          📄 {selected.TemplateName || selected.TemplateId}
        </div>

        {/* Overview / Start button */}
        <button onClick={() => { setCurrentIndex(1); setContentTab("document"); }}
          className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-gray-100 font-bold text-gray-600">
          📌 Overview / Start
        </button>

        {/* Indices list */}
        {selected.indices.map((idx, i) => (
          <button key={i} onClick={() => { if (!indexLocked(i + 1)) { setCurrentIndex(i + 1); setContentTab(idx.Document ? "document" : "video"); } }}
            className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between ${!indexLocked(i + 1) ? "hover:bg-gray-100" : "opacity-70 cursor-not-allowed"} ${currentIndex === i + 1 ? "bg-blue-100 font-bold text-blue-800" : ""}`}>
            <span>{indexIcon(i + 1)} Index {i + 1}: {idx.IndexName}</span>
          </button>
        ))}

        <div className="mt-2 pt-2 border-t border-gray-200 text-[10px] text-gray-400">
          LEARN FLOW: Document → Video → Q/A → Complete Index
        </div>
      </div>
    );
  };

  const renderTools = () => (
    <div className="bg-white rounded-xl shadow p-4 space-y-4">
      <h4 className="text-sm font-black text-gray-700">🧰 Tools</h4>
      <div>
        <p className="text-xs font-bold text-gray-600 mb-1">📝 Notes (Documents)</p>
        <textarea rows={2} className="w-full border rounded-lg px-2 py-1 text-xs" placeholder="Apne notes likhein..."
          value={tools.documents} onChange={(e) => setTools({ ...tools, documents: e.target.value })} />
        <button onClick={() => saveTool("documents")} disabled={savingTool === "documents"}
          className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs">{savingTool === "documents" ? "Saving..." : "💾 Save"}</button>
      </div>
      <div>
        <p className="text-xs font-bold text-gray-600 mb-1">📄 Transcript (Translite)</p>
        <textarea rows={2} className="w-full border rounded-lg px-2 py-1 text-xs" placeholder="Transcript yahan save karein..."
          value={tools.translite} onChange={(e) => setTools({ ...tools, translite: e.target.value })} />
        <button onClick={() => saveTool("translite")} disabled={savingTool === "translite"}
          className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs">{savingTool === "translite" ? "Saving..." : "💾 Save"}</button>
      </div>
      <div>
        <p className="text-xs font-bold text-gray-600 mb-1">📋 Summary</p>
        <textarea rows={2} className="w-full border rounded-lg px-2 py-1 text-xs" placeholder="Training summary likhein..."
          value={tools.summary} onChange={(e) => setTools({ ...tools, summary: e.target.value })} />
        <button onClick={() => saveTool("summary")} disabled={savingTool === "summary"}
          className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs">{savingTool === "summary" ? "Saving..." : "💾 Save"}</button>
      </div>
      <div className="border-t border-gray-200" />
      <p className="text-xs font-bold text-gray-600 mb-1">📂 Files - {curIndex.IndexName}</p>
      <div className="text-[11px] text-gray-500 space-y-1">
        <p>📄 Document: {curIndex.Document ? <a className="text-blue-600 underline" href={curIndex.Document} target="_blank" rel="noreferrer">Open</a> : "N/A"}</p>
        <p>🎬 Video: {curIndex.Video ? <a className="text-blue-600 underline" href={curIndex.Video} target="_blank" rel="noreferrer">Open</a> : "N/A"}</p>
      </div>
      <div className="border-t border-gray-200" />
      <p className="text-xs font-bold text-gray-600 mb-1">ℹ️ About Index</p>
      <p className="text-[11px] text-gray-500">#{currentIndex} — {curIndex.IndexName}<br />Department: {selected.Department}</p>
      <div className="border-t border-gray-200" />
      <p className="text-xs font-bold text-gray-600 mb-1">📊 Progress Summary</p>
      <div className="text-[11px] text-gray-500">
        <div className="flex justify-between"><span>📄 Docs</span><span>{docsDone.length}/{totalIndexes}</span></div>
        <div className="h-1 bg-blue-500 rounded" style={{ width: `${totalIndexes ? Math.round(docsDone.length / totalIndexes * 100) : 0}%` }} />
        <div className="flex justify-between mt-1"><span>🎬 Videos</span><span>{vidsDone.length}/{totalIndexes}</span></div>
        <div className="h-1 bg-blue-500 rounded" style={{ width: `${totalIndexes ? Math.round(vidsDone.length / totalIndexes * 100) : 0}%` }} />
        <div className="flex justify-between mt-1"><span>❓ Q/A</span><span>{qaDone ? `${qaResult ? qaResult.correct : 0}/${qaResult ? qaResult.total : 0}` : "Pending"}</span></div>
        <div className="h-1 bg-blue-500 rounded" style={{ width: `${qaDone ? 100 : 0}%` }} />
        <p className="mt-1 text-gray-600">🎯 Total: <b className="text-blue-700">{record ? record.TotalScore : 0}/300</b></p>
      </div>
      <div className="border-t border-gray-200" />
      <p className="text-xs font-bold text-gray-600 mb-1">👀 View Tracking</p>
      <p className="text-[11px] text-gray-500">Last update: {record && record.LastUpdate ? record.LastUpdate : "-"}</p>
      <p className="text-[11px] text-gray-500">Status: <b>{record ? record.Status : "Pending"}</b></p>
    </div>
  );

  const renderLearn = () => {
    // Defensive: return loading if selected is null
    if (!selected || !selected.indices) {
      return (
        <div className="space-y-3">
          <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">
            Loading training data...
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-3">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl shadow px-4 py-3">
        <div>
          <button onClick={goBackToList} className="text-xs text-blue-600 underline">← Back to Trainings</button>
          <h2 className="text-lg font-black text-gray-800 mt-1">{selected.TemplateName}</h2>
          <p className="text-xs text-gray-500">🆔 {selected.TemplateId} • 🏢 {selected.Department} • 📑 {totalIndexes} Indices • ❓ {questions.length} Questions</p>
        </div>
        <div className="text-right">
          <span className={`text-xs px-2 py-1 rounded-full ${STATUS_BADGE[record ? record.Status : "Pending"] || STATUS_BADGE.Pending}`}>{record ? record.Status : "Pending"}</span>
          <p className="text-xs text-gray-500 mt-1">🎯 Score: <b className="text-blue-700">{record ? record.TotalScore : 0}/300</b> ({record ? Math.min(100, Math.round(record.TotalScore / 3)) : 0}%)</p>
        </div>
      </div>

      {/* 3 column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: Training Navigation */}
        <div className="lg:col-span-3">{renderLeftNav()}</div>

        {/* CENTER: Index header + content + prev/next */}
        <div className="lg:col-span-6">
          <div className="bg-white rounded-xl shadow px-4 py-3 mb-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-black text-gray-800">📑 Index {currentIndex}: {curIndex.IndexName}</span>
              {docsDone.includes(String(currentIndex)) ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">📄 Done</span> : null}
              {vidsDone.includes(String(currentIndex)) ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">🎬 Done</span> : null}
            </div>
            <div className="flex gap-1 mt-2">
              {["document", "video", "qa"].map((t) => (
                <button key={t} onClick={() => setContentTab(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${contentTab === t ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>
                  {t === "document" ? "📄 Document" : t === "video" ? "🎬 Video" : "❓ Q/A"}
                </button>
              ))}
            </div>
          </div>

          {locked ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
              <p className="text-4xl mb-2">🔒</p>
              <h4 className="font-black text-amber-800">Index Locked</h4>
              <p className="text-sm text-amber-700 mt-2">Pehle <b>Index {currentIndex - 1}</b> complete karein (Document + Video) tab yeh index khulega.</p>
            </div>
          ) : contentTab === "qa" ? renderQaPanel() : renderDocVideo()}

          {/* Previous / Next */}
          <div className="flex items-center justify-between gap-3 mt-3 bg-white rounded-xl shadow px-4 py-2.5">
            <button onClick={() => { if (currentIndex > 1) { setCurrentIndex(currentIndex - 1); setContentTab(selected.indices[currentIndex - 2].Document ? "document" : "video"); } }}
              disabled={currentIndex <= 1} className="px-4 py-2 bg-gray-200 rounded-lg text-sm font-bold text-gray-700 disabled:opacity-40">← Previous</button>
            {allDone ? (
              <button onClick={goBackToList} className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold">🏆 Training Completed - Back</button>
            ) : currentIndex < totalIndexes ? (
              <button onClick={() => { if (docsDone.includes(String(currentIndex)) && vidsDone.includes(String(currentIndex)) && !indexLocked(currentIndex + 1)) { setCurrentIndex(currentIndex + 1); setContentTab(selected.indices[currentIndex] && selected.indices[currentIndex].Document ? "document" : "video"); } else if (!(docsDone.includes(String(currentIndex)) && vidsDone.includes(String(currentIndex)))) { toast.warn(`Pehle Index ${currentIndex} ke Document aur Video complete karein`); } }}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">Next Index →</button>
            ) : allContentDone ? (
              <button onClick={() => setContentTab("qa")} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold">❓ Take Q/A Test</button>
            ) : (
              <button disabled className="px-5 py-2 bg-gray-300 text-gray-600 rounded-lg text-sm font-bold">Last Index ✅</button>
            )}
          </div>

          {allDone && (
            <div className="mt-3 p-4 bg-emerald-100 border border-emerald-300 rounded-xl text-center">
              <p className="text-2xl mb-1">🎉</p>
              <p className="font-black text-emerald-800">Congratulations! Aapne training complete kar li hai.</p>
              <p className="text-sm text-emerald-700 mt-1">Final Score: {record ? record.TotalScore : 0}/300 • Status: {record ? record.Status : ""} • End Date: {record ? record.EndDate : ""}</p>
            </div>
          )}
        </div>

        {/* RIGHT: Tools */}
        <div className="lg:col-span-3">{renderTools()}</div>
      </div>
    </div>
  );
  };
  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <ToastContainer position="top-right" autoClose={3000} />
      {view === "list" ? renderList() : (selected ? renderLearn() : renderList())}
    </div>
  );
  }