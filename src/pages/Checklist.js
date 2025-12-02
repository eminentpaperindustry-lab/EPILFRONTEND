import React, { useState, useEffect, useContext } from "react";
import axios from "../api/axios";
import { AuthContext } from "../context/AuthContext";

export default function Checklist() {
  const { user } = useContext(AuthContext);
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");

  // only mark-done button loading
  const [processingTask, setProcessingTask] = useState(null);

  // ---------------- DATE PARSER ----------------
  const parseDate = (d) => {
    if (!d) return null;

    // Format: DD/MM/YYYY HH:mm:ss
    if (/^\d{2}\/\d{2}\/\d{4}/.test(d)) {
      const [date, time] = d.split(" ");
      const [day, mon, yr] = date.split("/");
      return new Date(`${yr}-${mon}-${day}T${time || "00:00:00"}`);
    }

    // Format: YYYY-MM-DD HH:mm:ss
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
      return new Date(d);
    }

    const fallback = new Date(d);
    return isNaN(fallback) ? null : fallback;
  };

  // ---------------- LOAD DATA ----------------
  const loadChecklists = async () => {
    try {
      const res = await axios.get("/checklist/", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setChecklists(res.data || []);
    } catch (err) {
      console.error("Load Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadChecklists();
  }, [user]);

  // ---------------- MARK DONE ----------------
  const markDone = async (TaskID) => {
    try {
      setProcessingTask(TaskID);

      await axios.patch(
        `/checklist/done/${TaskID}`,
        {},
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      await loadChecklists();
    } catch (e) {
      console.error("Done Error:", e);
    } finally {
      setProcessingTask(null);
    }
  };

  // ---------------- WEEK RANGE ----------------
  const getWeekRange = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sun

    // Monday as start
    const start = new Date(d);
    start.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  };

  // ---------------- FILTER LOGIC ----------------
  const filteredChecklists = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { start: weekStart, end: weekEnd } = getWeekRange(today);

    return checklists.filter((c) => {
      const planned = parseDate(c.Planned);
      const actual = parseDate(c.Actual);

      if (!planned) return false;

      planned.setHours(0, 0, 0, 0);

      const isDone = !!actual;
      const freq = c.Freq;

      // ---------------- PENDING TAB ----------------
      if (activeTab === "pending") {
        if (isDone) return false;

        // DAILY OVERDUE
        if (freq === "D" && planned < today) return true;

        // WEEKLY OVERDUE
        if (freq === "W" && planned < weekStart) return true;

        // MONTHLY OVERDUE
        if (
          freq === "M" &&
          (planned.getFullYear() < today.getFullYear() ||
            (planned.getFullYear() === today.getFullYear() &&
              planned.getMonth() < today.getMonth()))
        ) {
          return true;
        }

        return false;
      }

      // ---------------- DAILY TAB ----------------
      if (activeTab === "Daily") {
        return (
          freq === "D" &&
          planned.getTime() === today.getTime() &&
          !isDone
        );
      }

      // ---------------- WEEKLY TAB ----------------
      if (activeTab === "Weekly") {
        return (
          freq === "W" &&
          !isDone &&
          planned >= weekStart &&
          planned <= weekEnd
        );
      }

      // ---------------- MONTHLY TAB ----------------
      if (activeTab === "Monthly") {
        return (
          freq === "M" &&
          !isDone &&
          planned.getMonth() === today.getMonth() &&
          planned.getFullYear() === today.getFullYear()
        );
      }

      return false;
    });
  };

  if (loading) return <div>Loading...</div>;

  // ---------------- UI ----------------
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Checklist</h1>

      <div className="flex gap-2 mb-4">
        {["pending", "Daily", "Weekly", "Monthly"].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 rounded ${
              activeTab === tab ? "bg-blue-600 text-white" : "bg-gray-300"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {filteredChecklists().map((c) => (
          <div
            key={c.TaskID}
            className="p-4 bg-white shadow rounded flex justify-between items-center"
          >
            <div>
              <div className="font-semibold">{c.Task}</div>
              <div className="text-sm text-gray-500">
                Frequency:{" "}
                {c.Freq === "D"
                  ? "Daily"
                  : c.Freq === "W"
                  ? "Weekly"
                  : "Monthly"}
              </div>
              <div className="text-sm text-gray-500">Planned: {c.Planned}</div>
            </div>

            {!c.Actual && (
              <button
                onClick={() => markDone(c.TaskID)}
                disabled={processingTask === c.TaskID}
                className={`px-3 py-1 rounded text-white ${
                  processingTask === c.TaskID
                    ? "bg-gray-400"
                    : "bg-green-600"
                }`}
              >
                {processingTask === c.TaskID ? "Loading..." : "Mark Done"}
              </button>
            )}
          </div>
        ))}

        {filteredChecklists().length === 0 && (
          <p className="text-gray-500">No data found.</p>
        )}
      </div>
    </div>
  );
}
