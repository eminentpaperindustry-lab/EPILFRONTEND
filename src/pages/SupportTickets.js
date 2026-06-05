import React, { useEffect, useState, useContext, useRef } from "react";
import axios from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);

const DATE_FORMAT = "DD/MM/YYYY HH:mm:ss";

export default function SupportTicket() {
  const { user } = useContext(AuthContext);

  const [employees, setEmployees] = useState([]);
  const [assignedTickets, setAssignedTickets] = useState([]);
  const [createdTickets, setCreatedTickets] = useState([]);
  const [activeTab, setActiveTab] = useState("assigned");
  
  // Tab states for Assigned view
  const [assignedTab, setAssignedTab] = useState("pending");
  
  // Tab states for Created view
  const [createdTab, setCreatedTab] = useState("pending");
  
  const [form, setForm] = useState({ Issue: "", IssuePhoto: null });
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalImage, setModalImage] = useState(null);
  const [userDept, setUserDept] = useState("");
  const [showDropdown, setShowDropdown] = useState({});
  const [actionLoading, setActionLoading] = useState({});

  // New state for Done modal
  const [doneModal, setDoneModal] = useState({
    isOpen: false,
    ticketId: null,
    issue: "",
    problem: "",
    solution: ""
  });

  const fileInputRef = useRef();
  const authHeader = { headers: { Authorization: `Bearer ${user.token}` } };

  useEffect(() => {
    loadEmployees();
    loadUserDepartment();
    loadTickets();
  }, []);

  const loadUserDepartment = async () => {
    try {
      const res = await axios.get("/employee/all", authHeader);
      const currentUser = (res.data || []).find(e => e.name === user.name);
      setUserDept(currentUser?.Department || "");
      console.log("User Department:", currentUser?.Department);
    } catch (err) {
      console.error("Failed to load user department:", err);
      toast.error("Failed to load user department");
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await axios.get("/employee/all", authHeader);
      setEmployees((res.data || []).filter((e) => e.name !== user.name));
    } catch (err) {
      console.error("Failed to load employees:", err);
      toast.error("Failed to load employees");
    }
  };

  const loadTickets = async () => {
    try {
      console.log("Loading tickets...");
      const [assignedRes, createdRes] = await Promise.all([
        axios.get("/support-tickets/assigned", authHeader),
        axios.get("/support-tickets/created", authHeader),
      ]);

      console.log("Assigned Tickets:", assignedRes.data);
      console.log("Created Tickets:", createdRes.data);

      setAssignedTickets(assignedRes.data || []);
      setCreatedTickets(createdRes.data || []);
    } catch (err) {
      console.error("Failed to load tickets:", err);
      toast.error("Failed to load tickets");
    }
    setLoading(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm((prev) => ({ ...prev, IssuePhoto: file }));
    }
  };

  const createTicket = async () => {
    if (!form.Issue) {
      toast.error("Issue description is required");
      return;
    }
    
    setCreating(true);
    const toastId = toast.loading("Creating ticket...");

    try {
      const formData = new FormData();
      formData.append("Issue", form.Issue);
      if (form.IssuePhoto) formData.append("IssuePhoto", form.IssuePhoto);

      await axios.post("/support-tickets/create", formData, {
        headers: { ...authHeader.headers, "Content-Type": "multipart/form-data" },
      });

      setForm({ Issue: "", IssuePhoto: null });
      if (fileInputRef.current) fileInputRef.current.value = null;

      await loadTickets();
      
      toast.update(toastId, {
        render: "Ticket created successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000
      });
    } catch (err) {
      console.error("Create error:", err);
      toast.update(toastId, {
        render: err.response?.data?.error || "Failed to create ticket",
        type: "error",
        isLoading: false,
        autoClose: 3000
      });
    }

    setCreating(false);
  };

  const updateStatus = async (id, status) => {
    setUpdating((p) => ({ ...p, [id]: true }));
    
    let actionText = "";
    if (status === "InProgress") actionText = "Starting";
    else if (status === "Done") actionText = "Completing";
    else if (status === "Approved") actionText = "Approving";
    else if (status === "Pending") actionText = "Rejecting";
    
    const toastId = toast.loading(`${actionText} ticket...`);

    try {
      const cleanId = encodeURIComponent(id.trim());
      console.log(`Updating ticket ${id} to status: ${status}`);
      
      const response = await axios.patch(
        `/support-tickets/status/${cleanId}`, 
        { Status: status }, 
        authHeader
      );
      
      console.log("Update response:", response.data);
      await loadTickets();
      setShowDropdown((p) => ({ ...p, [id]: false }));
      
      let successMsg = "";
      if (status === "InProgress") successMsg = "Ticket started successfully!";
      else if (status === "Done") successMsg = "Ticket marked as done!";
      else if (status === "Approved") successMsg = "Ticket approved successfully!";
      else if (status === "Pending") successMsg = "Ticket rejected and sent back to pending!";
      
      toast.update(toastId, {
        render: successMsg,
        type: "success",
        isLoading: false,
        autoClose: 3000
      });
      
    } catch (err) {
      console.error("Update error:", err);
      toast.update(toastId, {
        render: err.response?.data?.error || "Failed to update status",
        type: "error",
        isLoading: false,
        autoClose: 3000
      });
    } finally {
      setUpdating((p) => ({ ...p, [id]: false }));
    }
  };

  // New function to open Done modal
  const openDoneModal = (ticketId, issue) => {
    setDoneModal({
      isOpen: true,
      ticketId: ticketId,
      issue: issue,
      problem: "",
      solution: ""
    });
  };

  // New function to submit done details
  const submitDoneDetails = async () => {
    if (!doneModal.problem || !doneModal.solution) {
      toast.error("Please fill both Problem and Solution fields");
      return;
    }
    
    const toastId = toast.loading("Submitting done details...");
    
    try {
      // First save problem and solution
      await axios.patch(
        `/support-tickets/done-details/${encodeURIComponent(doneModal.ticketId.trim())}`,
        {
          Problem: doneModal.problem,
          Solution: doneModal.solution
        },
        authHeader
      );
      
      // Then update status to Done
      await axios.patch(
        `/support-tickets/status/${encodeURIComponent(doneModal.ticketId.trim())}`,
        { Status: "Done" },
        authHeader
      );
      
      await loadTickets();
      
      toast.update(toastId, {
        render: "Ticket completed with details!",
        type: "success",
        isLoading: false,
        autoClose: 3000
      });
      
      setDoneModal({ isOpen: false, ticketId: null, issue: "", problem: "", solution: "" });
      
    } catch (err) {
      console.error("Error submitting done details:", err);
      toast.update(toastId, {
        render: err.response?.data?.error || "Failed to submit details",
        type: "error",
        isLoading: false,
        autoClose: 3000
      });
    }
  };

  // Update group of tickets (for approve/reject all)
  const updateGroupStatus = async (group, status, actionText) => {
    const groupKey = group.Issue;
    setActionLoading(prev => ({ ...prev, [groupKey]: true }));
    
    const toastId = toast.loading(`${actionText}ing all tickets...`);

    try {
      // Update the main ticket - backend will handle all related tickets
      const mainTicketId = group.tickets[0].TicketID;
      
      const response = await axios.patch(
        `/support-tickets/status/${encodeURIComponent(mainTicketId.trim())}`, 
        { Status: status }, 
        authHeader
      );
      
      console.log("Group update response:", response.data);
      await loadTickets();
      
      setShowDropdown((p) => ({ ...p, [group.Issue]: false }));
      
      toast.update(toastId, {
        render: `All tickets ${actionText.toLowerCase()}ed successfully!`,
        type: "success",
        isLoading: false,
        autoClose: 3000
      });
      return true;
    } catch (err) {
      console.error(`${actionText} error:`, err);
      toast.update(toastId, {
        render: err.response?.data?.error || `Failed to ${actionText.toLowerCase()} tickets`,
        type: "error",
        isLoading: false,
        autoClose: 3000
      });
      return false;
    } finally {
      setActionLoading(prev => ({ ...prev, [groupKey]: false }));
    }
  };

  // Filter tickets based on tab with correct logic
  const getFilteredTickets = (tickets, tabType) => {
    switch(tabType) {
      case "pending":
        return tickets.filter(t => t.Status === "Pending" || t.Status === "InProgress");
      case "completed":
        // Completed tab should show tickets with Status = "Done" AND Taskcompletedapproval != "Approved"
        return tickets.filter(t => t.Status === "Done" && t.Taskcompletedapproval !== "Approved");
      case "approved":
        // Approved tab should show tickets with Status = "Done" AND Taskcompletedapproval = "Approved"
        return tickets.filter(t => t.Status === "Done" && t.Taskcompletedapproval === "Approved");
      default:
        return tickets;
    }
  };

  // Group tickets by Issue with Department
  const groupTicketsByIssue = (tickets) => {
    const grouped = {};
    
    tickets.forEach(ticket => {
      if (!grouped[ticket.Issue]) {
        grouped[ticket.Issue] = {
          Issue: ticket.Issue,
          tickets: [ticket],
          count: 1,
          TicketID: ticket.TicketID,
          CreatedBy: ticket.CreatedBy,
          CreatedDate: ticket.CreatedDate,
          IssuePhoto: ticket.IssuePhoto,
          Status: ticket.Status,
          WorkBy: ticket.WorkBy || "",
          DoneDate: ticket.DoneDate || "",
          Taskcompletedapproval: ticket.Taskcompletedapproval || "Pending",
          AssignedTo: ticket.AssignedTo,
          Department: ticket.Department || "N/A",
          uniqueWorkBy: ticket.WorkBy ? [ticket.WorkBy] : []
        };
      } else {
        grouped[ticket.Issue].tickets.push(ticket);
        grouped[ticket.Issue].count++;
        
        // Track unique workBy
        if (ticket.WorkBy && !grouped[ticket.Issue].uniqueWorkBy.includes(ticket.WorkBy)) {
          grouped[ticket.Issue].uniqueWorkBy.push(ticket.WorkBy);
        }
        
        // Update DoneDate if exists
        if (ticket.DoneDate && !grouped[ticket.Issue].DoneDate) {
          grouped[ticket.Issue].DoneDate = ticket.DoneDate;
        }
        
        // Update Taskcompletedapproval - if any ticket is approved, show approved
        if (ticket.Taskcompletedapproval === "Approved") {
          grouped[ticket.Issue].Taskcompletedapproval = "Approved";
        }
        
        // Department should be same for same issue
        if (ticket.Department && !grouped[ticket.Issue].Department) {
          grouped[ticket.Issue].Department = ticket.Department;
        }
      }
    });
    
    return Object.values(grouped);
  };

  const parseDate = (dateStr) => {
    if (!dateStr || dateStr === "") return null;
    return dayjs(dateStr, DATE_FORMAT);
  };
  
  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === "") return "N/A";
    const date = parseDate(dateStr);
    return date.isValid() ? date.format("DD/MM/YYYY HH:mm:ss") : dateStr;
  };

  const timeAgo = (dateStr) => {
    if (!dateStr || dateStr === "") return "N/A";
    const date = parseDate(dateStr);
    return date.isValid() ? date.fromNow() : "N/A";
  };

  if (loading) return (
    <div className="p-6 text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
      <p className="mt-2 text-gray-600">Loading tickets...</p>
    </div>
  );

  // Filter tickets first
  const filteredAssigned = getFilteredTickets(assignedTickets, assignedTab);
  const filteredCreated = getFilteredTickets(createdTickets, createdTab);
  
  // Then group by Issue
  const groupedAssigned = groupTicketsByIssue(filteredAssigned);
  const groupedCreated = groupTicketsByIssue(filteredCreated);

  // Calculate counts for badges
  const pendingCount = assignedTickets.filter(t => t.Status === "Pending" || t.Status === "InProgress").length;
  const completedCount = assignedTickets.filter(t => t.Status === "Done" && t.Taskcompletedapproval !== "Approved").length;
  const approvedCount = assignedTickets.filter(t => t.Status === "Done" && t.Taskcompletedapproval === "Approved").length;
  
  const createdPendingCount = createdTickets.filter(t => t.Status === "Pending" || t.Status === "InProgress").length;
  const createdCompletedCount = createdTickets.filter(t => t.Status === "Done" && t.Taskcompletedapproval !== "Approved").length;
  const createdApprovedCount = createdTickets.filter(t => t.Status === "Done" && t.Taskcompletedapproval === "Approved").length;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <ToastContainer position="top-right" autoClose={3000} />
      
      <h2 className="text-xl font-semibold mb-3">Support Tickets</h2>

      {/* Create Ticket Form - Smaller */}
      <div className="bg-white p-3 rounded-lg shadow-sm mb-4 border">
        <h3 className="font-medium text-sm mb-2">Create New Ticket</h3>

        <textarea
          className="w-full border p-2 rounded mb-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          placeholder="Describe the issue..."
          value={form.Issue}
          onChange={(e) => setForm({ ...form, Issue: e.target.value })}
          rows="2"
        />

        <div className="flex items-center gap-2 mb-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="text-sm"
          />
        </div>

        {form.IssuePhoto && (
          <div className="mb-2">
            <img
              src={URL.createObjectURL(form.IssuePhoto)}
              alt="preview"
              className="w-16 h-16 object-cover border rounded"
            />
          </div>
        )}

        <button
          disabled={creating}
          onClick={createTicket}
          className={`px-3 py-1.5 rounded text-white text-sm transition ${
            creating 
              ? "bg-gray-400 cursor-not-allowed" 
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {creating ? "Creating..." : "Create Ticket"}
        </button>
      </div>

      {/* Main Tabs - Smaller */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setActiveTab("assigned")}
          className={`px-3 py-1.5 rounded text-sm transition ${
            activeTab === "assigned" 
              ? "bg-blue-600 text-white" 
              : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          Assigned To Me ({assignedTickets.length})
        </button>
        <button
          onClick={() => setActiveTab("created")}
          className={`px-3 py-1.5 rounded text-sm transition ${
            activeTab === "created" 
              ? "bg-blue-600 text-white" 
              : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          Created By Me ({createdTickets.length})
        </button>
      </div>

      {activeTab === "assigned" ? (
        <>
          {/* Assigned View Sub-tabs - Smaller */}
          <div className="flex gap-1 mb-3 border-b text-sm">
            <button
              onClick={() => setAssignedTab("pending")}
              className={`px-3 py-1.5 whitespace-nowrap transition ${
                assignedTab === "pending" 
                  ? "border-b-2 border-blue-600 text-blue-600 font-medium" 
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Pending/InProgress ({pendingCount})
            </button>
            <button
              onClick={() => setAssignedTab("completed")}
              className={`px-3 py-1.5 whitespace-nowrap transition ${
                assignedTab === "completed" 
                  ? "border-b-2 border-blue-600 text-blue-600 font-medium" 
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Completed ({completedCount})
            </button>
            <button
              onClick={() => setAssignedTab("approved")}
              className={`px-3 py-1.5 whitespace-nowrap transition ${
                assignedTab === "approved" 
                  ? "border-b-2 border-blue-600 text-blue-600 font-medium" 
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Approved ({approvedCount})
            </button>
          </div>

          {/* Assigned Tickets List - 4 Line Layout with Department */}
          <div className="space-y-2">
            {groupedAssigned.length === 0 && (
              <div className="text-gray-500 text-center py-6 bg-white rounded-lg shadow-sm text-sm">
                No tickets in this section
              </div>
            )}
            
            {groupedAssigned.map((group) => {
              const isActionLoading = actionLoading[group.Issue];
              
              return (
                <div key={group.Issue} className="bg-white p-3 rounded-lg shadow-sm border hover:shadow transition">
                  <div className="flex flex-col md:flex-row justify-between gap-2">
                    <div className="flex-1">
                      {/* Line 1: Ticket ID and Issue */}
                      <div className="flex items-start gap-2 mb-1">
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono whitespace-nowrap">
                          {group.TicketID}
                        </span>
                        {group.count > 1 && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded whitespace-nowrap">
                            {group.count} tickets
                          </span>
                        )}
                        <span className="font-medium text-sm line-clamp-2 flex-1">
                          {group.Issue}
                        </span>
                      </div>
                      
                      {/* Line 2: Created By and Created Date */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mb-1">
                        <span className="text-gray-500">Created By:</span>
                        <span className="font-medium">{group.CreatedBy}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500">Created:</span>
                        <span className="font-medium">{formatDate(group.CreatedDate)}</span>
                      </div>
                      
                      {/* Line 3: DEPARTMENT (NEW) */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mb-1">
                        <span className="text-gray-500">Department:</span>
                        <span className="font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                          {group.Department}
                        </span>
                      </div>
                      
                      {/* Line 4: Assigned To / Work By | Status | Done Date */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="text-gray-500">Assigned To:</span>
                        <span className="font-medium text-blue-600">
                          {group.uniqueWorkBy && group.uniqueWorkBy.length > 0 
                            ? group.uniqueWorkBy.join(", ") 
                            : "MIS"}
                        </span>
                        
                        <span className="text-gray-400">•</span>
                        
                        <span className="text-gray-500">Status:</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium
                          ${group.Status === "Pending" ? "bg-yellow-100 text-yellow-800" : ""}
                          ${group.Status === "InProgress" ? "bg-blue-100 text-blue-800" : ""}
                          ${group.Status === "Done" ? "bg-green-100 text-green-800" : ""}
                        `}>
                          {group.Status}
                        </span>
                        
                        {group.Taskcompletedapproval === "Approved" && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded text-xs font-medium">
                              ✓ Approved
                            </span>
                          </>
                        )}
                        
                        {group.DoneDate && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500">Done:</span>
                            <span className="font-medium text-green-600">
                              {formatDate(group.DoneDate)}
                            </span>
                          </>
                        )}
                        
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-400">
                          {timeAgo(group.CreatedDate)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons - Compact */}
                    <div className="flex flex-row items-center gap-1 mt-2 md:mt-0 md:ml-2">
                      {group.IssuePhoto && (
                        <button
                          onClick={() => setModalImage(group.IssuePhoto)}
                          className="bg-gray-600 text-white px-2 py-1 rounded text-xs hover:bg-gray-700 transition"
                        >
                          View
                        </button>
                      )}

                      {/* MIS Actions */}
                      {userDept === "MIS" && (
                        <>
                          {group.Status === "Pending" && (
                            <button
                              disabled={updating[group.TicketID] || isActionLoading}
                              onClick={() => updateStatus(group.TicketID, "InProgress")}
                              className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50 transition"
                            >
                              {updating[group.TicketID] ? "..." : "Start"}
                            </button>
                          )}
                          
                          {group.Status === "InProgress" && group.uniqueWorkBy && group.uniqueWorkBy.includes(user.name) && (
                            <button
                              disabled={updating[group.TicketID] || isActionLoading}
                              onClick={() => openDoneModal(group.TicketID, group.Issue)}
                              className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50 transition"
                            >
                              {updating[group.TicketID] ? "..." : "Done"}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* Created View Sub-tabs - Smaller */}
          <div className="flex gap-1 mb-3 border-b text-sm">
            <button
              onClick={() => setCreatedTab("pending")}
              className={`px-3 py-1.5 whitespace-nowrap transition ${
                createdTab === "pending" 
                  ? "border-b-2 border-blue-600 text-blue-600 font-medium" 
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Pending/InProgress ({createdPendingCount})
            </button>
            <button
              onClick={() => setCreatedTab("completed")}
              className={`px-3 py-1.5 whitespace-nowrap transition ${
                createdTab === "completed" 
                  ? "border-b-2 border-blue-600 text-blue-600 font-medium" 
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Completed ({createdCompletedCount})
            </button>
            <button
              onClick={() => setCreatedTab("approved")}
              className={`px-3 py-1.5 whitespace-nowrap transition ${
                createdTab === "approved" 
                  ? "border-b-2 border-blue-600 text-blue-600 font-medium" 
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Approved ({createdApprovedCount})
            </button>
          </div>

          {/* Created Tickets List - 4 Line Layout with Department */}
          <div className="space-y-2">
            {groupedCreated.length === 0 && (
              <div className="text-gray-500 text-center py-6 bg-white rounded-lg shadow-sm text-sm">
                No tickets in this section
              </div>
            )}
            
            {groupedCreated.map((group) => {
              const isActionLoading = actionLoading[group.Issue];
              
              return (
                <div key={group.Issue} className="bg-white p-3 rounded-lg shadow-sm border hover:shadow transition">
                  <div className="flex flex-col md:flex-row justify-between gap-2">
                    <div className="flex-1">
                      {/* Line 1: Ticket ID and Issue */}
                      <div className="flex items-start gap-2 mb-1">
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono whitespace-nowrap">
                          {group.TicketID}
                        </span>
                        {group.count > 1 && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded whitespace-nowrap">
                            {group.count} tickets
                          </span>
                        )}
                        <span className="font-medium text-sm line-clamp-2 flex-1">
                          {group.Issue}
                        </span>
                      </div>
                      
                      {/* Line 2: Created By and Created Date */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mb-1">
                        <span className="text-gray-500">Created By:</span>
                        <span className="font-medium">{group.CreatedBy}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500">Created:</span>
                        <span className="font-medium">{formatDate(group.CreatedDate)}</span>
                      </div>
                      
                      {/* Line 3: DEPARTMENT (NEW) */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mb-1">
                        <span className="text-gray-500">Department:</span>
                        <span className="font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                          {group.Department}
                        </span>
                      </div>
                      
                      {/* Line 4: Assigned To / Work By | Status | Done Date */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="text-gray-500">Assigned To:</span>
                        <span className="font-medium text-blue-600">
                          {group.uniqueWorkBy && group.uniqueWorkBy.length > 0 
                            ? group.uniqueWorkBy.join(", ") 
                            : "MIS"}
                        </span>
                        
                        <span className="text-gray-400">•</span>
                        
                        <span className="text-gray-500">Status:</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium
                          ${group.Status === "Pending" ? "bg-yellow-100 text-yellow-800" : ""}
                          ${group.Status === "InProgress" ? "bg-blue-100 text-blue-800" : ""}
                          ${group.Status === "Done" ? "bg-green-100 text-green-800" : ""}
                        `}>
                          {group.Status}
                        </span>
                        
                        {group.Taskcompletedapproval === "Approved" && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded text-xs font-medium">
                              ✓ Approved
                            </span>
                          </>
                        )}
                        
                        {group.DoneDate && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500">Done:</span>
                            <span className="font-medium text-green-600">
                              {formatDate(group.DoneDate)}
                            </span>
                          </>
                        )}
                        
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-400">
                          {timeAgo(group.CreatedDate)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons - Compact */}
                    <div className="flex flex-row items-center gap-1 mt-2 md:mt-0 md:ml-2">
                      {group.IssuePhoto && (
                        <button
                          onClick={() => setModalImage(group.IssuePhoto)}
                          className="bg-gray-600 text-white px-2 py-1 rounded text-xs hover:bg-gray-700 transition"
                        >
                          View
                        </button>
                      )}

                      {/* For Created view - Completed tab: Show Approve/Reject dropdown */}
                      {createdTab === "completed" && group.Status === "Done" && userDept !== "MIS" && (
                        <div className="relative">
                          <button
                            onClick={() => setShowDropdown({ ...showDropdown, [group.Issue]: !showDropdown[group.Issue] })}
                            disabled={isActionLoading}
                            className="bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700 transition flex items-center gap-1 disabled:opacity-50"
                          >
                            {isActionLoading ? "..." : (
                              <>
                                <span>Actions</span>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </>
                            )}
                          </button>
                          
                          {showDropdown[group.Issue] && !isActionLoading && (
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border text-xs">
                              <button
                                onClick={async () => {
                                  const success = await updateGroupStatus(group, "Approved", "Approv");
                                  if (success) {
                                    setShowDropdown({ ...showDropdown, [group.Issue]: false });
                                  }
                                }}
                                className="block w-full text-left px-3 py-2 text-green-700 hover:bg-green-50 transition font-medium border-b"
                              >
                                ✓ Approve All
                              </button>
                              <button
                                onClick={async () => {
                                  const success = await updateGroupStatus(group, "Pending", "Reject");
                                  if (success) {
                                    setShowDropdown({ ...showDropdown, [group.Issue]: false });
                                  }
                                }}
                                className="block w-full text-left px-3 py-2 text-red-700 hover:bg-red-50 transition"
                              >
                                ↺ Reject All
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Show approved badge in approved tab */}
                      {createdTab === "approved" && group.Taskcompletedapproval === "Approved" && (
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">
                          ✓ Approved
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Done Modal */}
      {doneModal.isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4"
          onClick={() => setDoneModal({ isOpen: false, ticketId: null, issue: "", problem: "", solution: "" })}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Complete Ticket</h3>
              <button
                onClick={() => setDoneModal({ isOpen: false, ticketId: null, issue: "", problem: "", solution: "" })}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issue / Problem
                </label>
                <div className="bg-gray-50 p-3 rounded border text-sm">
                  {doneModal.issue}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Where was the problem? *
                </label>
                <textarea
                  className="w-full border p-3 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  rows="3"
                  placeholder="Example : FMS 26, Recruitmet onboarding sheet ......."
                  value={doneModal.problem}
                  onChange={(e) => setDoneModal({ ...doneModal, problem: e.target.value })}
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  What solution did you implement? *
                </label>
                <textarea
                  className="w-full border p-3 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  rows="3"
                  placeholder="Describe the solution you implemented..."
                  value={doneModal.solution}
                  onChange={(e) => setDoneModal({ ...doneModal, solution: e.target.value })}
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setDoneModal({ isOpen: false, ticketId: null, issue: "", problem: "", solution: "" })}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={submitDoneDetails}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                >
                  Submit & Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {modalImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4"
          onClick={() => setModalImage(null)}
        >
          <div className="relative max-w-2xl max-h-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setModalImage(null);
              }}
              className="absolute top-2 right-2 text-white bg-red-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold hover:bg-red-700 z-10 transition"
            >
              ×
            </button>
            <img
              src={modalImage}
              alt="Issue"
              className="max-w-full max-h-[80vh] rounded shadow-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}