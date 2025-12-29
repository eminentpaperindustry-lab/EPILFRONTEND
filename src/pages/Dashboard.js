import React, { useState, useEffect, useContext } from "react";
import axios from "../api/axios"; // Ensure axios is configured to make requests to your API
import { AuthContext } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [delegations, setDelegations] = useState([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [completedOnTime, setCompletedOnTime] = useState(0);
  const [notDoneOnTime, setNotDoneOnTime] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [completedButNotOnTime, setCompletedButNotOnTime] = useState(0);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // Default to current month (1-12)
  const [selectedWeek, setSelectedWeek] = useState(1); // Default to week 1
  const [loading, setLoading] = useState(false);

  // ---------------------- Load Data ----------------------
  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch filtered tasks from the backend API
      const res = await axios.get("/delegations/filter", {
        params: {
          month: selectedMonth,
          week: selectedWeek,
        },
      });

      const data = res.data;

      // Set the delegation tasks and counts from the response
      setDelegations(data.tasks || []);
      setTotalTasks(data.totalWork || 0);
      setCompletedTasks(data.workDone || 0);
      setCompletedOnTime(data.workDoneOnTime || 0);
      setNotDoneOnTime(data.workNotDoneOnTime || 0);
      setPendingTasks(data.pendingTasks || 0);
      setCompletedButNotOnTime(data.completedButNotOnTime || 0);

      setLoading(false);
    } catch (err) {
      console.error("Error loading delegation data:", err);
      setLoading(false); // Stop loading in case of error
    }
  };

  useEffect(() => {
    loadData(); // Fetch data whenever month or week changes
  }, [selectedMonth, selectedWeek]);

  // ---------------------- Handle Month and Week Changes ----------------------
  const handleMonthChange = (e) => {
    setSelectedMonth(Number(e.target.value));
    setSelectedWeek(1); // Reset to week 1 when month changes
  };

  const handleWeekChange = (e) => {
    setSelectedWeek(Number(e.target.value)); // Update week based on user selection
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center">Dashboard</h1>

      {/* Filters */}
      <div className="flex justify-between">
        <div className="flex items-center gap-4">
          <label>Month:</label>
          <select onChange={handleMonthChange} value={selectedMonth} className="p-2 border rounded">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i + 1}>
                {new Date(0, i).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>

          <label>Week:</label>
          <select onChange={handleWeekChange} value={selectedWeek} className="p-2 border rounded">
            {Array.from({ length: 4 }, (_, i) => (
              <option key={i} value={i + 1}>
                Week {i + 1}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Delegation Section */}
      <div className="p-4 bg-gray-200 rounded-md">
        <h2 className="text-xl font-semibold">Delegation</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-blue-100 p-4 rounded-md shadow-md text-center">
            <h3>Total Assigned</h3>
            <p className="text-2xl font-bold">{totalTasks}</p>
          </div>
          <div className="bg-yellow-100 p-4 rounded-md shadow-md text-center">
            <h3>Pending</h3>
            <p className="text-2xl font-bold">{pendingTasks}</p>
          </div>
          <div className="bg-green-100 p-4 rounded-md shadow-md text-center">
            <h3>Completed</h3>
            <p className="text-2xl font-bold">{completedTasks}</p>
          </div>
          <div className="bg-teal-100 p-4 rounded-md shadow-md text-center">
            <h3>Completed on Time</h3>
            <p className="text-2xl font-bold">{completedOnTime}</p>
          </div>
          <div className="bg-red-100 p-4 rounded-md shadow-md text-center">
            <h3>Not Done on Time</h3>
            <p className="text-2xl font-bold">{notDoneOnTime}</p>
          </div>
          <div className="bg-gray-100 p-4 rounded-md shadow-md text-center">
            <h3>Completed But Not on Time</h3>
            <p className="text-2xl font-bold">{completedButNotOnTime}</p>
          </div>
        </div>
      </div>

      {/* Modal for Detailed View */}
      {/* Implement this if you need a modal to show task details */}
    </div>
  );
}
