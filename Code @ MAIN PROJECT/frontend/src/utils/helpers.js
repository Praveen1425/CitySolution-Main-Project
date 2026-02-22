// utils/helpers.js

// Helper function to get auth headers
export const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// Helper function to format time since
export const timeSince = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
};

// Category colors helper
export const getCategoryColor = (category) => {
  const colors = {
    Road: "bg-orange-100 text-orange-800 border-orange-300",
    Water: "bg-blue-100 text-blue-800 border-blue-300",
    Sanitation: "bg-green-100 text-green-800 border-green-300",
    Electricity: "bg-yellow-100 text-yellow-800 border-yellow-300",
    Other: "bg-gray-100 text-gray-800 border-gray-300",
  };
  return colors[category] || colors["Other"];
};

// Status colors helper
export const getStatusColor = (status) => {
  const colors = {
    Pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    "In Progress": "bg-blue-100 text-blue-800 border-blue-300",
    Resolved: "bg-green-100 text-green-800 border-green-300",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

// Get marker color for map
export const getMarkerColor = (category) => {
  const colors = {
    Road: "#F97316",
    Water: "#3B82F6",
    Sanitation: "#10B981",
    Electricity: "#F59E0B",
    Other: "#6B7280",
  };
  return colors[category] || colors["Other"];
};
