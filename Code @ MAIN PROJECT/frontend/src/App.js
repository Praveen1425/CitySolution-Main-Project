// App.js
import React, { useState, useEffect } from "react";
import { authAPI } from "./utils/api";

// Layout Components
import Header from "./components/layout/Header";
import Navigation from "./components/layout/Navigation";
import Notification from "./components/layout/Notification";

// Auth Components
import AuthPage from "./components/auth/AuthPage";

// Page Components
import IssueFeed from "./pages/IssueFeed";
import ReportIssue from "./pages/ReportIssue";
import MyIssues from "./pages/MyIssues";
import Analytics from "./pages/Analytics";
import MapView from "./pages/MapView";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("feed");
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const response = await authAPI.getMe();
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          localStorage.removeItem("token");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("token");
      }
    }
    setLoading(false);
  };

  const handleLogin = (userData, token) => {
    localStorage.setItem("token", token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setActiveView("feed");
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading CitySolution...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={handleLogout} />
      <Navigation activeView={activeView} setActiveView={setActiveView} />
      <Notification notification={notification} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === "feed" && (
          <IssueFeed user={user} showNotification={showNotification} />
        )}
        {activeView === "report" && (
          <ReportIssue
            user={user}
            onSuccess={() => {
              setActiveView("my-issues");
              showNotification("Issue reported successfully!");
            }}
          />
        )}
        {activeView === "my-issues" && (
          <MyIssues user={user} showNotification={showNotification} />
        )}
        {activeView === "analytics" && <Analytics />}
        {activeView === "map" && <MapView />}
      </main>
    </div>
  );
}
