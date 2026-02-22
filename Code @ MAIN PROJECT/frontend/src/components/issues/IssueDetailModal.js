// components/issues/IssueDetailModal.js
import React from "react";
import {
  User,
  Calendar,
  MapPin,
  Vote,
  XCircle,
  Clock,
  CheckCircle,
} from "lucide-react";
import { getCategoryColor, getStatusColor } from "../../utils/helpers";
import BlockchainStatus from "../blockchain/BlockchainStatus";

function IssueDetailModal({ issue, onClose, onVote }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case "Pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "In Progress":
        return (
          <div className="h-4 w-4 rounded-full bg-blue-500 animate-pulse" />
        );
      case "Resolved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Issue Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {issue.title}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                {issue.userName}
              </span>
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {new Date(issue.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Category</p>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(
                  issue.category
                )}`}
              >
                {issue.category}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Status</p>
              <span
                className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                  issue.status
                )}`}
              >
                {getStatusIcon(issue.status)}
                <span>{issue.status}</span>
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Location</p>
              <p className="text-gray-900 flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {issue.location}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Votes</p>
              <p className="text-gray-900 font-semibold">{issue.voteCount}</p>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Description
            </h4>
            <p className="text-gray-700 whitespace-pre-wrap">
              {issue.description}
            </p>
          </div>

          {issue.imageUrl && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Attached Image
              </h4>
              <img
                // src={`http://localhost:5001${issue.imageUrl}`}
                src={`https://civicsync-project.onrender.com${issue.imageUrl}`}
                alt="Issue"
                className="w-full rounded-lg"
              />
            </div>
          )}

          {issue.chainHash && (
            <div className="mb-6">
              <BlockchainStatus issue={issue} />
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={() => onVote(issue.id)}
              disabled={issue.hasVoted}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition font-medium ${
                issue.hasVoted
                  ? "bg-green-100 text-green-700 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              <Vote className="h-5 w-5" />
              <span>
                {issue.hasVoted ? "You have voted" : "Vote for this issue"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IssueDetailModal