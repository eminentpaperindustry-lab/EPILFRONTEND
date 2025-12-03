import React, { useEffect, useState, useContext } from "react";
import axios from "../api/axios";
import { AuthContext } from "../context/AuthContext";

export default function Delegation() {
  const { user } = useContext(AuthContext);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  // 🔥 FIXED: Individual button loading
  const [loadingTaskId, setLoadingTaskId] = useState(null);
  const [loadingShiftBtn, setLoadingShiftBtn] = useState(false);

  const [shiftTask, setShiftTask] = useState(null);
  const [shiftDate, setShiftDate] = useState("");

  const [form, setForm] = useState({
    TaskName: "",
    Deadline: "",
    Priority: "",
    Notes: "",
  });

  // Load Tasks
  useEffect(() => {
    async function loadTasks() {
      try {
        const res = await axios.get("/delegations/");
        setTasks(res.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    if (user) loadTasks();
  }, [user]);

  // Create Task
  const createTask = async () => {
    setLoadingTaskId("create");
    try {
      const res = await axios.post("/delegations/", form);

      setTasks([
        {
          TaskID: res.data.TaskID,
          Name: user.name,
          TaskName: form.TaskName,
          Deadline: form.Deadline,
          CreatedDate: new Date().toISOString(),
          Revision1: "",
          Revision2: "",
          FinalDate: "",
          Revisions: 0,
          Priority: form.Priority,
          Status: "Pending",
          Followup: form.Notes,
        },
        ...tasks,
      ]);

      setShowCreate(false);
      setForm({ TaskName: "", Deadline: "", Priority: "", Notes: "" });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTaskId(null);
    }
  };

  // Mark Done
  const handleDone = async (taskID) => {
    setLoadingTaskId(taskID);
    try {
      await axios.patch(`/delegations/done/${taskID}`);

      setTasks(
        tasks.map((t) =>
          t.TaskID === taskID
            ? { ...t, Status: "Completed", FinalDate: new Date().toISOString() }
            : t
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTaskId(null);
    }
  };

  // Open Shift Picker
  const openShiftPicker = (task) => {
    setShiftTask(task);
    setShiftDate("");
  };

  // Confirm Shift
  const confirmShift = async () => {
    if (!shiftDate) return;

    setLoadingShiftBtn(true);

    const revisionField = shiftTask.Revisions === 0 ? "Revision1" : "Revision2";

    try {
      await axios.patch(`/delegations/shift/${shiftTask.TaskID}`, {
        newDeadline: shiftDate,
        revisionField,
      });

      setTasks(
        tasks.map((t) =>
          t.TaskID === shiftTask.TaskID
            ? {
                ...t,
                [revisionField]: shiftDate,
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

  // Filter Tasks
  const filteredTasks =
    activeTab === "pending"
      ? tasks.filter((t) => !t.FinalDate)
      : tasks.filter((t) => {
          if (!t.FinalDate) return false;
          const doneTime = new Date(t.FinalDate).getTime();
          const now = Date.now();
          return now - doneTime <= 6 * 60 * 60 * 1000;
        });

  if (loading) return <div className="p-6 text-lg">Loading...</div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">

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
            activeTab === "pending"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
          onClick={() => setActiveTab("pending")}
        >
          Pending / Shifted
        </button>

        <button
          className={`px-3 py-2 rounded text-sm md:text-base ${
            activeTab === "done"
              ? "bg-green-600 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
          onClick={() => setActiveTab("done")}
        >
          Completed (Last 6 Hrs)
        </button>
      </div>

      {/* Create Task */}
      {showCreate && (
        <div className="bg-white p-4 rounded shadow mb-6 border">
          <h3 className="text-lg font-semibold mb-3">Create New Task</h3>

          <div className="grid gap-3">
            <input
              className="w-full border p-2 rounded"
              placeholder="Task Name"
              value={form.TaskName}
              onChange={(e) => setForm({ ...form, TaskName: e.target.value })}
            />

            <input
              type="date"
              className="w-full border p-2 rounded"
              value={form.Deadline}
              onChange={(e) => setForm({ ...form, Deadline: e.target.value })}
            />

            <select
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
            />

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
                  Deadline: {task.Deadline || "—"}
                </div>
                <div className="text-sm text-gray-600">
                  Revisions: {task.Revisions}
                  {task.Revision1 && ` | Rev1: ${task.Revision1}`}
                  {task.Revision2 && ` | Rev2: ${task.Revision2}`}
                </div>
                <div className="text-sm text-gray-600">
                  Priority: {task.Priority || "Normal"}
                </div>
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

            {/* Buttons */}
            <div className="flex gap-3 mt-3 flex-wrap">
              {!task.FinalDate && (
                <>
                  {/* Mark Done */}
                  <button
                    onClick={() => handleDone(task.TaskID)}
                    className="bg-green-600 text-white px-3 py-1 rounded"
                    disabled={loadingTaskId === task.TaskID}
                  >
                    {loadingTaskId === task.TaskID ? "Processing..." : "Mark Done"}
                  </button>

                  {/* Shift Deadline */}
                  <button
                    onClick={() => openShiftPicker(task)}
                    className="bg-yellow-600 text-white px-3 py-1 rounded"
                    disabled={task.Revisions >= 2}
                  >
                    {task.Revisions >= 2 ? "Max Shifts Reached" : "Shift Deadline"}
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
              value={shiftDate}
              onChange={(e) => setShiftDate(e.target.value)}
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
