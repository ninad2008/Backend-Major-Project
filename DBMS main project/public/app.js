// Global State
let token = localStorage.getItem('spendwise_token') || '';
let currentUser = JSON.parse(localStorage.getItem('spendwise_user') || 'null');
let socket = null;

// Initialize app on load
document.addEventListener('DOMContentLoaded', () => {
  if (token && currentUser) {
    showDashboard();
    initSocketConnection();
    loadDashboardData();
  } else {
    showAuth();
  }
});

// UI View Toggles
function showAuth() {
  document.getElementById('authSection').style.display = 'block';
  document.getElementById('dashboardSection').style.display = 'none';
  document.getElementById('logoutBtn').style.display = 'none';
  document.getElementById('userInfo').textContent = 'Not logged in';
}

function showDashboard() {
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('dashboardSection').style.display = 'block';
  document.getElementById('logoutBtn').style.display = 'inline-block';
  document.getElementById('userInfo').textContent = `Logged in as: ${currentUser.name}`;
}

function switchAuthTab(tab) {
  if (tab === 'login') {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('showLoginBtn').classList.add('active');
    document.getElementById('showRegisterBtn').classList.remove('active');
  } else {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('showLoginBtn').classList.remove('active');
    document.getElementById('showRegisterBtn').classList.add('active');
  }
}

// Socket.io Real-Time Alert Initialization
function initSocketConnection() {
  if (typeof io !== 'undefined') {
    socket = io();

    socket.on('connect', () => {
      console.log('Socket.io connected successfully:', socket.id);
      if (currentUser && currentUser._id) {
        socket.emit('join_user_room', currentUser._id.toString());
      }
    });

    // Listen for real-time budget threshold alerts
    socket.on('budget_alert', (data) => {
      console.log('Real-time budget alert received:', data);
      if (data.isExceeded || data.overspentBy > 0) {
        triggerAlertBanner(data.message);
      }
      loadBudgets(); // Refresh progress bars immediately
      loadSummaryReport();
    });

    socket.on('global_budget_alert', (data) => {
      console.log('Global budget alert:', data);
      if (data.isExceeded || data.overspentBy > 0) {
        triggerAlertBanner(data.message);
      }
      loadBudgets();
      loadSummaryReport();
    });
  }
}

function triggerAlertBanner(msg) {
  const banner = document.getElementById('alertBanner');
  document.getElementById('alertMessage').textContent = msg;
  banner.style.display = 'flex';
}

function closeAlert() {
  document.getElementById('alertBanner').style.display = 'none';
}

// Authentication Handlers
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    let data;
    try {
      data = await res.json();
    } catch (parseErr) {
      alert('Server returned invalid response');
      return;
    }

    if (data && data.success) {
      token = data.data.token;
      currentUser = data.data;
      localStorage.setItem('spendwise_token', token);
      localStorage.setItem('spendwise_user', JSON.stringify(currentUser));
      showDashboard();
      initSocketConnection();
      loadDashboardData();
    } else {
      alert(data.message || 'Login failed');
    }
  } catch (err) {
    alert('Server connection error: ' + err.message);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();

    if (data.success) {
      token = data.data.token;
      currentUser = data.data;
      localStorage.setItem('spendwise_token', token);
      localStorage.setItem('spendwise_user', JSON.stringify(currentUser));
      showDashboard();
      initSocketConnection();
      loadDashboardData();
    } else {
      alert(data.message || 'Registration failed');
    }
  } catch (err) {
    alert('Server connection error');
  }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('spendwise_token');
  localStorage.removeItem('spendwise_user');
  token = '';
  currentUser = null;
  showAuth();
});

// Dashboard Data Loading
function loadDashboardData() {
  loadSummaryReport();
  loadTransactions();
  loadBudgets();
  loadForecast();
}

async function loadSummaryReport() {
  try {
    const res = await fetch('/api/reports/monthly', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('totalIncome').textContent = `$${data.summary.totalIncome.toFixed(2)}`;
      document.getElementById('totalExpense').textContent = `$${data.summary.totalExpense.toFixed(2)}`;
      document.getElementById('netSavings').textContent = `$${data.summary.netSavings.toFixed(2)}`;
    }
  } catch (err) {
    console.error('Failed to load summary:', err);
  }
}

async function loadTransactions() {
  try {
    const res = await fetch('/api/transactions?limit=10', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      const tbody = document.getElementById('transactionTableBody');
      if (data.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No transactions logged yet</td></tr>';
        return;
      }
      tbody.innerHTML = data.data.map(tx => `
        <tr>
          <td>${new Date(tx.date).toLocaleDateString()}</td>
          <td>${tx.title}</td>
          <td>${tx.category}</td>
          <td style="color: ${tx.type === 'expense' ? '#e74c3c' : '#27ae60'}; font-weight: 600;">
            ${tx.type === 'expense' ? '-' : '+'}$${parseFloat(tx.amount).toFixed(2)}
          </td>
          <td><button onclick="deleteTx('${tx._id}')" style="color: red; border:none; background:none; cursor:pointer;">Delete</button></td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load transactions:', err);
  }
}

async function handleAddTransaction(e) {
  e.preventDefault();
  const title = document.getElementById('txTitle').value;
  const amount = parseFloat(document.getElementById('txAmount').value);
  const type = document.getElementById('txType').value;
  const category = document.getElementById('txCategory').value;

  try {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, amount, type, category })
    });
    const data = await res.json();

    if (data.success) {
      document.getElementById('txTitle').value = '';
      document.getElementById('txAmount').value = '';
      loadDashboardData();
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert('Error adding transaction');
  }
}

async function deleteTx(id) {
  if (!confirm('Delete this transaction?')) return;
  try {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      loadDashboardData();
    }
  } catch (err) {
    alert('Error deleting transaction');
  }
}

async function loadBudgets() {
  try {
    const res = await fetch('/api/budgets', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      const container = document.getElementById('budgetList');
      if (data.data.length === 0) {
        container.innerHTML = '<p style="color: #666;">No budgets configured for this month.</p>';
        return;
      }

      container.innerHTML = data.data.map(bg => {
        const spentVal = parseFloat(bg.spent || 0);
        const limitVal = parseFloat(bg.limit || 1);
        const percent = Math.min(Math.round((spentVal / limitVal) * 100), 100);
        let colorClass = '';
        if (spentVal > limitVal) colorClass = 'danger';
        else if (percent >= 75) colorClass = 'warning';

        return `
          <div class="budget-item">
            <div class="budget-header">
              <span>${bg.category}</span>
              <span>$${spentVal.toFixed(2)} / $${limitVal.toFixed(2)} (${percent}%)</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill ${colorClass}" style="width: ${percent}%;"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Failed to load budgets:', err);
  }
}

async function handleSetBudget(e) {
  e.preventDefault();
  const category = document.getElementById('bgCategory').value;
  const limit = parseFloat(document.getElementById('bgLimit').value);
  const month = new Date().toISOString().slice(0, 7);

  try {
    const res = await fetch('/api/budgets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ category, limit, month })
    });
    const data = await res.json();

    if (data.success) {
      document.getElementById('bgLimit').value = '';
      loadBudgets();
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert('Error setting budget');
  }
}

async function loadForecast() {
  try {
    const res = await fetch('/api/reports/forecast', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success && data.forecast.length > 0) {
      const container = document.getElementById('forecastContainer');
      container.innerHTML = data.forecast.map(item => `
        <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:5px;">
          <span>${item.category}:</span>
          <strong>~$${parseFloat(item.monthlyAverageForecast).toFixed(2)} / mo</strong>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load forecast:', err);
  }
}
