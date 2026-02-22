// server.js - Complete Backend Server for CivicSync
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadFile } = require('./utils/ipfs');
const { 
  computeIncidentHash, 
  generateLocationKey, 
  checkLocationExists,
  registerIncidentOnChain,
  verifyIncidentOnChain 
} = require('./utils/blockchain');

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'civicsync-secret-key-2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log('Created uploads directory');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed'));
    }
  }
});

// In-memory database (replace with real database in production)
const db = {
  users: [],
  issues: [],
  votes: []
};

// Sample data for testing
const initializeSampleData = () => {
  // Sample users
  db.users = [
    {
      id: '1',
      email: 'john@example.com',
      name: 'John Doe',
      password: bcrypt.hashSync('password123', 10),
      createdAt: new Date('2024-01-01').toISOString()
    },
    {
      id: '2',
      email: 'jane@example.com',
      name: 'Jane Smith',
      password: bcrypt.hashSync('password123', 10),
      createdAt: new Date('2024-01-02').toISOString()
    }
  ];

  // Sample issues with mock blockchain data for demonstration
  db.issues = [
    {
      id: '1',
      title: 'Pothole on Main Street',
      description: 'Large pothole causing traffic issues',
      category: 'Road',
      location: 'Main Street, Downtown',
      latitude: 40.7128,
      longitude: -74.0060,
      imageUrl: '/uploads/sample-pothole.jpg',
      status: 'Pending',
      userId: '1',
      voteCount: 5,
      createdAt: new Date('2024-01-01').toISOString(),
      updatedAt: new Date('2024-01-01').toISOString(),
      // Mock blockchain data for demonstration
      chainHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      blockNumber: 1234567,
      chainId: 11155111, // Sepolia testnet
      ipfsCid: 'QmSampleCID1234567890abcdef'
    },
    {
      id: '2',
      title: 'Broken Streetlight',
      description: 'Streetlight not working for several days',
      category: 'Lighting',
      location: 'Elm Street, Residential Area',
      latitude: 40.7589,
      longitude: -73.9851,
      status: 'In Progress',
      userId: '2',
      voteCount: 3,
      createdAt: new Date('2024-01-02').toISOString(),
      updatedAt: new Date('2024-01-03').toISOString(),
      // Mock blockchain data for demonstration
      chainHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      blockNumber: 1234568,
      chainId: 11155111,
      ipfsCid: 'QmAnotherSampleCID1234567890abcdef'
    },
    {
      id: '3',
      title: 'Overflowing Trash Bin',
      description: 'Trash bin overflowing, needs immediate attention',
      category: 'Sanitation',
      location: 'Park Avenue, Commercial District',
      latitude: 40.7505,
      longitude: -73.9934,
      status: 'Resolved',
      userId: '1',
      voteCount: 8,
      createdAt: new Date('2024-01-03').toISOString(),
      updatedAt: new Date('2024-01-05').toISOString(),
      // Mock blockchain data for demonstration
      chainHash: '0x4567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12',
      txHash: '0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456',
      blockNumber: 1234569,
      chainId: 11155111,
      ipfsCid: 'QmThirdSampleCID1234567890abcdef'
    }
  ];

  // Sample votes
  db.votes = [
    { id: '1', userId: '1', issueId: '1', createdAt: new Date('2024-01-01').toISOString() },
    { id: '2', userId: '2', issueId: '1', createdAt: new Date('2024-01-01').toISOString() },
    { id: '3', userId: '1', issueId: '2', createdAt: new Date('2024-01-02').toISOString() }
  ];

  console.log('Database initialized with sample data including mock blockchain data');
};

// Initialize sample data on startup
initializeSampleData();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CivicSync API is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: ['/api/auth/register', '/api/auth/login', '/api/auth/me'],
      issues: ['/api/issues', '/api/issues/my', '/api/issues/:id'],
      voting: ['/api/issues/:id/vote'],
      analytics: ['/api/analytics']
    }
  });
});

// User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields (email, password, name) are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = {
      id: Date.now().toString(),
      email: email.toLowerCase(),
      name,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    db.users.push(user);

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name 
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name 
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    user: { 
      id: user.id, 
      email: user.email, 
      name: user.name 
    }
  });
});

// Create Issue
app.post('/api/issues', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, location, latitude, longitude } = req.body;

    // Validate required fields
    if (!title || !description || !category || !location) {
      return res.status(400).json({ error: 'Title, description, category, and location are required' });
    }

    // Validate category
    const validCategories = ['Road', 'Water', 'Sanitation', 'Electricity', 'Other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const issue = {
      id: Date.now().toString(),
      userId: req.user.id,
      title: title.trim(),
      description: description.trim(),
      category,
      location: location.trim(),
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      status: 'Pending',
      imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
      voteCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Optional: upload to IPFS if token provided
    if (process.env.WEB3_STORAGE_TOKEN && req.file) {
      try {
        const localPath = path.join(__dirname, 'uploads', req.file.filename);
        const { cid } = await uploadFile(localPath);
        issue.ipfsCid = cid;
      } catch (e) {
        console.warn('IPFS upload skipped/failed:', e.message);
      }
    }

    // Optional: compute hash and push to chain if env present
    if (process.env.SEPOLIA_RPC_URL && process.env.PRIVATE_KEY && process.env.CONTRACT_ADDR) {
      try {
        const result = await registerIncidentOnChain(issue);
        issue.chainHash = computeIncidentHash(issue);
        issue.txHash = result.txHash;
        issue.chainId = result.chainId;
        issue.blockNumber = result.blockNumber;
        console.log('Incident registered on blockchain:', result.txHash);
      } catch (e) {
        console.warn('Chain publish skipped/failed:', e.message);
      }
    }

    db.issues.push(issue);

    // Get user info to include in response
    const user = db.users.find(u => u.id === req.user.id);

    res.status(201).json({
      message: 'Issue created successfully',
      issue: {
        ...issue,
        userName: user.name,
        userEmail: user.email,
        hasVoted: false,
        isOwner: true
      }
    });
  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({ error: 'Server error while creating issue' });
  }
});

// Get all issues (with pagination, filtering, and sorting)
app.get('/api/issues', authenticateToken, (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      status, 
      search, 
      sortBy = 'newest' 
    } = req.query;
    
    let filteredIssues = [...db.issues];

    // Filter by category
    if (category && category !== 'all') {
      filteredIssues = filteredIssues.filter(issue => issue.category === category);
    }

    // Filter by status
    if (status && status !== 'all') {
      filteredIssues = filteredIssues.filter(issue => issue.status === status);
    }

    // Search by title (case-insensitive)
    if (search) {
      filteredIssues = filteredIssues.filter(issue => 
        issue.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort
    if (sortBy === 'newest') {
      filteredIssues.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'most-voted') {
      filteredIssues.sort((a, b) => b.voteCount - a.voteCount);
    }

    // Add user info and vote status to each issue
    const issuesWithDetails = filteredIssues.map(issue => {
      const user = db.users.find(u => u.id === issue.userId);
      const hasVoted = db.votes.some(v => v.userId === req.user.id && v.issueId === issue.id);
      
      return {
        ...issue,
        userName: user?.name || 'Unknown User',
        userEmail: user?.email || 'unknown@example.com',
        hasVoted,
        isOwner: issue.userId === req.user.id
      };
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedIssues = issuesWithDetails.slice(startIndex, endIndex);

    res.json({
      issues: paginatedIssues,
      totalCount: issuesWithDetails.length,
      currentPage: parseInt(page),
      totalPages: Math.ceil(issuesWithDetails.length / limit),
      hasMore: endIndex < issuesWithDetails.length
    });
  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({ error: 'Server error while fetching issues' });
  }
});

// Get user's issues
app.get('/api/issues/my', authenticateToken, (req, res) => {
  try {
    const userIssues = db.issues.filter(issue => issue.userId === req.user.id);
    
    // Sort by newest first
    userIssues.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Add vote status and user info
    const issuesWithDetails = userIssues.map(issue => {
      const hasVoted = db.votes.some(v => v.userId === req.user.id && v.issueId === issue.id);
      const user = db.users.find(u => u.id === issue.userId);
      
      return {
        ...issue,
        hasVoted,
        isOwner: true,
        userName: user?.name || 'Unknown User',
        userEmail: user?.email || 'unknown@example.com'
      };
    });

    res.json({ 
      issues: issuesWithDetails,
      totalCount: issuesWithDetails.length
    });
  } catch (error) {
    console.error('Get my issues error:', error);
    res.status(500).json({ error: 'Server error while fetching your issues' });
  }
});

// Get single issue by ID
app.get('/api/issues/:id', authenticateToken, (req, res) => {
  try {
    const issue = db.issues.find(i => i.id === req.params.id);
    
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const user = db.users.find(u => u.id === issue.userId);
    const hasVoted = db.votes.some(v => v.userId === req.user.id && v.issueId === issue.id);

    res.json({
      issue: {
        ...issue,
        userName: user?.name || 'Unknown User',
        userEmail: user?.email || 'unknown@example.com',
        hasVoted,
        isOwner: issue.userId === req.user.id
      }
    });
  } catch (error) {
    console.error('Get issue error:', error);
    res.status(500).json({ error: 'Server error while fetching issue' });
  }
});

// Update issue
app.put('/api/issues/:id', authenticateToken, upload.single('image'), (req, res) => {
  try {
    const issue = db.issues.find(i => i.id === req.params.id);
    
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Check ownership
    if (issue.userId !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own issues' });
    }

    // Check status - can only edit pending issues
    if (issue.status !== 'Pending') {
      return res.status(403).json({ error: 'You can only edit pending issues' });
    }

    // Update fields
    const { title, description, category, location, latitude, longitude } = req.body;
    
    if (title) issue.title = title.trim();
    if (description) issue.description = description.trim();
    if (category) {
      const validCategories = ['Road', 'Water', 'Sanitation', 'Electricity', 'Other'];
      if (validCategories.includes(category)) {
        issue.category = category;
      }
    }
    if (location) issue.location = location.trim();
    if (latitude !== undefined) issue.latitude = latitude ? parseFloat(latitude) : null;
    if (longitude !== undefined) issue.longitude = longitude ? parseFloat(longitude) : null;
    
    // Update image if new one is uploaded
    if (req.file) {
      // Delete old image if exists
      if (issue.imageUrl) {
        const oldImagePath = path.join(__dirname, issue.imageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      issue.imageUrl = `/uploads/${req.file.filename}`;
    }

    issue.updatedAt = new Date().toISOString();

    res.json({
      message: 'Issue updated successfully',
      issue
    });
  } catch (error) {
    console.error('Update issue error:', error);
    res.status(500).json({ error: 'Server error while updating issue' });
  }
});

// Delete issue
app.delete('/api/issues/:id', authenticateToken, (req, res) => {
  try {
    const issueIndex = db.issues.findIndex(i => i.id === req.params.id);
    
    if (issueIndex === -1) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const issue = db.issues[issueIndex];

    // Check ownership
    if (issue.userId !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own issues' });
    }

    // Check status - can only delete pending issues
    if (issue.status !== 'Pending') {
      return res.status(403).json({ error: 'You can only delete pending issues' });
    }

    // Delete image if exists
    if (issue.imageUrl) {
      const imagePath = path.join(__dirname, issue.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Remove issue and related votes
    db.issues.splice(issueIndex, 1);
    db.votes = db.votes.filter(v => v.issueId !== req.params.id);

    res.json({ message: 'Issue deleted successfully' });
  } catch (error) {
    console.error('Delete issue error:', error);
    res.status(500).json({ error: 'Server error while deleting issue' });
  }
});

// Vote on issue
app.post('/api/issues/:id/vote', authenticateToken, (req, res) => {
  try {
    const issue = db.issues.find(i => i.id === req.params.id);
    
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Check if already voted
    const existingVote = db.votes.find(v => 
      v.userId === req.user.id && v.issueId === req.params.id
    );

    if (existingVote) {
      return res.status(400).json({ error: 'You have already voted on this issue' });
    }

    // Create vote
    const vote = {
      id: Date.now().toString(),
      userId: req.user.id,
      issueId: req.params.id,
      createdAt: new Date().toISOString()
    };

    db.votes.push(vote);
    issue.voteCount += 1;
    issue.updatedAt = new Date().toISOString();

    res.json({
      message: 'Vote recorded successfully',
      voteCount: issue.voteCount
    });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ error: 'Server error while recording vote' });
  }
});

// Get analytics data
app.get('/api/analytics', authenticateToken, (req, res) => {
  try {
    // Issues by category
    const categoryCount = {};
    const categories = ['Road', 'Water', 'Sanitation', 'Electricity', 'Other'];
    categories.forEach(cat => {
      categoryCount[cat] = db.issues.filter(issue => issue.category === cat).length;
    });

    // Issues by status
    const statusCount = {};
    const statuses = ['Pending', 'In Progress', 'Resolved'];
    statuses.forEach(status => {
      statusCount[status] = db.issues.filter(issue => issue.status === status).length;
    });

    // Daily submissions for last 7 days
    const dailySubmissions = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const count = db.issues.filter(issue => {
        const issueDate = new Date(issue.createdAt);
        return issueDate >= date && issueDate < nextDate;
      }).length;
      
      dailySubmissions.push({
        date: date.toISOString().split('T')[0],
        count
      });
    }

    // Most voted issues by category
    const mostVotedByCategory = {};
    
    categories.forEach(category => {
      const categoryIssues = db.issues
        .filter(issue => issue.category === category)
        .sort((a, b) => b.voteCount - a.voteCount)
        .slice(0, 5);
      
      mostVotedByCategory[category] = categoryIssues.map(issue => ({
        id: issue.id,
        title: issue.title,
        voteCount: issue.voteCount,
        status: issue.status
      }));
    });

    // Recent activity
    const recentIssues = [...db.issues]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(issue => ({
        id: issue.id,
        title: issue.title,
        category: issue.category,
        createdAt: issue.createdAt
      }));

    res.json({
      categoryCount,
      statusCount,
      dailySubmissions,
      mostVotedByCategory,
      recentIssues,
      totalIssues: db.issues.length,
      totalVotes: db.votes.length,
      totalUsers: db.users.length,
      averageVotesPerIssue: db.issues.length > 0 ? 
        (db.votes.length / db.issues.length).toFixed(2) : 0
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Server error while fetching analytics' });
  }
});

// Update issue status (for testing/demo purposes)
app.patch('/api/issues/:id/status', authenticateToken, (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'In Progress', 'Resolved'];
    
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: Pending, In Progress, Resolved' });
    }

    const issue = db.issues.find(i => i.id === req.params.id);
    
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // For demo purposes, allow any user to change status
    // In production, this would be restricted to admins or the issue owner
    
    issue.status = status;
    issue.updatedAt = new Date().toISOString();

    res.json({
      message: 'Status updated successfully',
      issue
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Server error while updating status' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: error.message });
  }
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║           CitySolution Backend Server Started         ║
  ╠═══════════════════════════════════════════════════════╣
  ║  Server running on: http://localhost:${PORT}            ║
  ║  Health check: http://localhost:${PORT}/api/health     ║
  ╚═══════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  app.close(() => {
    console.log('HTTP server closed');
  });
});