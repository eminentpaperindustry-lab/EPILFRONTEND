import React, { useEffect, useState, useContext } from "react";
import axios from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import customParseFormat from "dayjs/plugin/customParseFormat";
import advancedFormat from "dayjs/plugin/advancedFormat"; // For better formatting options
import localizedFormat from "dayjs/plugin/localizedFormat"; // For localized date formats
import localeData from "dayjs/plugin/localeData"; // For more locale support
import "dayjs/locale/en-in"; // Import Indian locale

dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);
dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);
dayjs.extend(localeData);

// Set the locale globally to India
dayjs.locale("en-in");


const DATE_FORMAT = "DD/MM/YYYY HH:mm:ss";
export default function HelpTickets() {
  const { user } = useContext(AuthContext);
  const parseDate = (dateStr) => dayjs(dateStr, DATE_FORMAT);

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalImage, setModalImage] = useState(null);
    const timeAgo = (dateStr) => {
    const date = parseDate(dateStr);
    return date.fromNow(); // Relative time (e.g., "2 hours ago")
  };

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

  const formatDate = (dateString) => {
    const unixTimestamp = dayjs.unix(dateString);
    if (unixTimestamp.isValid()) {
      return unixTimestamp.format("DD/MM/YYYY HH:mm:ss");
    }

    const isoDate = dayjs(dateString);
    if (isoDate.isValid()) {
      return isoDate.format("DD/MM/YYYY HH:mm:ss");
    }

    const customDate = dayjs(dateString, "DD/MM/YYYY HH:mm:ss");
    if (customDate.isValid()) {
      return customDate.format("DD/MM/YYYY HH:mm:ss");
    }

    console.error("Invalid Date:", dateString);
    return "Invalid Date";
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
          t.Status!=="Done"&&<div
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
                  ${t.Status === "Pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : t.Status === "InProgress"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-green-100 text-green-800"}`}
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
                {formatDate(t.CreatedDate)} {/* Format date using helper function */}
              </div>
              <div>
                <span className="font-medium text-gray-700">Elapsed:</span>{" "}
                {timeAgo(t.CreatedDate)} {/* Using fromNow() for relative time */}
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
