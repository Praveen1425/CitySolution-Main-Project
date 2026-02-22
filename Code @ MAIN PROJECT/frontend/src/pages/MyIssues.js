// pages/MyIssues.js
import React, { useState, useEffect } from "react";
import { FileText, Edit, Trash2, MapPin, Vote, Calendar } from "lucide-react";
import { issuesAPI } from "../utils/api";
import { timeSince, getCategoryColor, getStatusColor } from "../utils/helpers";
import EditIssueModal from "../components/issues/EditIssueModal";

export default function MyIssues({ user, showNotification }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingIssue, setEditingIssue] = useState(null);

  useEffect(() => {
    fetchMyIssues();
  }, []);

  const fetchMyIssues = async () => {
    try {
      const response = await issuesAPI.getMy();

      if (response.ok) {
        const data = await response.json();
        setIssues(data.issues);
      }
    } catch (error) {
      console.error("Failed to fetch issues:", error);
      showNotification("Failed to fetch your issues", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (issueId) => {
    if (!window.confirm("Are you sure you want to delete this issue?")) return;

    try {
      const response = await issuesAPI.delete(issueId);

      if (response.ok) {
        setIssues(issues.filter((issue) => issue.id !== issueId));
        showNotification("Issue deleted successfully");
      } else {
        const error = await response.json();
        showNotification(error.error || "Failed to delete issue", "error");
      }
    } catch (error) {
      console.error("Failed to delete issue:", error);
      showNotification("Failed to delete issue", "error");
    }
  };

  const handleStatusChange = async (issueId, newStatus) => {
    try {
      const response = await issuesAPI.updateStatus(issueId, newStatus);

      if (response.ok) {
        setIssues(
          issues.map((issue) =>
            issue.id === issueId ? { ...issue, status: newStatus } : issue
          )
        );
        showNotification("Status updated successfully");
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      showNotification("Failed to update status", "error");
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Reported Issues</h2>
        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
          {issues.length} Issues
        </span>
      </div>

      {issues.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="text-gray-400 mb-4">
            <FileText className="h-16 w-16 mx-auto" />
          </div>
          <p className="text-xl font-medium text-gray-900 mb-2">
            No issues reported yet
          </p>
          <p className="text-gray-600 mb-6">
            Start by reporting your first civic issue
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {issues.map((issue) => (
            <div key={issue.id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {issue.title}
                  </h3>
                  <p className="text-gray-600">{issue.description}</p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      issue.status
                    )}`}
                  >
                    {issue.status}
                  </span>
                  {issue.status === "Pending" && (
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setEditingIssue(issue)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit issue"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(issue.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete issue"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4 text-gray-600">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(
                      issue.category
                    )}`}
                  >
                    {issue.category}
                  </span>
                  <span className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {issue.location}
                  </span>
                  <span className="flex items-center">
                    <Vote className="h-4 w-4 mr-1" />
                    {issue.voteCount} votes
                  </span>
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {timeSince(issue.createdAt)}
                  </span>
                </div>

                {/* Status change buttons (for demo purposes) */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 mr-2">
                    Change status:
                  </span>
                  <button
                    onClick={() => handleStatusChange(issue.id, "In Progress")}
                    className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
                    disabled={issue.status === "In Progress"}
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => handleStatusChange(issue.id, "Resolved")}
                    className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100 transition"
                    disabled={issue.status === "Resolved"}
                  >
                    Resolved
                  </button>
                </div>
              </div>

              {issue.imageUrl && (
                <div className="mt-4">
                  <img
                    // src={`http://localhost:5001${issue.imageUrl}`}
                    src={`https://civicsync-project.onrender.com${issue.imageUrl}`}
                    alt="Issue"
                    className="rounded-lg max-h-32 object-cover"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingIssue && (
        <EditIssueModal
          issue={editingIssue}
          onClose={() => setEditingIssue(null)}
          onSuccess={() => {
            setEditingIssue(null);
            fetchMyIssues();
            showNotification("Issue updated successfully");
          }}
        />
      )}
    </div>
  );
}
