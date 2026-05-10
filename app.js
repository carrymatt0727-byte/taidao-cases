// Data for the System (Shared via LocalStorage)
let mockCases = JSON.parse(localStorage.getItem('taidao_cases')) || [];
let notifications = JSON.parse(localStorage.getItem('taidao_notifications')) || [];
let currentUser = null;

const users = {
    'head': { name: '檢察長', role: '檢察長', password: 'head123', dept: '檢察長室' },
    'spokesman': { name: '襄閱主任檢察官', role: '襄閱主任檢察官', password: 'spk123', dept: '襄閱辦公室' },
    'admin': { name: '江睿哲', role: '主任檢察官', password: 'admin123', dept: '主任檢察官室' },
    'prosecutor': { name: '檢察官', role: '檢察官', password: 'pro123', dept: '刑事部 第三偵查組' },
    'investigator': { name: '檢察事務官', role: '檢察事務官', password: 'inv123', dept: '檢察事務官室' },
    'clerk': { name: '書記官', role: '書記官', password: 'clerk123', dept: '書記處 紀錄科' }
};

const views = {
    dashboard: () => `
        <div class="view-header"><h2 style="margin-bottom: 1.5rem; font-size: 1.5rem;">儀表板總覽</h2></div>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">辦理中案件</div>
                <div class="stat-value">${mockCases.filter(c => ['accepted', 'investigating'].includes(c.status)).length}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted)">目前即時數據</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">待簽核文書</div>
                <div class="stat-value">0</div>
                <div style="font-size: 0.8rem; color: var(--text-muted)">今日暫無待辦</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">本月結案數</div>
                <div class="stat-value">${mockCases.filter(c => ['indicted', 'not_prosecuted', 'deferred'].includes(c.status)).length}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted)">目標達成率 0%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">開庭次數 (本週)</div>
                <div class="stat-value">0</div>
                <div style="font-size: 0.8rem; color: var(--text-muted)">本週無庭期</div>
            </div>
        </div>
        <div class="section-card">
            <div class="section-header"><h3>案件列表</h3><button class="btn-primary" onclick="openAddModal()">+ 手動新增案件</button></div>
            <div id="dashboard-table-container">${renderTable(mockCases.slice(0, 5))}</div>
        </div>
    `,
    cases: () => `
        <div class="section-header"><h2 style="font-size: 1.5rem;">案件管理系統</h2><button class="btn-primary" onclick="openAddModal()">+ 新增案件</button></div>
        <div class="section-card">
            <table>
                <thead><tr><th>案號</th><th>被告</th><th>案由</th><th>承辦人</th><th>目前狀態</th><th>操作</th></tr></thead>
                <tbody>
                    ${mockCases.length > 0 ? mockCases.map(c => `
                        <tr>
                            <td style="font-family: monospace; font-weight: 600;">${c.id}</td>
                            <td>${c.defendant}</td>
                            <td>${c.charge}</td>
                            <td>${c.prosecutor}</td>
                            <td><span class="status-pill status-${c.status}">${getStatusLabel(c.status)}</span></td>
                            <td><i data-lucide="eye" size="18" style="cursor: pointer"></i></td>
                        </tr>
                    `).join('') : `<tr><td colspan="6" style="text-align: center; padding: 2rem;">無案件資料</td></tr>`}
                </tbody>
            </table>
        </div>
    `,
    analytics: () => `
        <div class="view-header"><h2 style="margin-bottom: 1.5rem;">數據統計分析</h2></div>
        <div class="stats-grid">
            <div class="section-card" style="grid-column: span 2;">
                <h3>案件狀態比例</h3>
                <div style="height: 300px; padding: 1rem;"><canvas id="statusChart"></canvas></div>
            </div>
            <div class="section-card">
                <h3>每月案件趨勢</h3>
                <div style="height: 300px; padding: 1rem;"><canvas id="trendChart"></canvas></div>
            </div>
        </div>
    `
};

// Authentication & Logic
function handleLogin(event) {
    event.preventDefault();
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    if (users[user] && users[user].password === pass) {
        currentUser = users[user];
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-root').style.display = 'block';
        document.getElementById('user-name').textContent = currentUser.name + ' ' + currentUser.role;
        document.getElementById('user-role').textContent = currentUser.dept;
        updateNotifBadge();
        switchView('dashboard');
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

function logout() {
    currentUser = null;
    document.getElementById('app-root').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
}

// Notification System
function notifyAll(message) {
    const notif = {
        id: Date.now(),
        message: message,
        time: new Date().toLocaleTimeString(),
        sender: currentUser.name
    };
    notifications.unshift(notif);
    localStorage.setItem('taidao_notifications', JSON.stringify(notifications));
    updateNotifBadge();
    showToast(message);
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i data-lucide="info"></i> <span>${message}</span>`;
    container.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

function toggleNotifications() {
    const dropdown = document.getElementById('notification-dropdown');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    if (dropdown.style.display === 'block') {
        renderNotifications();
        // Mark all as read conceptually
        localStorage.setItem('last_notif_read', Date.now());
        updateNotifBadge();
    }
}

function renderNotifications() {
    const list = document.getElementById('notification-list');
    if (notifications.length === 0) {
        list.innerHTML = `<div style="text-align: center; padding: 1rem; color: var(--text-muted);">暫無通知</div>`;
        return;
    }
    list.innerHTML = notifications.map(n => `
        <div class="notification-item">
            <div style="font-weight: 600;">${n.sender} 新增了案件</div>
            <div style="color: var(--text-muted); font-size: 0.75rem;">${n.message}</div>
            <div style="font-size: 0.7rem; color: var(--accent-color); margin-top: 4px;">${n.time}</div>
        </div>
    `).join('');
}

function updateNotifBadge() {
    const badge = document.getElementById('notif-badge');
    const lastRead = localStorage.getItem('last_notif_read') || 0;
    const unread = notifications.filter(n => n.id > lastRead).length;
    if (unread > 0) {
        badge.textContent = unread;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// Sync across tabs
window.addEventListener('storage', (e) => {
    if (e.key === 'taidao_cases') mockCases = JSON.parse(e.newValue);
    if (e.key === 'taidao_notifications') {
        notifications = JSON.parse(e.newValue);
        updateNotifBadge();
        const lastNotif = notifications[0];
        if (lastNotif && lastNotif.sender !== currentUser?.name) {
            showToast(`${lastNotif.sender} 新增了案件：${lastNotif.message}`);
        }
    }
});

// Chart Logic (Same as before but uses localStorage data)
function initCharts() {
    const ctxStatus = document.getElementById('statusChart');
    if (ctxStatus) {
        const statusCounts = { accepted: 0, investigating: 0, indicted: 0, not_prosecuted: 0, deferred: 0, awaiting_trial: 0 };
        mockCases.forEach(c => statusCounts[c.status]++);
        new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: ['已受理', '偵查中', '起訴', '不起訴', '緩起訴', '待審判'],
                datasets: [{ data: Object.values(statusCounts), backgroundColor: ['#94a3b8', '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#a855f7'], borderWidth: 0 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#94a3b8' } } } }
        });
    }
}

// Global UI Functions
function getStatusLabel(status) {
    const labels = { 'accepted': '已受理', 'investigating': '偵查中', 'indicted': '起訴', 'not_prosecuted': '不起訴', 'deferred': '緩起訴', 'awaiting_trial': '待審判' };
    return labels[status] || status;
}

function renderTable(data) {
    if (data.length === 0) return `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">目前尚無案件。</div>`;
    return `<table><thead><tr><th>案號</th><th>被告</th><th>案由</th><th>承辦人</th><th>狀態</th><th>更新</th></tr></thead><tbody>${data.map(c => `<tr><td style="font-family: monospace; font-weight: 600;">${c.id}</td><td>${c.defendant}</td><td>${c.charge}</td><td>${c.prosecutor}</td><td><span class="status-pill status-${c.status}">${getStatusLabel(c.status)}</span></td><td>${c.date}</td></tr>`).join('')}</tbody></table>`;
}

function openAddModal() { document.getElementById('case-modal').style.display = 'flex'; }
function closeAddModal() { document.getElementById('case-modal').style.display = 'none'; }

function handleAddCase(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const caseId = formData.get('caseId');
    const newCase = { id: caseId, defendant: formData.get('defendant'), charge: formData.get('charge'), status: formData.get('status'), date: new Date().toISOString().split('T')[0], prosecutor: currentUser.name };
    mockCases.unshift(newCase);
    localStorage.setItem('taidao_cases', JSON.stringify(mockCases));
    notifyAll(`案號：${caseId} (${newCase.defendant} - ${newCase.charge})`);
    closeAddModal();
    event.target.reset();
    const currentView = document.querySelector('.nav-link.active').getAttribute('onclick').match(/'(.*?)'/)[1];
    switchView(currentView);
}

function switchView(viewName) {
    const content = document.getElementById('app-content');
    document.querySelectorAll('.nav-link').forEach(link => { link.classList.remove('active'); if (link.getAttribute('onclick')?.includes(viewName)) link.classList.add('active'); });
    if (views[viewName]) {
        content.innerHTML = views[viewName]();
        lucide.createIcons();
        if (viewName === 'analytics') setTimeout(initCharts, 100);
    }
}

window.onload = () => { lucide.createIcons(); };
