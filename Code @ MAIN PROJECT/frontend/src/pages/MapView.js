// pages/MapView.js
import React, { useState, useEffect } from 'react';
import { XCircle, CheckCircle } from 'lucide-react';
import { issuesAPI } from '../utils/api';
import { getMarkerColor, getCategoryColor, getStatusColor } from '../utils/helpers';
import StatusIcon from '../components/common/StatusIcon';

export default function MapView() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [hoveredIssue, setHoveredIssue] = useState(null);

  useEffect(() => {
    fetchIssuesForMap();
  }, []);

  const fetchIssuesForMap = async () => {
    try {
      const response = await issuesAPI.getAll({ limit: 100 });

      if (response.ok) {
        const data = await response.json();
        // For demo purposes, assign random coordinates if not available
        const issuesWithCoords = data.issues.map(issue => ({
          ...issue,
          latitude: issue.latitude || 30.7333 + (Math.random() - 0.5) * 0.1,
          longitude: issue.longitude || 76.7794 + (Math.random() - 0.5) * 0.1
        }));
        setIssues(issuesWithCoords);
      }
    } catch (error) {
      console.error('Failed to fetch issues for map:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Issue Map View</h2>
        <span className="text-sm text-gray-600">{issues.length} issues mapped</span>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Legend */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Categories:</span>
            <div className="flex items-center space-x-4">
              {['Road', 'Water', 'Sanitation', 'Electricity', 'Other'].map(category => (
                <div key={category} className="flex items-center space-x-1">
                  <div
                    className="w-3 h-3 rounded-full shadow"
                    style={{ backgroundColor: getMarkerColor(category) }}
                  />
                  <span className="text-xs text-gray-600">{category}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="relative bg-gradient-to-br from-blue-50 to-green-50" style={{ height: '600px' }}>
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="gray" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Center point */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          </div>

          {/* Issue markers */}
          {issues.map(issue => {
            const x = ((issue.longitude - 76.7294) / 0.2) * 100 + 50;
            const y = 50 - ((issue.latitude - 30.7333) / 0.2) * 100;
            
            return (
              <div
                key={issue.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  zIndex: selectedIssue?.id === issue.id ? 20 : hoveredIssue?.id === issue.id ? 15 : 10
                }}
                onClick={() => setSelectedIssue(issue)}
                onMouseEnter={() => setHoveredIssue(issue)}
                onMouseLeave={() => setHoveredIssue(null)}
              >
                {/* Marker */}
                <div className="relative">
                  <div
                    className={`w-6 h-6 rounded-full border-2 border-white shadow-lg transform transition-all ${
                      selectedIssue?.id === issue.id || hoveredIssue?.id === issue.id ? 'scale-150' : 'hover:scale-125'
                    }`}
                    style={{ backgroundColor: getMarkerColor(issue.category) }}
                  >
                    {issue.status === 'Resolved' && (
                      <CheckCircle className="h-3 w-3 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    )}
                  </div>
                  
                  {/* Hover tooltip */}
                  {hoveredIssue?.id === issue.id && (
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                      {issue.title}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Selected issue popup */}
          {selectedIssue && (
            <IssuePopup issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
          )}
        </div>

        {/* Map Controls */}
        <div className="p-4 bg-gray-50 border-t">
          <p className="text-sm text-gray-600 text-center">
            Click on markers to view issue details • Hover to see issue title
          </p>
        </div>
      </div>

      {/* Issue List */}
      <IssueList issues={issues} onSelectIssue={setSelectedIssue} />
    </div>
  );
}

// Issue Popup Component
function IssuePopup({ issue, onClose }) {
  return (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-xl p-6 max-w-sm z-30">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        <XCircle className="h-5 w-5" />
      </button>
      
      <h3 className="font-semibold text-gray-900 mb-3 pr-6">{issue.title}</h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Category:</span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(issue.category)}`}>
            {issue.category}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Status:</span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(issue.status)}`}>
            {issue.status}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Votes:</span>
          <span className="font-semibold">{issue.voteCount}</span>
        </div>
        <div className="pt-2 border-t">
          <p className="text-gray-600 text-xs">Location:</p>
          <p className="text-gray-900 text-sm">{issue.location}</p>
        </div>
      </div>
    </div>
  );
}

// Issue List Component
function IssueList({ issues, onSelectIssue }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">All Mapped Issues</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {issues.map(issue => (
          <div 
            key={issue.id} 
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
            onClick={() => onSelectIssue(issue)}
          >
            <div className="flex items-center space-x-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: getMarkerColor(issue.category) }}
              />
              <div>
                <p className="font-medium text-gray-900 text-sm">{issue.title}</p>
                <p className="text-xs text-gray-600">{issue.location}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">{issue.voteCount} votes</span>
              <StatusIcon status={issue.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}