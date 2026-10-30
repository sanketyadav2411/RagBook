import { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import api from "./lib/api";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import NotesPage from "./pages/NotesPage";
import NoteDetailPage from "./pages/NoteDetailPage";

interface User {
  id: string;
  name: string;
  email: string;
}

function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    localStorage.getItem("ragbook-theme") === "dark" ? "dark" : "light"
  );
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("ragbook-theme", theme);
  }, [theme]);
  const toggleTheme = () => setTheme((current) => current === "light" ? "dark" : "light");

  const handleLogin = () => {
    checkAuth();
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Even if the request fails, clear local state
    }
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            user ? <Navigate to="/notes" replace /> : <LoginPage onLogin={handleLogin} theme={theme} onToggleTheme={toggleTheme} />
          }
        />
        <Route
          path="/register"
          element={
            user ? <Navigate to="/notes" replace /> : <RegisterPage onLogin={handleLogin} theme={theme} onToggleTheme={toggleTheme} />
          }
        />
        <Route
          path="/notes"
          element={
            user ? (
              <NotesPage user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/notes/:id"
          element={
            user ? <NoteDetailPage theme={theme} onToggleTheme={toggleTheme} /> : <Navigate to="/login" replace />
          }
        />
        <Route path="/" element={<Navigate to="/notes" replace />} />
        <Route path="*" element={<Navigate to="/notes" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
