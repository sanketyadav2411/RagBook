import axios from "axios";

const api = axios.create({
  baseURL: `${(import.meta.env.VITE_API_URL || "").replace(/\/$/, "")}/api`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
