import React, { useState, useEffect, useContext } from "react";
import axios from "../api/axios";
import { AuthContext } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useContext(AuthContext);

  // ---------------------- Delegation State ----------------------
  const [delegations, setDelegations] = useState([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [completedOnTime, setCompletedOnTime] = useState(0);
  const [delayedPercentage, setDelayedPercentage] = useState(0);
  const [pendingPercentage, setPendingPercentage] = useState(0);

  // ---------------------- Checklist State ----------------------
  const [checklist, setChecklist] = useState([]);
  const [cTotalTasks, setCTotalTasks] = useState(0);
  const [cCompletedTasks, setCCompletedTasks] = useState(0);
  const [cPendingTasks, setCPendingTasks] = useState(0);
  const [cCompletedOnTime, setCCompletedOnTime] = useState(0);
  const [cDelayedPercentage, setCDelayedPercentage] = useState(0);
  const [cPendingPercentage, setCPendingPercentage] = useState(0);

  // ---------------------- Help Ticket State ----------------------
  const [createdTotalTickets, setCreatedTotalTickets] = useState(0);
  const [createdCompletedTickets, setCreatedCompletedTickets] = useState(0);
  const [createdPendingTickets, setCreatedPendingTickets] = useState(0);
  const [createdOnTime, setCreatedOnTime] = useState(0);
  const [createdDelayedPercentage, setCreatedDelayedPercentage] = useState(0);
  const [createdPendingPercentage, setCreatedPendingPercentage] = useState(0);

  const [assignedTotalTickets, setAssignedTotalTickets] = useState(0);
  const [assignedCompletedTickets, setAssignedCompletedTickets] = useState(0);
  const [assignedPendingTickets, setAssignedPendingTickets] = useState(0);
  const [assignedOnTime, setAssignedOnTime] = useState(0);
  const [assignedDelayedPercentage, setAssignedDelayedPercentage] = useState(0);
  const [assignedPendingPercentage, setAssignedPendingPercentage] = useState(0);

      // ---------------------- Support Ticket State ----------------------
const [supportCreatedTotal, setSupportCreatedTotal] = useState(0);
const [supportCreatedCompleted, setSupportCreatedCompleted] = useState(0);
const [supportCreatedPending, setSupportCreatedPending] = useState(0);
const [supportCreatedOnTime, setSupportCreatedOnTime] = useState(0);
const [supportCreatedDelayedPercentage, setSupportCreatedDelayedPercentage] = useState(0);
const [supportCreatedPendingPercentage, setSupportCreatedPendingPercentage] = useState(0);

const [supportAssignedTotal, setSupportAssignedTotal] = useState(0);
const [supportAssignedCompleted, setSupportAssignedCompleted] = useState(0);
const [supportAssignedPending, setSupportAssignedPending] = useState(0);
const [supportAssignedOnTime, setSupportAssignedOnTime] = useState(0);
const [supportAssignedDelayedPercentage, setSupportAssignedDelayedPercentage] = useState(0);
const [supportAssignedPendingPercentage, setSupportAssignedPendingPercentage] = useState(0);


  // ---------------------- Filters ----------------------
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [loading, setLoading] = useState(false);
  const [weekRange, setWeekRange] = useState({ start: "", end: "" });

  // ---------------------- Load Data ----------------------
  const loadData = async () => {
    try {
      setLoading(true);

      // ====================== DELEGATION (UNCHANGED) ======================
      const delRes = await axios.get("/delegations/filter", {
        params: { month: selectedMonth, week: selectedWeek },
      });
      const d = delRes.data;

      setDelegations(d.tasks || []);
      setTotalTasks(d.totalWork || 0);
      setCompletedTasks(d.completedTaskCount || 0);
      setPendingTasks(d.pendingTaskCount || 0);
      setCompletedOnTime(d.onTimeCount || 0);
      setDelayedPercentage(d.delayedWorkPercentage || 0);
      setPendingPercentage(d.pendingTaskPercentage || 0);
      setWeekRange({ start: d.weekStart || "", end: d.weekEnd || "" });

      // ====================== CHECKLIST (UNCHANGED) ======================
      const clRes = await axios.get("/checklist/filter", {
        params: { month: selectedMonth, week: selectedWeek },
      });
      const c = clRes.data || {};

      setChecklist(c.tasks || []);
      setCTotalTasks(c.totalTasks || 0);
      setCCompletedTasks(c.completedTasks || 0);
      setCPendingTasks(c.pendingTasks || 0);
      setCCompletedOnTime(c.onTimeTasks || 0);
      setCDelayedPercentage(c.delayedPercentage || 0);
      setCPendingPercentage(c.pendingPercentage || 0);

      // ====================== HELP TICKET (FIXED) ======================
      const htRes = await axios.get("/helpTickets/filter", {
        params: { month: selectedMonth, week: selectedWeek },
      });

      const ht = htRes.data || {};
      const assigned = ht.assigned || {};
      const created = ht.created || {};

      // ---- CREATED ----
      setCreatedTotalTickets(created.createdTotalTicket || 0);
      setCreatedPendingTickets(created.createdPendingTicket || 0);
      setCreatedCompletedTickets(created.createdCompletedTicket || 0);
      setCreatedPendingPercentage(created.createdPendingPercentage || 0);
      setCreatedDelayedPercentage(created.createdDelayPercentage || 0);

      const createdDelayedCount =
        created.createdTotalTicket && created.createdDelayPercentage
          ? Math.round(
              (created.createdDelayPercentage * created.createdTotalTicket) / 100
            )
          : 0;

      setCreatedOnTime(
        (created.createdCompletedTicket || 0) - createdDelayedCount
      );

      // ---- ASSIGNED ----
      setAssignedTotalTickets(assigned.assignedTotalTicket || 0);
      setAssignedPendingTickets(assigned.assignedPendingTicket || 0);
      setAssignedCompletedTickets(assigned.assignedCompletedTicket || 0);
      setAssignedPendingPercentage(assigned.assignedPendingPercentage || 0);
      setAssignedDelayedPercentage(assigned.assignedDelayPercentage || 0);

      const assignedDelayedCount =
        assigned.assignedTotalTicket && assigned.assignedDelayPercentage
          ? Math.round(
              (assigned.assignedDelayPercentage * assigned.assignedTotalTicket) / 100
            )
          : 0;

      setAssignedOnTime(
        (assigned.assignedCompletedTicket || 0) - assignedDelayedCount
      );

// ====================== SUPPORT TICKET ======================
const stRes = await axios.get("/support-tickets/filter", {
  params: { month: selectedMonth, week: selectedWeek },
});

const st = stRes.data || {};
const supportAssigned = st.assigned || {};
const supportCreated = st.created || {};

// ---- CREATED ----
setSupportCreatedTotal(supportCreated.createdTotalTicket || 0);
setSupportCreatedPending(supportCreated.createdPendingTicket || 0);
setSupportCreatedCompleted(supportCreated.createdCompletedTicket || 0);
setSupportCreatedPendingPercentage(supportCreated.createdPendingPercentage || 0);
setSupportCreatedDelayedPercentage(supportCreated.createdDelayPercentage || 0);

const supportCreatedDelayedCount =
  supportCreated.createdTotalTicket && supportCreated.createdDelayPercentage
    ? Math.round(
        (supportCreated.createdDelayPercentage * supportCreated.createdTotalTicket) / 100
      )
    : 0;

setSupportCreatedOnTime(
  (supportCreated.createdCompletedTicket || 0) - supportCreatedDelayedCount
);

// ---- ASSIGNED ----
setSupportAssignedTotal(supportAssigned.assignedTotalTicket || 0);
setSupportAssignedPending(supportAssigned.assignedPendingTicket || 0);
setSupportAssignedCompleted(supportAssigned.assignedCompletedTicket || 0);
setSupportAssignedPendingPercentage(supportAssigned.assignedPendingPercentage || 0);
setSupportAssignedDelayedPercentage(supportAssigned.assignedDelayPercentage || 0);

const supportAssignedDelayedCount =
  supportAssigned.assignedTotalTicket && supportAssigned.assignedDelayPercentage
    ? Math.round(
        (supportAssigned.assignedDelayPercentage * supportAssigned.assignedTotalTicket) / 100
      )
    : 0;

setSupportAssignedOnTime(
  (supportAssigned.assignedCompletedTicket || 0) - supportAssignedDelayedCount
);




      setLoading(false);
    } catch (err) {
      console.error("Dashboard Load Error:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedWeek]);

  // ---------------------- Handlers ----------------------
  const handleMonthChange = (e) => {
    setSelectedMonth(Number(e.target.value));
    setSelectedWeek(1);
  };

  const handleWeekChange = (e) => setSelectedWeek(Number(e.target.value));

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center">Dashboard</h1>

   {/* ---------------- Filters ---------------- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded shadow">
        {/* Month & Week */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2">
            <label className="font-medium">Month:</label>
            <select
              value={selectedMonth}
              onChange={handleMonthChange}
              className="p-2 border rounded"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {new Date(0, i).toLocaleString("default", { month: "long" })}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="font-medium">Week:</label>
            <select
              value={selectedWeek}
              onChange={handleWeekChange}
              className="p-2 border rounded"
            >
              {[1, 2, 3, 4, 5].map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range */}
        <div className="font-semibold mt-2 sm:mt-0 text-sm sm:text-base">
          Date Range: <span className="text-blue-600">{weekRange.start}</span> → <span className="text-blue-600">{weekRange.end}</span>
        </div>
      </div>

      {/* DELEGATION */}
      <Section title="Delegation Summary">
        <Card title="Total Tasks" value={totalTasks} color="bg-blue-100" />
        <Card title="Pending Tasks" value={pendingTasks} color="bg-yellow-100" />
        <Card title="Completed Tasks" value={completedTasks} color="bg-green-100" />
        <Card title="Completed On Time" value={completedOnTime} color="bg-teal-100" />
        <Card title="Pending %" value={`${pendingPercentage}%`} color="bg-purple-100" />
        <Card title="Delayed %" value={`${delayedPercentage}%`} color="bg-red-100" />
      </Section>

      {/* CHECKLIST */}
      <Section title="Checklist Summary">
        <Card title="Total Tasks" value={cTotalTasks} color="bg-blue-100" />
        <Card title="Pending Tasks" value={cPendingTasks} color="bg-yellow-100" />
        <Card title="Completed Tasks" value={cCompletedTasks} color="bg-green-100" />
        <Card title="Completed On Time" value={cCompletedOnTime} color="bg-teal-100" />
        <Card title="Pending %" value={`${cPendingPercentage}%`} color="bg-purple-100" />
        <Card title="Delayed %" value={`${cDelayedPercentage}%`} color="bg-red-100" />
      </Section>
{/* HELP TICKET */}
<Section title="Help Ticket Summary">

  {/* Assigned Tickets */}
  <h3 className="col-span-full text-md font-semibold mt-1 mb-1">Assigned Tickets</h3>
  <Card title="Total Ticket" value={assignedTotalTickets} color="bg-blue-100" />
  <Card title="Pending Ticket" value={assignedPendingTickets} color="bg-yellow-100" />
  <Card title="Completed Ticket" value={assignedCompletedTickets} color="bg-green-100" />
  <Card title="On Time Ticket" value={assignedOnTime} color="bg-teal-100" />
  <Card title="Pending %" value={`${assignedPendingPercentage}%`} color="bg-purple-100" />
  <Card title="Delay %" value={`${assignedDelayedPercentage}%`} color="bg-red-100" />

  {/* Created Tickets */}
  <h3 className="col-span-full text-md font-semibold mt-2 mb-1">Created Tickets</h3>
  <Card title="Total Ticket" value={createdTotalTickets} color="bg-blue-100" />
  <Card title="Pending Ticket" value={createdPendingTickets} color="bg-yellow-100" />
  <Card title="Completed Ticket" value={createdCompletedTickets} color="bg-green-100" />
  <Card title="On Time Ticket" value={createdOnTime} color="bg-teal-100" />
  <Card title="Pending %" value={`${createdPendingPercentage}%`} color="bg-purple-100" />
  <Card title="Delay %" value={`${createdDelayedPercentage}%`} color="bg-red-100" />

</Section>


{/* SUPPORT TICKET */}
<Section title="Support Ticket Summary">

  {/* Assigned Tickets */}
  <h3 className="col-span-full text-md font-semibold mt-1 mb-1">Assigned Tickets</h3>
  <Card title="Total Ticket" value={supportAssignedTotal} color="bg-blue-100" />
  <Card title="Pending Ticket" value={supportAssignedPending} color="bg-yellow-100" />
  <Card title="Completed Ticket" value={supportAssignedCompleted} color="bg-green-100" />
  <Card title="On Time Ticket" value={supportAssignedOnTime} color="bg-teal-100" />
  <Card title="Pending %" value={`${supportAssignedPendingPercentage}%`} color="bg-purple-100" />
  <Card title="Delay %" value={`${supportAssignedDelayedPercentage}%`} color="bg-red-100" />

  {/* Created Tickets */}
  <h3 className="col-span-full text-md font-semibold mt-2 mb-1">Created Tickets</h3>
  <Card title="Total Ticket" value={supportCreatedTotal} color="bg-blue-100" />
  <Card title="Pending Ticket" value={supportCreatedPending} color="bg-yellow-100" />
  <Card title="Completed Ticket" value={supportCreatedCompleted} color="bg-green-100" />
  <Card title="On Time Ticket" value={supportCreatedOnTime} color="bg-teal-100" />
  <Card title="Pending %" value={`${supportCreatedPendingPercentage}%`} color="bg-purple-100" />
  <Card title="Delay %" value={`${supportCreatedDelayedPercentage}%`} color="bg-red-100" />

</Section>


    </div>
  );
}

// ---------------------- Reusable Components ----------------------
function Section({ title, children }) {
  return (
    <div className="p-4 bg-gray-200 rounded-md">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {children}
      </div>
    </div>
  );
}

function Card({ title, value, color }) {
  return (
    <div className={`${color} p-4 rounded shadow text-center`}>
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
