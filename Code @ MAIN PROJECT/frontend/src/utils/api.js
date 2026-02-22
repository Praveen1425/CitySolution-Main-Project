// utils/api.js
import { API_URL } from './constants';
import { getAuthHeaders } from './helpers';

// Authentication APIs
export const authAPI = {
  login: async (credentials) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return response;
  },

  register: async (userData) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return response;
  },

  getMe: async () => {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: getAuthHeaders()
    });
    return response;
  }
};

// Issues APIs
export const issuesAPI = {
  getAll: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/issues?${queryString}`, {
      headers: getAuthHeaders()
    });
    return response;
  },

  getMy: async () => {
    const response = await fetch(`${API_URL}/issues/my`, {
      headers: getAuthHeaders()
    });
    return response;
  },

  getById: async (id) => {
    const response = await fetch(`${API_URL}/issues/${id}`, {
      headers: getAuthHeaders()
    });
    return response;
  },

  create: async (formData) => {
    const response = await fetch(`${API_URL}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });
    return response;
  },

  update: async (id, formData) => {
    const response = await fetch(`${API_URL}/issues/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });
    return response;
  },

  delete: async (id) => {
    const response = await fetch(`${API_URL}/issues/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return response;
  },

  vote: async (id) => {
    const response = await fetch(`${API_URL}/issues/${id}/vote`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return response;
  },

  updateStatus: async (id, status) => {
    const response = await fetch(`${API_URL}/issues/${id}/status`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });
    return response;
  }
};

// Analytics API
export const analyticsAPI = {
  get: async () => {
    const response = await fetch(`${API_URL}/analytics`, {
      headers: getAuthHeaders()
    });
    return response;
  }
};