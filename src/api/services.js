import axios from "./axios";

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

export const loginDoer = (employeeID, password) =>
  axios.post("/auth/login", { employeeID, password });

export const registerDoer = (data) =>
  axios.post("/auth/register", data);

export const getAllEmployees = () =>
  axios.get("/employee/all", authHeader());

export const getUserProfile = () =>
  axios.get("/employee/profile", authHeader());

export const updateProfile = (formData) =>
  axios.put("/employee/update-profile", formData, {
    headers: { ...authHeader().headers, "Content-Type": "multipart/form-data" },
  });

export const searchDelegationByName = (name) =>
  axios.get(`/delegations/search/by-name?name=${encodeURIComponent(name)}`, authHeader());

export const markDelegationDone = (taskID) =>
  axios.patch(`/delegations/done/${taskID}`, null, authHeader());

export const shiftDelegation = (taskID, newDeadline, revisionField) =>
  axios.patch(`/delegations/shift/${taskID}`, { newDeadline, revisionField }, authHeader());

export const getChecklist = () =>
  axios.get("/checklist/", authHeader());

export const markChecklistDone = (taskID) =>
  axios.patch(`/checklist/done/${taskID}`, {}, authHeader());

export const createHelpTicket = (formData) =>
  axios.post("/helpTickets/create", formData, {
    headers: { ...authHeader().headers, "Content-Type": "multipart/form-data" },
  });

export const getAssignedHelpTickets = () =>
  axios.get("/helpTickets/assigned", authHeader());

export const getCreatedHelpTickets = () =>
  axios.get("/helpTickets/created", authHeader());

export const updateHelpTicketStatus = (ticketID, Status) =>
  axios.patch(`/helpTickets/status/${encodeURIComponent(ticketID)}`, { Status }, authHeader());

export const createSupportTicket = (formData) =>
  axios.post("/support-tickets/create", formData, {
    headers: { ...authHeader().headers, "Content-Type": "multipart/form-data" },
  });

export const getAssignedSupportTickets = () =>
  axios.get("/support-tickets/assigned", authHeader());

export const getCreatedSupportTickets = () =>
  axios.get("/support-tickets/created", authHeader());

export const updateSupportTicketStatus = (ticketID, Status) =>
  axios.patch(`/support-tickets/status/${ticketID}`, { Status }, authHeader());

export const updateSupportTicketDetails = (ticketID, Problem, Solution) =>
  axios.patch(`/support-tickets/done-details/${ticketID}`, { Problem, Solution }, authHeader());

export const getAdditionalFeatures = () =>
  axios.get("/additionalfeature/all", authHeader());

export const addAdditionalFeature = (featureName, featureURL) =>
  axios.post("/additionalfeature/add", { featureName, featureURL }, authHeader());

// ──── WORKLIST ────
export const getMyWorklists = () =>
  axios.get("/worklist/my", authHeader());

export const createWorklist = (payload) =>
  axios.post("/worklist/", payload, authHeader());

export const updateWorklist = (id, payload) =>
  axios.put(`/worklist/${id}`, payload, authHeader());

export const deleteWorklist = (id) =>
  axios.delete(`/worklist/${id}`, authHeader());

export const bulkUploadWorklists = (worklists) =>
  axios.post("/worklist/bulk", { worklists }, authHeader());

export const downloadMyWorklists = () =>
  axios.get("/worklist/download/my", authHeader());

export const updateAITime = (id, AITime) =>
  axios.put(`/worklist/ai-time/${id}`, { AITime }, authHeader());