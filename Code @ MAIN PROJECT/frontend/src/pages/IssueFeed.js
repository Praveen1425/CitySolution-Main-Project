// pages/IssueFeed.js
import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { issuesAPI } from "../utils/api";
import { CATEGORIES, STATUSES } from "../utils/constants";
import IssueCard from "../components/issues/IssueCard";
import IssueDetailModal from "../components/issues/IssueDetailModal";

export default function IssueFeed({ user, showNotification }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    category: "all",
    status: "all",
    sortBy: "newest",
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
  });
  const [selectedIssue, setSelectedIssue] = useState(null);

  useEffect(() => {
    fetchIssues();
  }, [filters, pagination.currentPage]);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.currentPage,
        limit: 10,
        ...filters,
      };

      const response = await issuesAPI.getAll(params);

      if (response.ok) {
        const data = await response.json();
        setIssues(data.issues);
        setPagination({
          currentPage: data.currentPage,
          totalPages: data.totalPages,
          totalCount: data.totalCount,
        });
      }
    } catch (error) {
      console.error("Failed to fetch issues:", error);
      showNotification("Failed to fetch issues", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (issueId) => {
    try {
      const response = await issuesAPI.vote(issueId);

      if (response.ok) {
        setIssues(
          issues.map((issue) =>
            issue.id === issueId
              ? { ...issue, voteCount: issue.voteCount + 1, hasVoted: true }
              : issue
          )
        );
        showNotification("Vote recorded successfully!");
      } else {
        const error = await response.json();
        showNotification(error.error || "Failed to vote", "error");
      }
    } catch (error) {
      console.error("Failed to vote:", error);
      showNotification("Failed to vote", "error");
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, currentPage: 1 });
  };

  return (
    <div>
      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Filter className="h-5 w-5 mr-2" />
          Filter Issues
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search issues..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange("category", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange("sortBy", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="newest">Newest First</option>
              <option value="most-voted">Most Voted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          Showing {issues.length} of {pagination.totalCount} issues
        </p>
        <button
          onClick={fetchIssues}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Issues List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : issues.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="text-gray-400 mb-4">
            <FileText className="h-16 w-16 mx-auto" />
          </div>
          <p className="text-xl font-medium text-gray-900 mb-2">
            No issues found
          </p>
          <p className="text-gray-600">
            Try adjusting your filters or search criteria
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onVote={handleVote}
              onViewDetails={() => setSelectedIssue(issue)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center space-x-2">
          <button
            onClick={() =>
              setPagination({
                ...pagination,
                currentPage: Math.max(1, pagination.currentPage - 1),
              })
            }
            disabled={pagination.currentPage === 1}
            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center space-x-1">
            {[...Array(pagination.totalPages)].map((_, i) => {
              const page = i + 1;
              if (
                page === 1 ||
                page === pagination.totalPages ||
                (page >= pagination.currentPage - 1 &&
                  page <= pagination.currentPage + 1)
              ) {
                return (
                  <button
                    key={page}
                    onClick={() =>
                      setPagination({ ...pagination, currentPage: page })
                    }
                    className={`px-3 py-1 rounded-lg ${
                      page === pagination.currentPage
                        ? "bg-blue-600 text-white"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {page}
                  </button>
                );
              } else if (
                page === pagination.currentPage - 2 ||
                page === pagination.currentPage + 2
              ) {
                return (
                  <span key={page} className="px-1">
                    ...
                  </span>
                );
              }
              return null;
            })}
          </div>

          <button
            onClick={() =>
              setPagination({
                ...pagination,
                currentPage: Math.min(
                  pagination.totalPages,
                  pagination.currentPage + 1
                ),
              })
            }
            disabled={pagination.currentPage === pagination.totalPages}
            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Issue Detail Modal */}
      {selectedIssue && (
        <IssueDetailModal
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onVote={handleVote}
        />
      )}
    </div>
  );
}
