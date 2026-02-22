// pages/Analytics.js
import React, { useState, useEffect } from 'react';
import { FileText, Vote, User, TrendingUp } from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { analyticsAPI } from '../utils/api';
import { COLORS } from '../utils/constants';
import { getCategoryColor, timeSince } from '../utils/helpers';

export default function Analytics() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await analyticsAPI.get();

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
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

  if (!analyticsData) return null;

  const categoryData = Object.entries(analyticsData.categoryCount).map(([name, value]) => ({
    name,
    value
  }));

  const statusData = Object.entries(analyticsData.statusCount).map(([name, value]) => ({
    name,
    value
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
        <button
          onClick={fetchAnalytics}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Refresh Data
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Issues"
          value={analyticsData.totalIssues}
          icon={FileText}
          color="blue"
        />
        <SummaryCard
          title="Total Votes"
          value={analyticsData.totalVotes}
          icon={Vote}
          color="green"
        />
        <SummaryCard
          title="Active Users"
          value={analyticsData.totalUsers}
          icon={User}
          color="purple"
        />
        <SummaryCard
          title="Avg. Votes/Issue"
          value={analyticsData.averageVotesPerIssue}
          icon={TrendingUp}
          color="yellow"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Issues by Category */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Issues by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Issues by Status */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Issues by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Submissions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Issue Submissions (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analyticsData.dailySubmissions}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke="#3B82F6" 
              strokeWidth={3}
              dot={{ fill: '#3B82F6', r: 6 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Most Voted Issues by Category */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Voted Issues by Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(analyticsData.mostVotedByCategory).map(([category, issues]) => (
            <div key={category} className="border rounded-lg p-4">
              <h4 className={`font-medium text-gray-900 mb-3 px-3 py-1 rounded-full text-sm inline-block ${getCategoryColor(category)}`}>
                {category}
              </h4>
              {issues.length === 0 ? (
                <p className="text-sm text-gray-500">No issues in this category</p>
              ) : (
                <ul className="space-y-2">
                  {issues.map((issue, index) => (
                    <li key={issue.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700 truncate flex-1 mr-2">
                        {index + 1}. {issue.title}
                      </span>
                      <span className="text-gray-500 font-medium whitespace-nowrap">
                        {issue.voteCount} votes
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      {analyticsData.recentIssues && analyticsData.recentIssues.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {analyticsData.recentIssues.map(issue => (
              <div key={issue.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{issue.title}</p>
                  <p className="text-sm text-gray-600">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(issue.category)}`}>
                      {issue.category}
                    </span>
                    <span className="ml-2">{timeSince(issue.createdAt)}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Summary Card Component
function SummaryCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}