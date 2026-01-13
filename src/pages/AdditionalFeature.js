import React, { useState, useEffect, useContext } from "react";
import axios from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

export default function AdditionalFeature() {
  const { user } = useContext(AuthContext);

  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [featureName, setFeatureName] = useState("");
  const [featureURL, setFeatureURL] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ---------------- GET USER FEATURES ----------------
  const loadFeatures = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const res = await axios.get("/additionalFeature/all", {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setFeatures(res.data || []);
    } catch (err) {
      toast.error("Failed to load features");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeatures();
  }, [user]);

  // ---------------- ADD FEATURE ----------------
  const handleAddFeature = async (e) => {
    e.preventDefault();
    if (!featureName || !featureURL) {
      toast.warn("Please fill both fields");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post("/additionalFeature/add", {
        featureName,
        featureURL
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      toast.success("Feature added successfully");
      setFeatureName("");
      setFeatureURL("");
      setShowModal(false);

      // Reload user's features
      loadFeatures();
    } catch (err) {
      toast.error("Failed to add feature");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800 text-center">Additional Features</h1>

      {/* Add Feature Button */}
      <div className="flex justify-center mb-6">
        <button
          className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white px-6 py-3 rounded-lg shadow-lg transition duration-300"
          onClick={() => setShowModal(true)}
        >
          + Add Additional Feature
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg relative">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Add Feature</h2>

            <form onSubmit={handleAddFeature} className="space-y-4">
              <div>
                <label className="block mb-1 font-medium text-gray-700">Feature Name</label>
                <input
                  type="text"
                  value={featureName}
                  onChange={(e) => setFeatureName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  placeholder="Enter feature name"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium text-gray-700">Feature URL</label>
                <input
                  type="url"
                  value={featureURL}
                  onChange={(e) => setFeatureURL(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  placeholder="Enter feature URL"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 transition"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Add Feature"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feature List */}
      <div className="grid sm:grid-cols-2 gap-4">
        {loading ? (
          <p className="text-center col-span-full text-gray-500">Loading features...</p>
        ) : features.length === 0 ? (
          <p className="text-center col-span-full text-gray-500">No additional features added yet.</p>
        ) : (
          features.map((f, idx) => (
            <div
              key={idx}
              className="bg-white shadow-md rounded-lg p-4 hover:shadow-xl transition cursor-pointer flex flex-col justify-between"
            >
              <div className="mb-2">
                <h3 className="text-lg font-semibold text-gray-800 mb-1">{f.FeatureName}</h3>
                {/* <p className="text-sm text-gray-500">Added on: {new Date(f.CreatedAt).toLocaleDateString()}</p> */}
              </div>
              <a
                href={f.FeatureURL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-blue-600 font-medium underline hover:text-blue-800 hover:scale-105 transition transform"
              >
                Open Feature
              </a>
            </div>
          ))
        )}
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
