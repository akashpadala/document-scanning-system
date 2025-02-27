const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// SQLite Database Setup
const db = new sqlite3.Database('database.sqlite');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user',
    credits INTEGER DEFAULT 20
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    filename TEXT,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS credit_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    amount INTEGER,
    status TEXT DEFAULT 'pending',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    action TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Password Hashing
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function calculateSimilarity(text1, text2) {
  const words1 = text1.toLowerCase().split(/\s+/).filter(w => w);
  const words2 = text2.toLowerCase().split(/\s+/).filter(w => w);
  
  // Word frequency overlap
  const freq1 = {}, freq2 = {};
  words1.forEach(w => freq1[w] = (freq1[w] || 0) + 1);
  words2.forEach(w => freq2[w] = (freq2[w] || 0) + 1);
  let overlap = 0;
  for (let word in freq1) {
    if (freq2[word]) overlap += Math.min(freq1[word], freq2[word]);
  }
  const totalWords = Math.max(words1.length, words2.length);
  const freqScore = totalWords ? (overlap / totalWords) * 100 : 0;

  // Levenshtein Distance
  const levMatrix = Array(text2.length + 1).fill(null).map(() => Array(text1.length + 1).fill(null));
  for (let i = 0; i <= text1.length; i++) levMatrix[0][i] = i;
  for (let j = 0; j <= text2.length; j++) levMatrix[j][0] = j;
  for (let j = 1; j <= text2.length; j++) {
    for (let i = 1; i <= text1.length; i++) {
      const indicator = text1[i - 1] === text2[j - 1] ? 0 : 1;
      levMatrix[j][i] = Math.min(
        levMatrix[j][i - 1] + 1,
        levMatrix[j - 1][i] + 1,
        levMatrix[j - 1][i - 1] + indicator
      );
    }
  }
  const levDistance = levMatrix[text2.length][text1.length];
  const levScore = Math.max(text1.length, text2.length) ? (1 - levDistance / Math.max(text1.length, text2.length)) * 100 : 0;

  return (freqScore * 0.6 + levScore * 0.4).toFixed(2); // Weighted average
}

function resetCredits() {
  db.run(`UPDATE users SET credits = 20 WHERE credits < 20`, (err) => {
    if (err) console.error('Credit reset failed:', err);
    else console.log('Credits reset to 20 for all users at midnight');
  });
}

function scheduleMidnightReset() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // Next midnight
  const timeUntilMidnight = midnight - now;

  // Schedule first reset
  setTimeout(() => {
    resetCredits();
    // Then reset every 24 hours
    setInterval(resetCredits, 24 * 60 * 60 * 1000);
  }, timeUntilMidnight);

  console.log(`Next credit reset scheduled in ${Math.round(timeUntilMidnight / 1000 / 60)} minutes`);
}

// Start the scheduler
scheduleMidnightReset();

// API Endpoints
app.post('/auth/register', (req, res) => {
  const { username, password } = req.body;
  const hashedPw = hashPassword(password);
  db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hashedPw], (err) => {
    if (err) return res.status(400).json({ error: 'Username taken' });
    res.json({ message: 'Registered successfully' });
  });
});

app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  const hashedPw = hashPassword(password);
  db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, hashedPw], (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ id: user.id, role: user.role, credits: user.credits });
  });
});

app.get('/user/profile', (req, res) => {
  const userId = req.query.userId;
  db.get(`SELECT username, credits FROM users WHERE id = ?`, [userId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });
    db.all(`SELECT id, filename, timestamp FROM documents WHERE userId = ?`, [userId], (err, docs) => {
      res.json({ ...user, scans: docs });
    });
  });
});

app.post('/scan', (req, res) => {
  const { userId, content } = req.body;
  db.get(`SELECT credits FROM users WHERE id = ?`, [userId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });
    if (user.credits <= 0) return res.status(403).json({ error: 'No credits left' });
    const filename = `doc_${userId}_${Date.now()}.txt`;
    fs.writeFileSync(path.join(__dirname, 'uploads', filename), content);

    db.run(`INSERT INTO documents (userId, filename, content) VALUES (?, ?, ?)`, [userId, filename, content], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to save document' });
      const docId = this.lastID;
      db.run(`UPDATE users SET credits = credits - 1 WHERE id = ?`, [userId]);
      db.run(`INSERT INTO logs (userId, action) VALUES (?, ?)`, [userId, 'scanned document']);
      res.json({ message: 'Scan completed', docId });
    });
  });
});


app.get('/matches/:docId', (req, res) => {
  const docId = req.params.docId;
  // Assuming userId is passed via query parameter (add to frontend)
  const userId = req.query.userId; // Added to restrict by user
  if (!userId) return res.status(400).json({ error: 'User ID required' });

  db.get(`SELECT content, userId FROM documents WHERE id = ?`, [docId], (err, doc) => {
    if (err || !doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.userId != userId) return res.status(403).json({ error: 'Unauthorized access to document' });

    db.all(`SELECT id, filename, content FROM documents WHERE userId = ? AND id != ?`, [userId, docId], (err, docs) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch documents' });
      const matches = docs
        .map(d => ({ id: d.id, filename: d.filename, similarity: calculateSimilarity(doc.content, d.content) }))
        .filter(d => d.similarity > 70)
        .sort((a, b) => b.similarity - a.similarity);
      res.json(matches);
    });
  });
});

app.post('/credits/request', (req, res) => {
  const { userId, amount } = req.body;
  db.run(`INSERT INTO credit_requests (userId, amount) VALUES (?, ?)`, [userId, amount], (err) => {
    if (err) return res.status(500).json({ error: 'Request failed' });
    db.run(`INSERT INTO logs (userId, action) VALUES (?, ?)`, [userId, `requested ${amount} credits`]);
    res.json({ message: 'Credit request submitted' });
  });
});

app.get('/admin/requests', (req, res) => {
  db.all(`SELECT cr.id, cr.userId, u.username, cr.amount, cr.status, cr.timestamp 
          FROM credit_requests cr JOIN users u ON cr.userId = u.id`, (err, requests) => {
    if (err) {
      console.error('Error fetching requests:', err);
      return res.status(500).json({ error: 'Failed to fetch requests' });
    }
    console.log('Fetched requests:', requests); // Debug log
    res.json(requests);
  });
});

app.post('/admin/approve', async (req, res) => {
  const { requestId, userId, amount: rawAmount, approve } = req.body;
  const amount = parseInt(rawAmount, 10);
  if (isNaN(amount)) return res.status(400).json({ error: 'Invalid amount' });
  console.log('Approving request:', { requestId, userId, amount, approve });
  const status = approve ? 'approved' : 'denied';

  try {
    const requestChanges = await new Promise((resolve, reject) => {
      db.run(`UPDATE credit_requests SET status = ? WHERE id = ?`, [status, requestId], function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
    if (requestChanges === 0) return res.status(404).json({ error: 'Request not found' });
    console.log(`Request ${requestId} status updated to ${status}`);

    if (approve) {
      const user = await new Promise((resolve, reject) => {
        db.get(`SELECT credits FROM users WHERE id = ?`, [userId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const creditChanges = await new Promise((resolve, reject) => {
        db.run(`UPDATE users SET credits = credits + ? WHERE id = ?`, [amount, userId], function (err) {
          if (err) reject(err);
          else resolve(this.changes);
        });
      });
      if (creditChanges === 0) return res.status(500).json({ error: 'Failed to update credits' });
      console.log(`Updated user ${userId} credits by ${amount}`);

      await new Promise((resolve, reject) => {
        db.run(`INSERT INTO logs (userId, action) VALUES (?, ?)`, [userId, `received ${amount} credits`], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    res.status(200).json({ message: `Request ${status}` });
  } catch (err) {
    console.error('Error in /admin/approve:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

app.get('/admin/analytics', (req, res) => {
  const stats = {};
  db.all(`SELECT username, credits, id FROM users`, (err, users) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch users' });
    stats.users = users;
    console.log('Users fetched:', users.length, JSON.stringify(users, null, 2)); // Detailed log
    db.all(`SELECT d.userId, COUNT(*) as scans, u.username 
            FROM documents d 
            LEFT JOIN users u ON d.userId = u.id 
            GROUP BY d.userId, u.username`, (err, scanData) => {
      if (err) {
        console.error('Error fetching scans:', err);
        return res.status(500).json({ error: 'Failed to fetch scans' });
      }
      console.log('Scan data:', JSON.stringify(scanData, null, 2)); // Detailed log
      stats.scanData = scanData || []; // Default to empty array if undefined
      stats.totalScans = scanData.reduce((sum, d) => sum + (d.scans || 0), 0);
      db.all(`SELECT content FROM documents`, (err, docs) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch documents' });
        const topics = docs.reduce((acc, doc) => {
          const words = doc.content.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          words.forEach(w => acc[w] = (acc[w] || 0) + 1);
          return acc;
        }, {});
        stats.topics = Object.entries(topics).sort((a, b) => b[1] - a[1]).slice(0, 5);
        stats.creditsUsed = users.reduce((sum, u) => sum + (20 - u.credits), 0);
        db.all(`SELECT status FROM credit_requests`, (err, requests) => {
          if (err) return res.status(500).json({ error: 'Failed to fetch requests' });
          stats.creditRequests = requests.reduce((acc, r) => {
            acc[r.status] = (acc[r.status] || 0) + 1;
            return acc;
          }, {});
          console.log('Final stats:', JSON.stringify(stats, null, 2)); // Detailed log
          res.json(stats);
        });
      });
    });
  });
});

// Preview matches without saving
app.post('/preview-matches', (req, res) => {
  const { userId, content } = req.body;
  console.log('Preview matches request:', { userId, content: content.slice(0, 50) });
  db.get(`SELECT credits FROM users WHERE id = ?`, [userId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });
    if (user.credits <= 0) return res.status(403).json({ error: 'No credits left to upload (check is free)' });

    db.all(`SELECT id, filename, content FROM documents WHERE userId = ?`, [userId], (err, docs) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch documents' });
      console.log('Documents fetched:', docs.length);
      const matches = docs
        .map(d => ({ id: d.id, filename: d.filename, similarity: calculateSimilarity(content, d.content) }))
        .filter(d => d.similarity > 70)
        .sort((a, b) => b.similarity - a.similarity);
      console.log('Matches found:', matches);
      res.json({ matches });
    });
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});