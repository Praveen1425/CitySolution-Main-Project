// components/layout/Notification.js
import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

 function Notification({ notification }) {
  if (!notification) return null;

  return (
    <div className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg transition-all transform ${
      notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white`}>
      <p className="flex items-center">
        {notification.type === 'success' ? 
          <CheckCircle className="h-5 w-5 mr-2" /> : 
          <XCircle className="h-5 w-5 mr-2" />
        }
        {notification.message}
      </p>
    </div>
  );
}

export default Notification