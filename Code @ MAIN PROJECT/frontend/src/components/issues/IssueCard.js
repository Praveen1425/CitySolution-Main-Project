// components/issues/IssueCard.js
import React from "react";
import { User, Calendar, MapPin, Vote, Camera, Eye } from "lucide-react";
import {
  timeSince,
  getCategoryColor,
  getStatusColor,
} from "../../utils/helpers";
import BlockchainStatus from "../blockchain/BlockchainStatus";

function IssueCard({ issue, onVote, onViewDetails }) {
  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {issue.title}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                {issue.userName}
              </span>
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {timeSince(issue.createdAt)}
              </span>
              <span className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {issue.location}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                issue.status
              )}`}
            >
              {issue.status}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(
                issue.category
              )}`}
            >
              {issue.category}
            </span>
          </div>
        </div>

        <p className="text-gray-700 mb-4 line-clamp-2">{issue.description}</p>

        {issue.chainHash && (
          <div className="mb-4">
            <BlockchainStatus issue={issue} />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onVote(issue.id)}
              disabled={issue.hasVoted}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition font-medium ${
                issue.hasVoted
                  ? "bg-green-100 text-green-700 cursor-not-allowed"
                  : "bg-blue-50 text-blue-600 hover:bg-blue-100"
              }`}
            >
              <Vote className="h-4 w-4" />
              <span>{issue.voteCount}</span>
              <span>{issue.hasVoted ? "Voted" : "Vote"}</span>
            </button>

            {issue.imageUrl && (
              <span className="flex items-center text-gray-500 text-sm">
                <Camera className="h-4 w-4 mr-1" />
                Has Image
              </span>
            )}
          </div>

          <button
            onClick={onViewDetails}
            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            <span>View Details</span>
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default IssueCard