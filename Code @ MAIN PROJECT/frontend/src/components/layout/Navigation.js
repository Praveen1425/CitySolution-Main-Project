// components/layout/Navigation.js
import React from 'react';
import { Home, FileText, User, BarChart3, Map } from 'lucide-react';

const navItems = [
  { id: 'feed', label: 'Issue Feed', icon: Home },
  { id: 'report', label: 'Report Issue', icon: FileText },
  { id: 'my-issues', label: 'My Issues', icon: User },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'map', label: 'Map View', icon: Map }
];

 function Navigation({ activeView, setActiveView }) {
  return (
    <nav className="bg-white border-b sticky top-16 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 overflow-x-auto py-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
                activeView === item.id
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default Navigation