// import React, { useEffect, useState, useContext, useRef } from "react";
// import axios from "../api/axios";
// import { AuthContext } from "../context/AuthContext";
// import dayjs from "dayjs";
// import relativeTime from "dayjs/plugin/relativeTime";

// dayjs.extend(relativeTime);

// export default function HelpTickets() {
//   const { user } = useContext(AuthContext);

//   const [employees, setEmployees] = useState([]);
//   const [assignedTickets, setAssignedTickets] = useState([]);
//   const [createdTickets, setCreatedTickets] = useState([]);
//   const [activeTab, setActiveTab] = useState("assigned");
//   const [form, setForm] = useState({ AssignedTo: "", Issue: "", IssuePhoto: null });
//   const [creating, setCreating] = useState(false);
//   const [updating, setUpdating] = useState({});
//   const [loading, setLoading] = useState(true);
//   const [modalImage, setModalImage] = useState(null);

//   const fileInputRef = useRef();
//   const authHeader = { headers: { Authorization: `Bearer ${user.token}` } };

//   const loadEmployees = async () => {
//     try {
//       const res = await axios.get("/employee/all", authHeader);
//       setEmployees((res.data || []).filter(e => e.name !== user.name));
//     } catch (err) {
//       console.error("Failed to load employees:", err);
//     }
//   };

//   const loadTickets = async () => {
//     try {
//       const [assignedRes, createdRes] = await Promise.all([
//         axios.get("/helpTickets/assigned", authHeader),
//         axios.get("/helpTickets/created", authHeader),
//       ]);
//       setAssignedTickets((assignedRes.data || []).filter(t => t.Status !== "Done"));
//       setCreatedTickets((createdRes.data || []).filter(t => t.Status !== "Done"));
//     } catch (err) {
//       console.error("Failed to load tickets:", err);
//     }
//     setLoading(false);
//   };

//   useEffect(() => {
//     loadEmployees();
//     loadTickets();
//   }, []);

//   const handleFileChange = (e) => {
//     setForm(prev => ({ ...prev, IssuePhoto: e.target.files[0] }));
//   };

//   const createTicket = async () => {
//     if (!form.AssignedTo || !form.Issue) return alert("All fields required");
//     setCreating(true);

//     try {
//       const formData = new FormData();
//       formData.append("AssignedTo", form.AssignedTo);
//       formData.append("Issue", form.Issue);
//       if (form.IssuePhoto) formData.append("IssuePhoto", form.IssuePhoto);

//       await axios.post("/helpTickets/create", formData, {
//         headers: { ...authHeader.headers, "Content-Type": "multipart/form-data" },
//       });

//       setForm({ AssignedTo: "", Issue: "", IssuePhoto: null });
//       if (fileInputRef.current) fileInputRef.current.value = null;

//       await loadTickets();
//     } catch (err) {
//       alert(err.response?.data?.error || "Failed to create ticket");
//     }

//     setCreating(false);
//   };

//   const updateStatus = async (id, status) => {
//     setUpdating(p => ({ ...p, [id]: true }));
//     try {
//       await axios.patch(`/helpTickets/status/${id}`, { Status: status }, authHeader);
//       await loadTickets();
//     } catch (err) {
//       alert(err.response?.data?.error || "Failed to update status");
//     }
//     setUpdating(p => ({ ...p, [id]: false }));
//   };

//   if (loading) return <div>Loading...</div>;
//   const tickets = activeTab === "assigned" ? assignedTickets : createdTickets;

//   return (
//     <div className="p-6">
//       <h2 className="text-2xl font-semibold mb-4">Help Tickets</h2>

//       {/* Create Ticket Form */}
//       <div className="bg-white p-4 rounded shadow mb-6">
//         <h3 className="font-semibold mb-2">Create Ticket</h3>

//         <select
//           className="w-full border p-2 rounded mb-2"
//           value={form.AssignedTo}
//           onChange={(e) => setForm({ ...form, AssignedTo: e.target.value })}
//         >
//           <option value="">Select Employee</option>
//           {employees.map(e => (
//             <option key={e.name} value={e.name}>{e.name}</option>
//           ))}
//         </select>

//         <textarea
//           className="w-full border p-2 rounded mb-2"
//           placeholder="Issue"
//           value={form.Issue}
//           onChange={(e) => setForm({ ...form, Issue: e.target.value })}
//         />

//         <input
//           ref={fileInputRef}
//           type="file"
//           accept="image/*"
//           onChange={handleFileChange}
//           className="mb-2"
//         />

//         {form.IssuePhoto && (
//           <img
//             src={URL.createObjectURL(form.IssuePhoto)}
//             alt="preview"
//             className="w-32 h-32 object-cover mb-2 border rounded"
//           />
//         )}

//         <button
//           disabled={creating}
//           onClick={createTicket}
//           className={`px-4 py-2 rounded text-white ${creating ? "bg-gray-400" : "bg-green-600"}`}
//         >
//           {creating ? "Creating..." : "Create Ticket"}
//         </button>
//       </div>

//       {/* Tabs */}
//       <div className="flex gap-3 mb-4">
//         <button
//           onClick={() => setActiveTab("assigned")}
//           className={`px-4 py-2 rounded ${activeTab === "assigned" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
//         >
//           Assigned To Me
//         </button>
//         <button
//           onClick={() => setActiveTab("created")}
//           className={`px-4 py-2 rounded ${activeTab === "created" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
//         >
//           Created By Me
//         </button>
//       </div>

//       {/* Tickets List */}
//       <div className="grid gap-4">
//         {tickets.length === 0 && <div className="text-gray-500">No tickets available</div>}
//         {tickets.map((t) => (
//           <div key={t.TicketID} className="bg-white p-4 rounded shadow flex flex-col md:flex-row justify-between items-start md:items-center">
//             <div className="flex-1">
//               <div className="font-semibold text-lg mb-1">{t.Issue}</div>
//               <div className="text-sm">Created By: <span className="font-medium">{t.CreatedBy}</span></div>
//               <div className="text-sm">Assigned To: <span className="font-medium">{t.AssignedTo}</span></div>
//               <div className="text-sm">Created Date: <span className="font-medium">{dayjs(t.CreatedDate).format("DD MMM YYYY, HH:mm")}</span></div>
//               <div className="text-sm text-gray-500">Elapsed: {dayjs(t.CreatedDate).fromNow()}</div>
//               <div className="text-sm mt-1">Status: <span className="font-medium">{t.Status}</span></div>
//             </div>

//             <div className="flex flex-col md:flex-row items-start md:items-center gap-2 mt-2 md:mt-0">
//               {t.IssuePhoto && (
//                 <button
//                   onClick={() => setModalImage(t.IssuePhoto)}
//                   className="bg-gray-700 text-white px-3 py-1 rounded"
//                 >
//                   View Image
//                 </button>
//               )}

//               {activeTab === "assigned" && t.Status === "Pending" && (
//                 <button
//                   disabled={updating[t.TicketID]}
//                   onClick={() => updateStatus(t.TicketID, "InProgress")}
//                   className="bg-blue-600 text-white px-3 py-1 rounded"
//                 >
//                   {updating[t.TicketID] ? "Updating..." : "Start"}
//                 </button>
//               )}

//               {activeTab === "created" && t.Status === "InProgress" && (
//                 <button
//                   disabled={updating[t.TicketID]}
//                   onClick={() => updateStatus(t.TicketID, "Done")}
//                   className="bg-green-600 text-white px-3 py-1 rounded"
//                 >
//                   {updating[t.TicketID] ? "Updating..." : "Mark Done"}
//                 </button>
//               )}
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* Image Modal */}
//       {modalImage && (
//         <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
//           <div className="relative">
//             <button
//               onClick={() => setModalImage(null)}
//               className="absolute top-2 right-2 text-white bg-red-600 rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold hover:bg-red-700"
//             >
//               &times;
//             </button>
//             <img
//               src={modalImage}
//               alt="Issue"
//               className="max-w-[90vw] max-h-[90vh] rounded shadow-lg object-contain"
//             />
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

import React, { useEffect, useState, useContext } from "react";
import axios from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export default function HelpTickets() {
  const { user } = useContext(AuthContext);

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalImage, setModalImage] = useState(null);

  const authHeader = { headers: { Authorization: `Bearer ${user.token}` } };

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const res = await axios.get("/helpTickets/assigned", authHeader);
      setTickets(res.data || []);
    } catch (err) {
      console.error("Failed to load tickets:", err);
    }
    setLoading(false);
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Page Title */}
      <h2 className="text-3xl font-bold mb-6">Help Tickets</h2>

      {/* Active Tab */}
      <div className="mb-6">
        <button className="px-6 py-2 bg-blue-600 text-white rounded-full font-medium shadow">
          Assigned To Me
        </button>
      </div>

      {/* Tickets */}
      <div className="grid gap-6">
        {tickets.length === 0 && (
          <div className="text-gray-500 bg-white p-6 rounded shadow">
            No help tickets assigned to you
          </div>
        )}

        {tickets.map((t) => (
          <div
            key={t.TicketID}
            className="bg-white rounded-xl shadow p-6 border"
          >
            {/* Issue */}
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-xl font-semibold text-gray-800">
                {t.Issue}
              </h3>

              {/* Status Badge */}
              <span
                className={`px-4 py-1 rounded-full text-sm font-semibold
                  ${
                    t.Status === "Pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : t.Status === "InProgress"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-green-100 text-green-800"
                  }`}
              >
                {t.Status}
              </span>
            </div>

            {/* Details */}
            <div className="grid md:grid-cols-2 gap-y-2 text-sm text-gray-600">
              <div>
                <span className="font-medium text-gray-700">Created By:</span>{" "}
                {t.CreatedBy}
              </div>
              <div>
                <span className="font-medium text-gray-700">Assigned To:</span>{" "}
                {t.AssignedTo}
              </div>
              <div>
                <span className="font-medium text-gray-700">Created Date:</span>{" "}
                {dayjs(t.CreatedDate).format("DD MMM YYYY, HH:mm")}
              </div>
              <div>
                <span className="font-medium text-gray-700">Elapsed:</span>{" "}
                {dayjs(t.CreatedDate).fromNow()}
              </div>
            </div>

            {/* Image */}
            {t.IssuePhoto && (
              <div className="mt-4">
                <button
                  onClick={() => setModalImage(t.IssuePhoto)}
                  className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
                >
                  View Image
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Image Modal */}
      {modalImage && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="relative">
            <button
              onClick={() => setModalImage(null)}
              className="absolute top-2 right-2 bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold"
            >
              ×
            </button>
            <img
              src={modalImage}
              alt="Issue"
              className="max-w-[90vw] max-h-[90vh] rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
