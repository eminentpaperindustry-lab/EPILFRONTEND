import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  FaTasks,
  FaClipboardList,
  FaLifeRing,
  FaHeadset,
  FaBars,
  FaTimes,
} from "react-icons/fa";

const MenuItem = ({ to, children, icon: Icon, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-md transition-colors duration-200 font-medium ${
        isActive
          ? "bg-blue-600 text-white shadow-lg"
          : "text-gray-200 hover:bg-gray-800 hover:text-white"
      }`
    }
  >
    {Icon && <Icon className="w-5 h-5" />}
    <span>{children}</span>
  </NavLink>
);

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Hamburger */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-gray-900 text-white p-2 rounded-md shadow-lg focus:outline-none"
        onClick={toggleSidebar}
        aria-label="Toggle Menu"
      >
        {isOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          w-64 bg-gray-900 text-white flex flex-col"
          ${isOpen ? "translate-x-0" : "-translate-x-full"} 
          md:translate-x-0 md:static md:flex md:flex-col`}
      >
        {/* Logo / Header */}
        <div className="px-6 py-5 border-b border-gray-800">
          <div className="text-2xl font-bold text-white">Employee Portal</div>
          <div className="text-xs text-gray-400 mt-1">Task Management</div>
        </div>

        {/* Navigation */}
        <nav className="p-8 flex-1 space-y-1">
          <MenuItem to="/delegation" icon={FaTasks} onClick={closeSidebar}>
            Delegation
          </MenuItem>
          <MenuItem to="/checklist" icon={FaClipboardList} onClick={closeSidebar}>
            Checklist
          </MenuItem>
          <MenuItem to="/help-ticket" icon={FaLifeRing} onClick={closeSidebar}>
            Help Ticket
          </MenuItem>
          <MenuItem to="/support-ticket" icon={FaHeadset} onClick={closeSidebar}>
            Support Ticket
          </MenuItem>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 text-xs text-gray-500 text-center">
          © {new Date().getFullYear()} Eminent Paper Industry LLP
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          aria-hidden="true"
        />
      )}
    </>
  );
}
