import { createContext, useState, useEffect } from "react";
import axios from "../api/axios";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // Initial user and token check in localStorage on page load
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser)); // Set the user data in state
      setToken(savedToken);           // Set the token in state
    }
  }, []);

  // Login function with error handling
  const login = async (employeeID, password) => {
    try {
      const res = await axios.post("/auth/login", { employeeID, password });
      setUser(res.data.user); // Set user in state
      setToken(res.data.token); // Set token in state
      localStorage.setItem("user", JSON.stringify(res.data.user)); // Store user in localStorage
      localStorage.setItem("token", res.data.token); // Store token in localStorage
    } catch (error) {
      console.error("Login failed:", error);
      throw new Error("Invalid credentials or network error");
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
