import React, { useEffect, useState, useContext } from "react";
import axios from "../api/axios";
import { AuthContext } from "../context/AuthContext";

export default function Delegation() {
  const { user } = useContext(AuthContext);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false); // Controls visibility of Create Task modal
  const [activeTab, setActiveTab] = useState("pending");

  const [loadingTaskId, setLoadingTaskId] = useState(null);
  const [loadingShiftBtn, setLoadingShiftBtn] = useState(false);

  const [shiftTask, setShiftTask] = useState(null);
  const [shiftDate, setShiftDate] = useState("");

  const [form, setForm] = useState({
    TaskName: "",
    Deadline: "",
    Priority: "High",
    Notes: "",
  });

  // -----------------------
  // Universal Date Formatter
  // -----------------------
  // const normalizeDate = (date) => {
  //   if (!date) return "";
  //   const d = new Date(date);
  //   if (isNaN(d)) return ""; // Invalid date
  //   const yyyy = d.getFullYear();
  //   const mm = String(d.getMonth() + 1).padStart(2, "0");
  //   const dd = String(d.getDate()).padStart(2, "0");
  //   return `${dd}-${mm}-${yyyy}`;
  // };


function formatDateDDMMYYYYHHMMSS(date = new Date()) {
  // Convert to IST (UTC + 5:30)
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(utc + istOffset);

  const dd = String(istDate.getDate()).padStart(2, "0");
  const mm = String(istDate.getMonth() + 1).padStart(2, "0");
  const yyyy = istDate.getFullYear();
  const hh = String(istDate.getHours()).padStart(2, "0");
  const min = String(istDate.getMinutes()).padStart(2, "0");
  const ss = String(istDate.getSeconds()).padStart(2, "0");

  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
}
  
const normalizeDate = (date) => {
  if (!date) return "";

  // Convert to Date object (current date if date is empty)
  const d = new Date(date || Date.now()); // If no date is passed, use current date/time.
  if (isNaN(d)) return ""; // Invalid date

  // Adjust time to IST (UTC +5:30)
  const IST_OFFSET = 5.5 * 60; // IST is UTC+5:30, so offset in minutes is 330 minutes
  
  // Get the UTC time and convert it to IST
  const utcMinutes = d.getMinutes() + d.getHours() * 60 + d.getUTCMinutes() - d.getMinutes();
  const adjustedMinutes = utcMinutes + IST_OFFSET; // Apply IST offset
  const adjustedDate = new Date(d.setMinutes(adjustedMinutes));

  const yyyy = adjustedDate.getFullYear();
  const mm = String(adjustedDate.getMonth() + 1).padStart(2, "0");
  const dd = String(adjustedDate.getDate()).padStart(2, "0");
  const hours = String(adjustedDate.getHours()).padStart(2, "0");
  const minutes = String(adjustedDate.getMinutes()).padStart(2, "0");
  const seconds = String(adjustedDate.getSeconds()).padStart(2, "0");

  // return `${dd}/${mm}/${yyyy} ${hours}:${minutes}:${seconds}`;

  return `${dd}/${mm}/${yyyy}`
};




  useEffect(() => {
    async function loadTasks() {
      try {
        const res = await axios.get("/delegations/");
        const formattedTasks = res.data.map((t) => ({
          ...t,
          CreatedDate: t.CreatedDate,
          Deadline: normalizeDate(t.Deadline),
          Revision1: normalizeDate(t.Revision1),
          Revision2: normalizeDate(t.Revision2),
          FinalDate: t.FinalDate,
        }));
        setTasks(formattedTasks);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    if (user) loadTasks();
  }, [user]);
  
  const createTask = async () => {
    if (!form.TaskName || !form.Deadline) return;

    setLoadingTaskId("create");
    try {
      const res = await axios.post("/delegations/", {
    TaskName:form.TaskName,
    Deadline:normalizeDate(form.Deadline),
    Priority: "High",
    Notes: "",
  });

      setTasks([
        {
          TaskID: res.data.TaskID,
          Name: user.name,
          TaskName: form.TaskName,
          Deadline: normalizeDate(form.Deadline),
          CreatedDate:formatDateDDMMYYYYHHMMSS(),
          Revision1: "",
          Revision2: "",
          FinalDate: "",
          Revisions: 0,
          Priority: form.Priority,
          Status: "Pending",
          Followup: form.Notes,
          Taskcompletedapproval: "",
        },
        ...tasks,
      ]);

      setShowCreate(false); // Close modal after task creation
      setForm({ TaskName: "", Deadline: "", Priority: "", Notes: "" });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTaskId(null);
    }
  };

  const handleDone = async (taskID) => {
    setLoadingTaskId(taskID);
    try {
      await axios.patch(`/delegations/done/${taskID}`);
      const today = normalizeDate(new Date());

      setTasks(
        tasks.map((t) =>
          t.TaskID === taskID
            ? {
                ...t,
                Status: "Completed",
                FinalDate: formatDateDDMMYYYYHHMMSS(),
                Taskcompletedapproval: "",
              }
            : t
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTaskId(null);
    }
  };

  const openShiftPicker = (task) => {
    setShiftTask(task);
    setShiftDate("");
    setForm({...form,Deadline:""})
  };

  const confirmShift = async () => {
    if (!form.Deadline) return;

    setLoadingShiftBtn(true);
    const revisionField = shiftTask.Revisions === 0 ? "Revision1" : "Revision2";

    try {
      await axios.patch(`/delegations/shift/${shiftTask.TaskID}`, {
        newDeadline: normalizeDate(form.Deadline),
        revisionField,
      });

      setTasks(
        tasks.map((t) =>
          t.TaskID === shiftTask.TaskID
            ? {
                ...t,
                [revisionField]: normalizeDate(form.Deadline),
                Deadline: normalizeDate(form.Deadline),
                Revisions: t.Revisions + 1,
                Status: "Shifted",
              }
            : t
        )
      );

      setShiftTask(null);
      setShiftDate("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingShiftBtn(false);
    }
  };

  const filteredTasks =
    activeTab === "pending"
      ? tasks.filter(
          (t) =>
            (t.Status === "Pending" || t.Status === "Shifted") &&
            !t.FinalDate &&
            (t.Taskcompletedapproval === "" || t.Taskcompletedapproval === "Pending") &&
            t.Taskcompletedapproval !== "Approved"
        )
      : tasks.filter(
          (t) =>
            t.Status === "Completed" &&
            t.FinalDate &&
            (t.Taskcompletedapproval === "" || t.Taskcompletedapproval === "Pending") &&
            t.Taskcompletedapproval !== "Approved"
        );

  if (loading) return <div className="p-6 text-lg">Loading...</div>;
  
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl md:text-2xl font-bold">Delegation Tasks</h2>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded shadow text-sm md:text-base"
          onClick={() => setShowCreate(true)} // Open modal on click
        >
          + New Task
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-6">
        <button
          className={`px-3 py-2 rounded text-sm md:text-base ${
            activeTab === "pending" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
          }`}
          onClick={() => setActiveTab("pending")}
        >
          Pending / Shifted
        </button>
        <button
          className={`px-3 py-2 rounded text-sm md:text-base ${
            activeTab === "done" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700"
          }`}
          onClick={() => setActiveTab("done")}
        >
          Completed
        </button>
      </div>

      {/* Create Task Modal */}
      {showCreate && (
        <div className="bg-white p-4 rounded shadow mb-6 border">
          <h3 className="text-lg font-semibold mb-3">Create New Task</h3>
          <div className="grid gap-3">
            
      <div>
  <label htmlFor="taskName" className="block text-sm font-semibold mb-2">
    Task Name
  </label>
  <input
    id="taskName"
    className="w-full border p-2 rounded"
    placeholder="Task Name"
    value={form.TaskName}
    onChange={(e) => setForm({ ...form, TaskName: e.target.value })}
  />
</div>

<div className="mt-4">
  <label htmlFor="planDate" className="block text-sm font-semibold mb-2">
    Plan Date
  </label>
  <input
    id="planDate"
    type="date"
    className="w-full border p-2 rounded"
    value={form.Deadline}
    onChange={(e) => setForm({ ...form, Deadline: e.target.value })}
  />
</div>

            {/* <select
              className="w-full border p-2 rounded"
              value={form.Priority}
              onChange={(e) => setForm({ ...form, Priority: e.target.value })}
            >
              <option value="">Priority</option>
              <option value="Low">Low</option>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
            </select>
            <textarea
              className="w-full border p-2 rounded"
              placeholder="Notes"
              value={form.Notes}
              onChange={(e) => setForm({ ...form, Notes: e.target.value })}
            /> */}
            <div className="flex gap-3">
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded"
                onClick={createTask}
                disabled={loadingTaskId === "create"}
              >
                {loadingTaskId === "create" ? "Saving..." : "Save"}
              </button>
              <button
                className="px-4 py-2 rounded border"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="grid gap-4">
        {filteredTasks.map((task) => (
          <div key={task.TaskID} className="p-4 bg-white rounded shadow border">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-lg">{task.TaskName}</div>
                <div className="text-sm text-gray-600">
                  Created: {task.CreatedDate || "—"} <br />
                  Deadline: {task.Deadline || "—"} <br />
                  {/* {task.Revision1 && `Rev1: ${task.Revision1} | `}
                  {task.Revision2 && `Rev2: ${task.Revision2} | `} */}
                  Completed: {task.FinalDate || "—"}
                </div>
                <div className="text-sm text-gray-600">
                  Task Revision: {task.Revisions||"0"}
                </div>
                {task.Status === "Completed" && (
                  <div className="text-sm text-red-600">Need To Approve</div>
                )}
              </div>
              <span
                className={`px-2 py-1 rounded text-sm ${
                  task.Status === "Completed"
                    ? "bg-green-100 text-green-700"
                    : task.Status === "Shifted"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {task.Status}
              </span>
            </div>

            {/* Buttons only in pending tab */}
            <div className="flex gap-3 mt-3 flex-wrap">
              {activeTab === "pending" && !task.FinalDate && (
                <>
                  <button
                    onClick={() => handleDone(task.TaskID)}
                    className="bg-green-600 text-white px-3 py-1 rounded"
                    disabled={loadingTaskId === task.TaskID}
                  >
                    {loadingTaskId === task.TaskID ? "Processing..." : "Mark Done"}
                  </button>

                  <button
                    onClick={() => openShiftPicker(task)}
                    className="bg-yellow-600 text-white px-3 py-1 rounded"
                    // disabled={task.Revisions >= 2}
                  >
                    {"Shift Deadline"}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Shift Modal */}
      {shiftTask && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded shadow w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-3">
              Shift Deadline for {shiftTask.TaskName}
            </h3>
            <input
              type="date"
              className="w-full border p-2 rounded mb-3"
              value={form.Deadline}
              // onChange={(e) => setShiftDate(e.target.value)}
              onChange={(e) => setForm({ ...form, Deadline: e.target.value })}


            />
            <div className="flex gap-3 justify-end">
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded"
                onClick={confirmShift}
                disabled={loadingShiftBtn}
              >
                {loadingShiftBtn ? "Processing..." : "Confirm"}
              </button>
              <button
                className="px-4 py-2 rounded border"
                onClick={() => setShiftTask(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredTasks.length === 0 && (
        <div className="text-center text-gray-500 mt-10">No tasks found.</div>
      )}
    </div>
  );
}
