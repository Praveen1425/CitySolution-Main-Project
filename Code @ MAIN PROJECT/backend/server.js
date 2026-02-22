// server.js - Complete Backend Server for CitySolution (with debug logs)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadFile } = require('./utils/ipfs');
const crypto = require('crypto');
const { db: firestore } = require('./firebase');
const {
  computeIncidentHash,
  generateLocationKey,
  checkHashExists,
  checkLocationExists,
  registerIncidentOnChain,
  verifyIncidentOnChain
} = require('./utils/blockchain');

// AI detection removed: users select category manually

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'citysolution-secret-key-2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log('✅ Created uploads directory');
}

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

// In-memory DB (for auth/session demo only)
const memoryDb = { users: [], issues: [], votes: [] };

// Sample data init
function initializeSampleData() {
  memoryDb.users = [
    {
      id: '1',
      email: 'john@example.com',
      name: 'John Doe',
      password: bcrypt.hashSync('password123', 10),
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      email: 'jane@example.com',
      name: 'Jane Smith',
      password: bcrypt.hashSync('password123', 10),
      createdAt: new Date().toISOString(),
    },
  ];
  memoryDb.issues = [];
  memoryDb.votes = [];
  console.log('✅ Sample data initialized');
}
initializeSampleData();

// JWT middleware
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Health check
app.get('/api/health', (req, res) =>
  res.json({
    status: 'OK',
    message: 'CitySolution API running',
    time: new Date().toISOString(),
  })
);

// Firebase connectivity test
app.get('/test-firebase', async (req, res) => {
  try {
    const snap = await firestore.collection('incidents').limit(10).get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ count: data.length, data });
  } catch (err) {
    console.error('Firebase connection error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================== AUTH ========================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name)
      return res.status(400).json({ error: 'All fields required' });

    const exists = memoryDb.users.find(u => u.email === email);
    if (exists) return res.status(400).json({ error: 'Email already used' });

    const hashed = await bcrypt.hash(password, 10);
    const user = {
      id: Date.now().toString(),
      email,
      name,
      password: hashed,
      createdAt: new Date().toISOString(),
    };
    memoryDb.users.push(user);
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'Registered', token, user });
  } catch (e) {
    console.error('Registration error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = memoryDb.users.find(u => u.email === email);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Login successful', token, user });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = memoryDb.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// ======================== ISSUES ========================
app.post('/api/issues', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, location } = req.body;
    if (!title || !description || !category || !location)
      return res.status(400).json({ error: 'All fields required' });

    const issueData = {
      userId: req.user.id,
      title,
      description,
      category,
      location,
      imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
      status: 'Pending',
      voteCount: 0,
      createdAt: new Date().toISOString(),
      timestamp: new Date(),
    };

    // Infer lat/long from `location` like "lat, lng"
    const match = String(location).match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
    if (match) {
      issueData.latitude = parseFloat(match[1]);
      issueData.longitude = parseFloat(match[2]);
    }

    // Compute hashes and check for duplicates (before saving to Firestore)
    const incidentHash = computeIncidentHash({ ...issueData, ipfsCid: '' }); // keccak256 for blockchain

    // Build a stable, normalized string for Firestore SHA-256 hash
    const normTitle = String(title || '').trim().toLowerCase();
    const normDesc = String(description || '').trim().toLowerCase();
    const normCat = String(category || '').trim().toLowerCase();
    const normLoc = String(location || '').trim().toLowerCase();
    const normLat = issueData.latitude != null ? String(Number(issueData.latitude)) : '';
    const normLng = issueData.longitude != null ? String(Number(issueData.longitude)) : '';
    const firebaseHash = '0x' + crypto.createHash('sha256').update(`${normTitle}|${normDesc}|${normCat}|${normLoc}|${normLat}|${normLng}`).digest('hex');

    issueData.hash = firebaseHash;

    // Firestore duplicate check by hash (SHA-256) using admin SDK
    try {
      const dupSnapshot = await firestore
        .collection('incidents')
        .where('hash', '==', firebaseHash)
        .get();
      if (!dupSnapshot.empty) {
        return res.status(400).json({ 
          error: 'DUPLICATE_INCIDENT',
          message: 'Duplicate issue detected!'
        });
      }
    } catch (fsErr) {
      console.warn('Firestore duplicate check failed:', fsErr.message);
    }
    let isDuplicate = false;

    // Check for duplicate hash (if blockchain configured)
    try {
      isDuplicate = await checkHashExists(incidentHash);
      if (isDuplicate) {
        return res.status(400).json({ 
          error: 'DUPLICATE_INCIDENT',
          message: 'Duplicate issue detected. This issue already exists on blockchain!'
        });
      }
    } catch (hashCheckErr) {
      // If blockchain not configured, skip duplicate check
      console.warn('Hash check skipped:', hashCheckErr.message);
    }

    // Attempt blockchain registration (best-effort)
    let chain = null;
    if (issueData.latitude != null && issueData.longitude != null && !isDuplicate) {
      try {
        chain = await registerIncidentOnChain({ ...issueData, ipfsCid: '' });
        // Store blockchain transaction details
        if (chain) {
          issueData.chainTxHash = chain.txHash;
          issueData.chainBlockNumber = chain.blockNumber;
          issueData.chainId = chain.chainId;
        }
      } catch (chainErr) {
        // If it's a duplicate error, return that
        if (chainErr.message.includes('DUPLICATE_INCIDENT')) {
          return res.status(400).json({ 
            error: 'DUPLICATE_INCIDENT',
            message: 'Duplicate issue detected. This issue already exists on blockchain!' 
          });
        }
        console.warn('Blockchain registration skipped/failed:', chainErr.message);
      }
    }

    // Save to Firestore
    const docRef = await firestore.collection('incidents').add(issueData);
    const issue = {
      id: docRef.id,
      ...issueData
    };

    console.log('✅ Issue saved to Firestore with ID:', docRef.id);
    res.status(201).json({ message: 'Issue created and stored in Firestore', issue, chain });
  } catch (e) {
    console.error('Create issue error:', e);
    res.status(500).json({ error: 'Server error', details: e.message });
  }
});

app.get('/api/issues', authenticateToken, async (req, res) => {
  try {
    const querySnapshot = await firestore
      .collection('incidents')
      .orderBy('timestamp', 'desc')
      .get();

    const issues = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ issues });
  } catch (e) {
    console.error('Fetch issues error:', e);
    res.status(500).json({ error: 'Failed to fetch issues', details: e.message });
  }
});

// Detection route removed

// ======================== ANALYTICS ========================
app.get('/api/analytics', authenticateToken, async (req, res) => {
  try {
    const issuesSnapshot = await firestore.collection('incidents').get();
    const totalIssues = issuesSnapshot.size;

    // Calculate total votes (sum of voteCount from all issues)
    let totalVotes = 0;
    issuesSnapshot.forEach((doc) => {
      const data = doc.data();
      totalVotes += data.voteCount || 0;
    });

    res.json({ totalIssues, totalVotes });
  } catch (e) {
    console.error('Analytics error:', e);
    res.status(500).json({ error: 'Failed to fetch analytics', details: e.message });
  }
});

// ======================== ERROR HANDLER ========================
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError)
    return res.status(400).json({ error: err.message });
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ======================== SERVER START ========================
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║           🚀 CitySolution Backend Server Running       ║
  ╠═══════════════════════════════════════════════════════╣
  ║  URL: http://localhost:${PORT}                         ║
  ║  Health: /api/health                                   ║
  ╚═══════════════════════════════════════════════════════╝
  `);
});
