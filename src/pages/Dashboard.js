import React, { useState, useEffect, useContext } from "react";
import axios from "../api/axios";
import { AuthContext } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [delegations, setDelegations] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [helpTickets, setHelpTickets] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedWeek, setSelectedWeek] = useState(1); // Default to week 1
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState([]);
  const [modalTitle, setModalTitle] = useState('');

  // ---------------------- Format Date for Display ----------------------
  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString();
  };

  // ---------------------- Load Data ----------------------
  const loadData = async () => {
    try {
      setLoading(true);
      const resDelegation = await axios.get("/delegations/");
      const resChecklist = await axios.get("/checklist/");
      const resHelpTickets = await axios.get("/helpTickets/all/");
      const resSupportTickets = await axios.get("/support-tickets/all/");

      setDelegations(Array.isArray(resDelegation.data) ? resDelegation.data : []);
      setChecklists(Array.isArray(resChecklist.data) ? resChecklist.data : []);
      setHelpTickets(Array.isArray(resHelpTickets.data) ? resHelpTickets.data : []);
      setSupportTickets(Array.isArray(resSupportTickets.data) ? resSupportTickets.data : []);

      setLoading(false);
    } catch (err) {
      console.error("Error loading data:", err);
      setLoading(false); // Stop loading in case of error
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ---------------------- Filtering Based on Week and Month ----------------------
  const filterByDate = (data, dateField) => {
    if (!Array.isArray(data)) return []; // Ensure data is an array
    return data.filter((item) => {
      const itemDate = new Date(item[dateField]);
      const monthMatch = itemDate.getMonth() === selectedMonth;
      let weekMatch = true;

      if (selectedWeek) {
        const { startDate, endDate } = getWeekRange(selectedMonth, selectedWeek);
        weekMatch = itemDate >= startDate && itemDate <= endDate;
      }

      return monthMatch && weekMatch;
    });
  };

  // ---------------------- Helper function for counting ----------------------
  const countData = (data, status) => {
    if (!Array.isArray(data)) return 0; // Ensure data is an array
    return data.filter((item) => item.Status === status).length;
  };

  // ---------------------- Get Week Range for Filter ----------------------
  const getWeekRange = (month, weekNumber) => {
    const start = new Date(new Date().getFullYear(), month, 1); // Set to the 1st of the month
    const firstDay = start.getDay();
    const diff = (firstDay === 0 ? -6 : 1) - firstDay + (weekNumber - 1) * 7; // Find the start of the selected week
    const startOfWeek = new Date(start.setDate(start.getDate() + diff));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return { startDate: startOfWeek, endDate: endOfWeek };
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(Number(e.target.value));
    setSelectedWeek(1); // Reset to week 1 when month changes
  };

  const handleWeekChange = (e) => {
    setSelectedWeek(Number(e.target.value)); // Update week based on user selection
  };

  // Handle Modal Toggle
  const toggleModal = (data, title) => {
    setModalData(data);
    setModalTitle(title);
    setShowModal(!showModal);
  };

  if (loading) return <div>Loading...</div>;

  const filteredDelegations = filterByDate(delegations, "CreatedDate");
  const filteredChecklists = filterByDate(checklists, "Planned");
  const filteredHelpTickets = filterByDate(helpTickets, "CreatedDate");
  const filteredSupportTickets = filterByDate(supportTickets, "CreatedDate");

  // ---------------------- Calculate Total Scoring ----------------------
  const totalTasks = filteredDelegations.length;
  const completedTasks = countData(filteredDelegations, "Completed");
  const totalScoring = totalTasks ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0;

  // ---------------------- Render ----------------------
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center">Dashboard</h1>

      {/* Filters */}
      <div className="flex justify-between">
        <div className="flex items-center gap-4">
          <label>Month:</label>
          <select onChange={handleMonthChange} value={selectedMonth} className="p-2 border rounded">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>
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

        <div className="flex items-center gap-4">
              <h3 className="text-2xl font-bold">Total Scoring: </h3>
        <p className="text-2xl font-bold ">{totalScoring}%</p>

        </div>
      </div>

      {/* Total Scoring Section */}
      {/* <div className="p-4 bg-gray-100 rounded-md">
        <h3 className="text-lg font-semibold">Total Scoring</h3>
        <p className="text-2xl font-bold text-center">{totalScoring}%</p>
      </div> */}

      {/* Delegation Section */}
      <div className="p-4 bg-gray-200 rounded-md">
        <h2 className="text-xl font-semibold">Delegation</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div
            className="bg-blue-100 p-4 rounded-md shadow-md text-center cursor-pointer"
            onClick={() => toggleModal(filteredDelegations, "Total Assigned Tasks")}
          >
            <h3>Total Assigned</h3>
            <p className="text-2xl font-bold">{filteredDelegations.length}</p>
          </div>
          <div
            className="bg-yellow-100 p-4 rounded-md shadow-md text-center cursor-pointer"
            onClick={() => toggleModal(filteredDelegations.filter((task) => task.Status === "Pending"), "Pending Tasks")}
          >
            <h3>Pending</h3>
            <p className="text-2xl font-bold">{countData(filteredDelegations, "Pending")}</p>
          </div>
          <div
            className="bg-green-100 p-4 rounded-md shadow-md text-center cursor-pointer"
            onClick={() => toggleModal(filteredDelegations.filter((task) => task.Status === "Completed"), "Completed Tasks")}
          >
            <h3>Completed</h3>
            <p className="text-2xl font-bold">{countData(filteredDelegations, "Completed")}</p>
          </div>
          <div
            className="bg-teal-100 p-4 rounded-md shadow-md text-center cursor-pointer"
            onClick={() => toggleModal(filteredDelegations.filter((task) => task.Taskcompletedapproval === "Approved"), "Approved Tasks")}
          >
            <h3>Approved</h3>
            <p className="text-2xl font-bold">{countData(filteredDelegations, "Approved")}</p>
          </div>
        </div>
      </div>

      {/* Checklist Section */}
      <div className="p-4 bg-gray-200 rounded-md">
        <h2 className="text-xl font-semibold">Checklist</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-10">
          <div
            className="bg-blue-100 p-4 rounded-md shadow-md text-center cursor-pointer"
            onClick={() => toggleModal(filteredChecklists, "Total Assigned Checklists")}
          >
            <h3>Total Assigned</h3>
            <p className="text-2xl font-bold">{filteredChecklists.length}</p>
          </div>
          <div
            className="bg-yellow-100 p-4 rounded-md shadow-md text-center cursor-pointer"
            onClick={() => toggleModal(filteredChecklists.filter((task) => task.Status === "Pending"), "Pending Checklists")}
          >
            <h3>Pending</h3>
            <p className="text-2xl font-bold">{countData(filteredChecklists, "Pending")}</p>
          </div>
          <div
            className="bg-green-100 p-4 rounded-md shadow-md text-center cursor-pointer"
            onClick={() => toggleModal(filteredChecklists.filter((task) => task.Status === "Completed"), "Completed Checklists")}
          >
            <h3>Completed</h3>
            <p className="text-2xl font-bold">{countData(filteredChecklists, "Completed")}</p>
          </div>
        </div>
      </div>

      
      {/* Support TIcket Section */}
      <div className="p-4 bg-gray-200 rounded-md">
        <h2 className="text-xl font-semibold">Support-Ticket </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-10">
          <div
            className="bg-blue-100 p-4 rounded-md shadow-md text-center cursor-pointer"
            onClick={() => toggleModal(filteredChecklists, "Total Assigned Checklists")}
          >
            <h3>Total Assigned Ticket</h3>
            <p className="text-2xl font-bold">{filteredChecklists.length}</p>
          </div>
          <div
            className="bg-yellow-100 p-4 rounded-md shadow-md text-center cursor-pointer"
            onClick={() => toggleModal(filteredChecklists.filter((task) => task.Status === "Pending"), "Pending Checklists")}
          >
            <h3>Assigned Ticket Done</h3>
            <p className="text-2xl font-bold">{countData(filteredChecklists, "Pending")}</p>
          </div>
          <div
            className="bg-green-100 p-4 rounded-md shadow-md text-center cursor-pointer"
            onClick={() => toggleModal(filteredChecklists.filter((task) => task.Status === "Completed"), "Completed Checklists")}
          >
            <h3>Ticket Created</h3>
            <p className="text-2xl font-bold">{countData(filteredChecklists, "Completed")}</p>
          </div>
        </div>
      </div>


  
      {/* Help  TIcket Section */}
      <div className="p-4 bg-gray-200 rounded-md">
        <h2 className="text-xl font-semibold">Help-Ticket </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-10">
          <div
            className="bg-blue-100 p-4 rounded-md shadow-md text-center cursor-pointer"
            onClick={() => toggleModal(filteredChecklists, "Total Assigned Checklists")}
          >
            <h3>Total Assigned Ticket</h3>
            <p className="text-2xl font-bold">{filteredChecklists.length}</p>
          </div>
          <div
            className="bg-yellow-100 p-4 rounded-md shadow-md text-center cursor-pointer"
            onClick={() => toggleModal(filteredChecklists.filter((task) => task.Status === "Pending"), "Pending Checklists")}
          >
            <h3>Assigned Ticket Done</h3>
            <p className="text-2xl font-bold">{countData(filteredChecklists, "Pending")}</p>
          </div>
          <div
            className="bg-green-100 p-4 rounded-md shadow-md text-center cursor-pointer"
            onClick={() => toggleModal(filteredChecklists.filter((task) => task.Status === "Completed"), "Completed Checklists")}
          >
            <h3>Ticket Created</h3>
            <p className="text-2xl font-bold">{countData(filteredChecklists, "Completed")}</p>
          </div>
        </div>
      </div>



      {/* Modal for Detailed View */}
      {showModal && modalData.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-4/5 max-w-3xl overflow-y-auto max-h-[70vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-semibold">{modalTitle}</h3>
              <button className="text-xl text-red-600" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="space-y-4">
              {modalData.map((task, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-md shadow-md hover:bg-gray-100">
                  <h4 className="text-lg font-semibold">{task.TaskName}</h4>
                  <p><strong>Created:</strong> {task.CreatedDate}</p>
                  <p><strong>Deadline:</strong> {task.Deadline}</p>
                  <p><strong>Status:</strong> {task.Status}</p>
                  <p><strong>Priority:</strong> {task.Priority}</p>
                </div>
              ))}
            </div>
            <button className="bg-blue-600 text-white p-2 mt-4 rounded" onClick={() => setShowModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
