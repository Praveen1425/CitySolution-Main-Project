// components/common/StatusIcon.js
import React from "react";
import { Clock, CheckCircle } from "lucide-react";

 function StatusIcon({ status }) {
  switch (status) {
    case "Pending":
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case "In Progress":
      return <div className="h-4 w-4 rounded-full bg-blue-500 animate-pulse" />;
    case "Resolved":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    default:
      return null;
  }
}

export default StatusIcon