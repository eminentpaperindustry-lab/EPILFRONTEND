import React, { useEffect, useState, useContext } from "react";
import axios from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Delegation() {
  const { user } = useContext(AuthContext);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  const [loadingTaskId, setLoadingTaskId] = useState(null);
  const [loadingShiftBtn, setLoadingShiftBtn] = useState(false);
  const [shiftTask, setShiftTask] = useState(null);
const [assignBy, setAssignBy] = useState("Ritesh Agarwal");

  const [form, setForm] = useState({
    TaskName: "",
    Deadline: "",
    Priority: "High",
    Notes: "",
  });

  function formatDateDDMMYYYYHHMMSS(date = new Date()) {
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
    const d = new Date(date || Date.now());
    if (isNaN(d)) return "";

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    return `${dd}/${mm}/${yyyy}`;
  };

  // ---------------- Load Tasks from API ----------------
  const loadTasks = async () => {
    setLoading(true); // show loading for every fetch
    try {
      const res = await axios.get("/delegations/");
      const formattedTasks = res.data.map((t) => ({
        ...t,
        CreatedDate: t.CreatedDate,
        Deadline: t.Deadline,
        Revision1: normalizeDate(t.Revision1),
        Revision2: normalizeDate(t.Revision2),
        FinalDate: t.FinalDate,
      }));
      setTasks(formattedTasks);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tasks");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Load tasks on mount AND tab change ----------------
  useEffect(() => {
    if (user) loadTasks();
  }, [user, activeTab]); // triggers on tab change

  // ---------------- Create Task ----------------
  // const createTask = async () => {
  //   if (!form.TaskName || !form.Deadline)
  //     return toast.warn("Task Name & Deadline required");

  //   setLoadingTaskId("create");
  //   try {
  //     const res = await axios.post("/delegations/", {
  //       TaskName: form.TaskName,
  //       Deadline: normalizeDate(form.Deadline),
  //       Priority: form.Priority || "High",
  //       Notes: form.Notes || "",
  //     });

  //     if (res.data.ok === true) {
  //       await loadTasks(); // reload from API
  //       setShowCreate(false);
  //       setForm({ TaskName: "", Deadline: "", Priority: "", Notes: "" });
  //       toast.success("Task created successfully");
  //     } else {
  //       toast.error("Failed to create task due to technical issue");
  //     }
  //   } catch (err) {
  //     console.error(err);
  //     toast.error("Failed to create task");
  //   } finally {
  //     setLoadingTaskId(null);
  //   }
  // };

  const createTask = async () => {
  if (!form.TaskName || !form.Deadline)
    return toast.warn("Task Name & Deadline required");

  if (!assignBy)
    return toast.warn("Please select Assign By");

  setLoadingTaskId("create");
  try {
    const res = await axios.post("/delegations/", {
      TaskName: form.TaskName,
      Deadline: normalizeDate(form.Deadline),
      Priority: form.Priority || "High",
      Notes: form.Notes || "",
      AssignBy: assignBy, // ✅ IMPORTANT
    });

    if (res.data.ok === true) {
      await loadTasks();
      setShowCreate(false);
      setForm({ TaskName: "", Deadline: "", Priority: "", Notes: "" });
      setAssignBy("");
      toast.success("Task created successfully");
    } else {
      toast.error("Failed to create task due to technical issue");
    }
  } catch (err) {
    console.error(err);
    toast.error("Failed to create task");
  } finally {
    setLoadingTaskId(null);
  }
};


  // ---------------- Mark Done ----------------
  const handleDone = async (taskID) => {
    setLoadingTaskId(taskID);
    try {
      await axios.patch(`/delegations/done/${taskID}`);
      toast.success("Task marked as completed");
      await loadTasks(); // reload from API
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark task as done");
    } finally {
      setLoadingTaskId(null);
    }
  };

  // ---------------- Shift Deadline ----------------
  const openShiftPicker = (task) => {
    setShiftTask(task);
    setForm({ ...form, Deadline: "" });
  };

  const confirmShift = async () => {
    if (!form.Deadline) return toast.warn("Please select a new deadline");

    setLoadingShiftBtn(true);
    const revisionField = shiftTask.Revisions === 0 ? "Revision1" : "Revision2";

    try {
      await axios.patch(`/delegations/shift/${shiftTask.TaskID}`, {
        newDeadline: normalizeDate(form.Deadline),
        revisionField,
      });

      toast.success("Deadline shifted successfully");
      setShiftTask(null);
      await loadTasks(); // reload from API
    } catch (err) {
      console.error(err);
      toast.error("Failed to shift deadline");
    } finally {
      setLoadingShiftBtn(false);
    }
  };

  // ---------------- Filter Tasks for Active Tab ----------------
  const filteredTasks = tasks.filter((t) => {
    if (activeTab === "pending") {
      return (
        (t.Status === "Pending" || t.Status === "Shifted") &&
        !t.FinalDate &&
        (t.Taskcompletedapproval === "" || t.Taskcompletedapproval === "Pending") &&
        t.Taskcompletedapproval !== "Approved"
      );
    } else {
      return (
        t.Status === "Completed" &&
        t.FinalDate &&
        (t.Taskcompletedapproval === "" || t.Taskcompletedapproval === "Pending") &&
        t.Taskcompletedapproval !== "Approved"
      );
    }
  });

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <ToastContainer position="top-right" autoClose={3000} />
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl md:text-2xl font-bold">Delegation Tasks</h2>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded shadow text-sm md:text-base"
          onClick={() => setShowCreate(true)}
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
              <label className="block text-sm font-semibold mb-2">Task Name</label>
              <input
                className="w-full border p-2 rounded"
                placeholder="Task Name"
                value={form.TaskName}
                onChange={(e) => setForm({ ...form, TaskName: e.target.value })}
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-semibold mb-2">Plan Date</label>
              <input
                type="date"
                className="w-full border p-2 rounded"
                value={form.Deadline}
                onChange={(e) => setForm({ ...form, Deadline: e.target.value })}
              />
            </div>
  <label className="block text-sm font-medium mb-1 text-gray-700">
        Assign By
      </label>
            <select
  className="w-full h-11 rounded-md border border-gray-300 px-3 text-sm
             focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
  value={assignBy}
  onChange={(e) => setAssignBy(e.target.value)}
>
  <option value="">-- Select Assign By --</option>
  <option value="Aman Agarwal">Aman Agarwal</option>
  <option value="Kanishk Agarwal">Kanishk Agarwal</option>
  <option value="Ritesh Agarwal">Ritesh Agarwal</option>
</select>


            <div className="flex gap-3 mt-2">
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

      {/* Loading State */}
      {loading && (
        <div className="text-center p-6 text-lg text-gray-600">Loading tasks...</div>
      )}

      {/* Task List (scrollable) */}
      {!loading && (
        <div className="grid gap-4 max-h-[60vh] overflow-y-auto p-1">
          {filteredTasks.length === 0 && (
            <div className="text-center text-gray-500 mt-10">No tasks found.</div>
          )}

          {filteredTasks.map((task) => (
            <div key={task.TaskID} className="p-4 bg-white rounded shadow border">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-lg">{task.TaskName}</div>
                  <div className="text-sm text-gray-600">
                    Created: {task.CreatedDate || "—"}, Deadline: {task.Deadline || "—"}, Completed: {task.FinalDate || "—"}, Revision: {task.Revisions || 0}
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
                    >
                      Shift Deadline
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
              <button className="px-4 py-2 rounded border" onClick={() => setShiftTask(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
