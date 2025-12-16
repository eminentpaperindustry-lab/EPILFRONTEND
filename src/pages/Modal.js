// src/pages/Modal.js

import React from "react";

function Modal({ data, onClose }) {
  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-gray-700 bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded shadow-lg w-1/3">
        <h2 className="text-xl font-semibold mb-4">Task Details</h2>
        <pre>{JSON.stringify(data, null, 2)}</pre>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-500 text-white rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default Modal;
