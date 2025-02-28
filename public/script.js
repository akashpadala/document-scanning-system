let userId, userRole;

function showSignUp() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('signup-section').style.display = 'block';
  setTimeout(() => {
    document.getElementById('login-section').style.opacity = '0';
    document.getElementById('signup-section').style.opacity = '1';
  }, 10);
  document.getElementById('login-message').textContent = '';
  document.getElementById('signup-message').textContent = '';
}

function showLogin() {
  document.getElementById('signup-section').style.display = 'none';
  document.getElementById('login-section').style.display = 'block';
  setTimeout(() => {
    document.getElementById('signup-section').style.opacity = '0';
    document.getElementById('login-section').style.opacity = '1';
  }, 10);
  document.getElementById('login-message').textContent = '';
  document.getElementById('signup-message').textContent = '';
}

async function register() {
  const username = document.getElementById('signup-username').value;
  const password = document.getElementById('signup-password').value;
  if (!username || !password) return alert('Please fill in all fields');
  const res = await fetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  document.getElementById('signup-message').textContent = data.message || data.error;
  if (data.message === 'Registered successfully') showLogin(); // Auto-switch to login
}

async function login() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  if (!username || !password) return alert('Please fill in all fields');
  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.id) {
    userId = data.id;
    userRole = data.role;
    localStorage.setItem('userId', userId);
    localStorage.setItem('userRole', userRole);
    window.location.href = userRole === 'admin' ? '/admin.html' : '/user.html';
  } else {
    document.getElementById('login-message').textContent = data.error;
  }
}

function logout() {
  localStorage.removeItem('userId');
  localStorage.removeItem('userRole');
  userId = null;
  userRole = null;
  window.location.href = '/'; // Redirect to login page
}

let currentFileContent = null; // Store file content for upload

async function checkMatches() {
  console.log('Check Matches clicked');
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  if (!file) {
    console.log('No file selected');
    return alert('Please select a file to check');
  }
  if (!file.name.endsWith('.txt')) {
    console.log('Invalid file type:', file.name);
    return alert('Please upload a .txt file');
  }

  console.log('Reading file:', file.name);
  const reader = new FileReader();
  reader.onload = async function(e) {
    currentFileContent = e.target.result;
    console.log('File content loaded:', currentFileContent.slice(0, 50));
    try {
      const res = await fetch('/preview-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, content: currentFileContent })
      });
      console.log('Fetch response status:', res.status);
      if (!res.ok) {
        const text = await res.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      console.log('Preview matches data:', data);
      if (data.matches && data.matches.length > 0) {
        document.getElementById('matches').innerHTML = data.matches.map(m => 
          `<li>${m.filename} (Similarity: ${m.similarity}%)</li>`
        ).join('');
      } else {
        document.getElementById('matches').innerHTML = '<li>No matches found</li>';
      }
      document.getElementById('uploadBtn').style.display = 'block';
    } catch (err) {
      console.error('Fetch error:', err);
      alert('Failed to check matches: ' + err.message);
    }
  };
  reader.onerror = function() {
    console.error('File reading error');
    alert('Error reading file');
  };
  reader.readAsText(file);
}

async function uploadFile() {
  if (!currentFileContent) return alert('No file selected to upload');
  const res = await fetch('/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, content: currentFileContent })
  });
  const data = await res.json();
  if (data.message) {
    loadUserProfile();
    document.getElementById('fileInput').value = ''; // Clear file input
    document.getElementById('uploadBtn').style.display = 'none'; // Hide upload button
    document.getElementById('matches').innerHTML = ''; // Clear matches
    currentFileContent = null;
    alert('File uploaded successfully');
  } else {
    alert(data.error);
  }
}

function clearForm() {
  document.getElementById('fileInput').value = '';
  document.getElementById('matches').innerHTML = '';
  document.getElementById('uploadBtn').style.display = 'none';
  currentFileContent = null;
}

// Keep findMatches as is, just ensure it works with docId
async function findMatches(docId) {
  console.log('Finding matches for docId:', docId, 'userId:', userId);
  const res = await fetch(`/matches/${docId}?userId=${userId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  const matches = await res.json();
  console.log('Match response:', matches);
  document.getElementById('matches').innerHTML = matches.map(m => 
    `<li>${m.filename} (Similarity: ${m.similarity}%)</li>`
  ).join('');
}

async function requestCredits() {
  const amount = prompt('How many credits do you need?');
  if (!amount || isNaN(amount) || amount <= 0) return alert('Please enter a valid number');
  const res = await fetch('/credits/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, amount: parseInt(amount) })
  });
  const data = await res.json();
  alert(data.message);
  loadUserProfile();
}

async function exportHistory() {
  const res = await fetch(`/user/profile?userId=${userId}`);
  const data = await res.json();
  const history = data.scans.map(s => `${s.filename},${s.timestamp}`).join('\n');
  const blob = new Blob([`Filename,Timestamp\n${history}`], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'scan_history.txt';
  a.click();
}

async function loadUserProfile() {
  console.log('Fetching profile for userId:', userId);
  const res = await fetch(`/user/profile?userId=${userId}`);
  const data = await res.json();
  console.log('Profile data:', data);
  document.getElementById('credits').textContent = data.credits;
  const scansList = document.getElementById('pastScans');
  scansList.innerHTML = data.scans.map(scan => 
    `<li>${scan.filename} - ${scan.timestamp} <button onclick="findMatches(${scan.id})">Find Matches</button></li>`
  ).join('');
  document.getElementById('welcomeMessage').textContent = `Welcome, ${data.username}!`;
}

async function loadAdminDashboard() {
  const reqRes = await fetch('/admin/requests');
  const requests = await reqRes.json();
  document.getElementById('requests').innerHTML = requests.map(r => `
    <tr>
      <td>${r.username}</td>
      <td>${r.amount}</td>
      <td>${r.status}</td>
      <td>${new Date(r.timestamp).toLocaleString()}</td>
      <td>
        ${r.status === 'pending' ? 
          `<button class="btn-primary" onclick="approveRequest(${r.id}, ${r.userId}, ${r.amount}, true)">Approve</button>
           <button class="btn-secondary" onclick="approveRequest(${r.id}, ${r.userId}, ${r.amount}, false)">Deny</button>` 
          : r.status}
      </td>
    </tr>
  `).join('');

  const analyticsRes = await fetch('/admin/analytics');
  const stats = await analyticsRes.json();
  console.log('Analytics stats:', JSON.stringify(stats, null, 2));
  document.getElementById('userAnalytics').innerHTML = stats.users.map(u => {
    const scanEntry = stats.scanData.find(s => s.userId == u.id);
    console.log(`User ${u.username} (ID: ${u.id}) - Scans: ${scanEntry?.scans || 0}`);
    return `
      <tr>
        <td>${u.username}</td>
        <td>${scanEntry?.scans || 0}</td>
        <td>${u.credits}</td>
      </tr>
    `;
  }).join('');
  document.getElementById('topUsers').innerHTML = stats.scanData.map(s => 
    `<li>${s.username || `User ${s.userId}`}: ${s.scans} scans</li>`
  ).join('');
  document.getElementById('creditStats').innerHTML = `
    <li>Approved: ${stats.creditRequests?.approved || 0}</li>
    <li>Pending: ${stats.creditRequests?.pending || 0}</li>
    <li>Denied: ${stats.creditRequests?.denied || 0}</li>
  `;
  const creditBar = document.getElementById('creditBar');
  const maxCredits = stats.users.length * 20;
  const usagePercent = maxCredits ? (stats.creditsUsed / maxCredits) * 100 : 0;
  creditBar.style.setProperty('--bar-width', `${usagePercent}%`);
  // welcome message for admin
  const adminUsername = stats.users.find(u => u.role === 'admin')?.username || 'Admin';
  document.getElementById('welcomeMessage').textContent = `Welcome, ${adminUsername}!`;
}

async function scanDocument() {
  const content = document.getElementById('docContent').value;
  if (!content) return alert('Please enter text to scan');
  const res = await fetch('/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, content })
  });
  const data = await res.json();
  if (data.message) {
    loadUserProfile();
    findMatches(data.docId);
    document.getElementById('docContent').value = ''; // Clear input
  } else {
    alert(data.error);
  }
}

async function approveRequest(requestId, userId, amount, approve) {
  if (!userId) {
    console.error('Missing userId');
    alert('Error: User ID is missing');
    return;
  }
  console.log('Sending approval:', { requestId, userId, amount, approve });
  try {
    const res = await fetch('/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, userId, amount, approve })
    });
    const data = await res.json();
    console.log('Approval response:', data);
    alert(data.message || 'Error: No message received');
    loadAdminDashboard();
    if (userId === localStorage.getItem('userId')) loadUserProfile();
  } catch (err) {
    console.error('Fetch error:', err);
    alert('Failed to process approval');
  }
}

async function approveAllPending() {
  if (!confirm('Approve all pending credit requests?')) return;
  const reqRes = await fetch('/admin/requests');
  const requests = await reqRes.json();
  const pending = requests.filter(r => r.status === 'pending');
  for (const r of pending) {
    await fetch('/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: r.id, userId: r.userId, amount: r.amount, approve: true })
    });
  }
  loadAdminDashboard();
  alert(`${pending.length} requests approved`);
}

function sortTable(tableId, column, asc = true) {
  const tbody = document.getElementById(tableId);
  const rows = Array.from(tbody.getElementsByTagName('tr'));
  rows.sort((a, b) => {
    const aVal = a.cells[column].textContent;
    const bVal = b.cells[column].textContent;
    return asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });
  rows.forEach(row => tbody.appendChild(row));
}

if (window.location.pathname.includes('user.html')) {
  userId = localStorage.getItem('userId');
  userRole = localStorage.getItem('userRole');
  if (!userId) window.location.href = '/'; // Redirect if not logged in
  loadUserProfile();
}
if (window.location.pathname.includes('admin.html')) {
  userId = localStorage.getItem('userId');
  userRole = localStorage.getItem('userRole');
  if (userRole !== 'admin') window.location.href = '/';
  loadAdminDashboard();
}
