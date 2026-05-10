// Security Enhanced Logic
let mockCases = JSON.parse(localStorage.getItem('taidao_cases')) || [];
let notifications = JSON.parse(localStorage.getItem('taidao_notifications')) || [];
let courtSessions = JSON.parse(localStorage.getItem('taidao_court_sessions')) || [];
let approvals = JSON.parse(localStorage.getItem('taidao_approvals')) || [];
let currentUser = JSON.parse(sessionStorage.getItem('taidao_session')) || null;
let currentSearchTerm = "";
let loginAttempts = 0;

const users = {
    'head': { name: '楊顯凡', role: '檢察長', hash: 'aGVhZDEyMw==', dept: '檢察長室' },
    'spokesman': { name: '王宇川', role: '襄閱主任檢察官', hash: 'c3BrMTIz', dept: '襄閱辦公室' },
    'admin': { name: '江睿哲', role: '主任檢察官', hash: 'YWRtaW4xMjM=', dept: '主任檢察官室' },
    'prosecutor': { name: '林祖媽', role: '檢察官', hash: 'cHJvMTIz', dept: '刑事部 第三偵查組' },
    'investigator': { name: '檢察事務官', role: '檢察事務官', hash: 'aW52MTIz', dept: '檢察事務官室' },
    'clerk': { name: '書記官', role: '書記官', hash: 'Y2xlcmsxMjM=', dept: '書記處 紀錄科' }
};

const views = {
    dashboard: () => `
        <div class="view-header"><h2 style="margin-bottom: 1.5rem; font-size: 1.5rem;">儀表板總覽</h2></div>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-label">辦理中案件</div><div class="stat-value">${mockCases.filter(c => c.status !== 'rejected').length}</div></div>
            <div class="stat-card"><div class="stat-label">待簽章案件</div><div class="stat-value" style="color: var(--gold)">${mockCases.filter(c => c.status === 'pending_sign').length}</div></div>
            <div class="stat-card"><div class="stat-label">本月結案數</div><div class="stat-value">0</div></div>
            <div class="stat-card"><div class="stat-label">本週庭期</div><div class="stat-value">${courtSessions.length}</div></div>
        </div>
        <div class="section-card">
            <div class="section-header"><h3>最近案件</h3><button class="btn-primary" onclick="openAddModal()">+ 手動新增案件</button></div>
            <div id="dashboard-table-container">${renderTable(getFilteredCases().slice(0, 5))}</div>
        </div>
    `,
    cases: () => `
        <div class="section-header"><h2 style="font-size: 1.5rem;">案件管理系統</h2><button class="btn-primary" onclick="openAddModal()">+ 新增案件</button></div>
        <div class="section-card">
            <div id="case-list-container">${renderCaseTableWithApproval(getFilteredCases())}</div>
        </div>
    `,
    calendar: () => `
        <div class="view-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h2 style="font-size: 1.5rem;">庭期日曆</h2><button class="btn-primary" onclick="openCourtModal()">+ 安排新庭期</button>
        </div>
        <div class="section-card" style="height: calc(100vh - 220px);"><div id="calendar-container"></div></div>
    `,
    approvals: () => {
        approvals = JSON.parse(localStorage.getItem('taidao_approvals')) || [];
        return `
            <div class="view-header"><h2 style="margin-bottom: 1.5rem; font-size: 1.5rem;">案件審核系統</h2></div>
            <div class="section-card">
                <h3>${currentUser.role === '檢察長' ? '待處理審核案件' : '我的審核進度'}</h3>
                <div style="margin-top: 1.5rem;">${renderApprovalTable()}</div>
            </div>
        `;
    },
    signing: () => {
        const data = mockCases.filter(c => c.status === 'pending_sign');
        return `
            <div class="view-header"><h2 style="margin-bottom: 1.5rem; font-size: 1.5rem;">閱卷簽章系統</h2></div>
            <div class="section-card">
                <h3>${currentUser.role === '檢察長' ? '待簽章案件列表' : '簽章進度'}</h3>
                <div style="margin-top: 1.5rem;">
                    ${data.length === 0 ? '<div style="text-align: center; padding: 2rem;">目前無待簽章案件</div>' : `
                        <table><thead><tr><th>案號</th><th>被告</th><th>操作</th></tr></thead><tbody>
                            ${data.map(c => `
                                <tr>
                                    <td style="font-family: monospace; font-weight: 600;">${c.id}</td><td>${c.defendant}</td>
                                    <td>
                                        ${currentUser.role === '檢察長' ? `
                                            <button class="btn-secondary" style="font-size: 0.75rem;" onclick="window.mockReview('${c.id}')">閱卷</button>
                                            <button class="btn-primary" style="font-size: 0.75rem; background: var(--success); border: none;" onclick="window.signCase('${c.id}', 'approved')">通過</button>
                                            <button class="btn-primary" style="font-size: 0.75rem; background: var(--danger); border: none;" onclick="window.signCase('${c.id}', 'rejected')">不通過</button>
                                        ` : '<span style="color: var(--gold)">等候檢察長簽章</span>'}
                                    </td>
                                </tr>`).join('')}
                        </tbody></table>
                    `}
                </div>
            </div>
        `;
    },
    analytics: () => `
        <div class="view-header"><h2 style="margin-bottom: 1.5rem;">數據統計分析</h2></div>
        <div class="stats-grid">
            <div class="section-card" style="grid-column: span 2;"><h3>案件狀態比例</h3><div style="height: 300px;"><canvas id="statusChart"></canvas></div></div>
            <div class="section-card"><h3>每月案件趨勢</h3><div style="height: 300px;"><canvas id="trendChart"></canvas></div></div>
        </div>
    `,
    settings: () => `
        <div class="view-header"><h2 style="margin-bottom: 1.5rem;">系統設定</h2></div>
        <div class="stats-grid">
            <div class="section-card" style="grid-column: span 2;"><h3>個人帳號設定</h3><p>姓名: ${currentUser.name}</p><p>職稱: ${currentUser.role}</p></div>
            <div class="section-card" style="grid-column: span 2;"><h3 style="color: var(--danger);">數據管理</h3><button class="btn-secondary" style="margin-top: 1rem; color: var(--danger); border-color: var(--danger);" onclick="clearAllData()">清空系統所有資料</button></div>
        </div>
    `
};

// Signing Logic
window.mockReview = function(id) {
    const c = mockCases.find(x => x.id === id);
    alert(`【閱卷中】\n案號：${c.id}\n被告：${c.defendant}\n\n偵查卷宗閱覽中...`);
};

window.signCase = function(id, result) {
    if (currentUser.role !== '檢察長') return;
    const idx = mockCases.findIndex(x => x.id === id);
    if (idx !== -1) {
        mockCases[idx].status = (result === 'approved' ? 'awaiting_trial' : 'rejected');
        localStorage.setItem('taidao_cases', JSON.stringify(mockCases));
        notifyAll(`案號 ${id} 簽章結果：${result === 'approved' ? '通過' : '不通過'}`);
        switchView('signing');
    }
};

window.submitForSign = function(id) {
    const idx = mockCases.findIndex(x => x.id === id);
    if (idx !== -1) {
        mockCases[idx].status = 'pending_sign';
        localStorage.setItem('taidao_cases', JSON.stringify(mockCases));
        notifyAll(`案件 ${id} 已送交檢察長閱卷簽章`);
        switchView('cases');
    }
};

// Approval Logic
function renderCaseTableWithApproval(data) {
    if (data.length === 0) return `<div style="text-align: center; padding: 2rem;">無相符資料</div>`;
    return `<table><thead><tr><th>案號</th><th>被告</th><th>狀態</th><th>操作</th></tr></thead><tbody>${data.map(c => `
        <tr>
            <td style="font-family: monospace; font-weight: 600;">${c.id}</td><td>${c.defendant}</td>
            <td><span class="status-pill status-${c.status === 'rejected' ? 'rejected' : 'accepted'}">${getStatusLabel(c.status)}</span></td>
            <td>
                ${c.status === 'accepted' ? `<button class="btn-secondary" style="font-size: 0.75rem;" onclick="window.submitForApproval('${c.id}')">送交審核</button>` : ''}
                ${c.status === 'investigating' ? `<button class="btn-primary" style="font-size: 0.75rem; background: var(--accent-color);" onclick="window.submitForSign('${c.id}')">送交簽章</button>` : ''}
                ${c.status === 'awaiting_trial' ? '<span style="color: var(--success); font-size: 0.75rem;">簽章通過</span>' : ''}
            </td>
        </tr>`).join('')}</tbody></table>`;
}

window.submitForApproval = function(caseId) {
    approvals = JSON.parse(localStorage.getItem('taidao_approvals')) || [];
    if (approvals.find(a => a.caseId === caseId && a.status === 'pending')) { alert('該案件已在審核中'); return; }
    const c = mockCases.find(x => x.id === caseId);
    const app = { id: Date.now(), caseId: caseId, defendant: c.defendant, prosecutor: c.prosecutor, status: 'pending', time: new Date().toLocaleString() };
    approvals.unshift(app);
    localStorage.setItem('taidao_approvals', JSON.stringify(approvals));
    notifyAll(`案件 ${caseId} 已送交檢察長審核`);
    switchView('cases');
};

function renderApprovalTable() {
    const data = currentUser.role === '檢察長' ? approvals.filter(a => a.status === 'pending') : approvals;
    if (data.length === 0) return `<div style="text-align: center; color: var(--text-muted); padding: 2rem;">暫無審核項目</div>`;
    return `<table><thead><tr><th>案號</th><th>承辦人</th><th>操作</th></tr></thead><tbody>${data.map(a => `
        <tr>
            <td style="font-family: monospace; font-weight: 600;">${a.caseId}</td><td>${a.prosecutor}</td>
            <td>
                ${currentUser.role === '檢察長' && a.status === 'pending' ? `
                    <button class="btn-primary" style="font-size: 0.75rem; background: var(--success); border: none;" onclick="window.processApproval('${a.id}', 'approved')">通過</button>
                    <button class="btn-primary" style="font-size: 0.75rem; background: var(--danger); border: none;" onclick="window.processApproval('${a.id}', 'rejected')">不通過</button>
                ` : '<span style="color: var(--text-muted)">處理完成</span>'}
            </td>
        </tr>`).join('')}</tbody></table>`;
}

window.processApproval = function(id, result) {
    approvals = JSON.parse(localStorage.getItem('taidao_approvals')) || [];
    const idx = approvals.findIndex(x => x.id == id);
    if (idx === -1) return;
    approvals[idx].status = result;
    mockCases = JSON.parse(localStorage.getItem('taidao_cases')) || [];
    const cIdx = mockCases.findIndex(c => c.id === approvals[idx].caseId);
    if (cIdx !== -1) {
        mockCases[cIdx].status = (result === 'approved' ? 'investigating' : 'rejected');
        localStorage.setItem('taidao_cases', JSON.stringify(mockCases));
    }
    localStorage.setItem('taidao_approvals', JSON.stringify(approvals));
    notifyAll(`案號 ${approvals[idx].caseId} 審核：${result === 'approved' ? '通過' : '不通過'}`);
    switchView('approvals');
};

// Global Logic
function getStatusLabel(s) {
    if (s === 'rejected') return '不受理';
    return '已受理'; // All internal investigative statuses show as '已受理' per request
}

window.handleLogin = function(event) {
    event.preventDefault();
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    if (users[user] && users[user].hash === btoa(pass)) {
        currentUser = users[user];
        sessionStorage.setItem('taidao_session', JSON.stringify(currentUser));
        showApp();
    } else { document.getElementById('login-error').style.display = 'block'; }
};

function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-root').style.display = 'block';
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-role').textContent = currentUser.role;
    switchView('dashboard');
}

window.logout = function() { sessionStorage.clear(); location.reload(); };

window.switchView = function(view) {
    if (!currentUser) return logout();
    const content = document.getElementById('app-content');
    document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.remove('active');
        if (l.getAttribute('onclick')?.includes(`'${view}'`)) l.classList.add('active');
    });
    if (views[view]) {
        content.innerHTML = (typeof views[view] === 'function') ? views[view]() : views[view];
        lucide.createIcons();
        if (view === 'calendar') setTimeout(initCalendar, 100);
    }
};

window.handleSearch = function(term) {
    currentSearchTerm = term.toLowerCase();
    const activeLink = document.querySelector('.nav-link.active');
    if (activeLink) switchView(activeLink.getAttribute('onclick').match(/'(.*?)'/)[1]);
};

function getFilteredCases() {
    mockCases = JSON.parse(localStorage.getItem('taidao_cases')) || [];
    if (!currentSearchTerm) return mockCases;
    return mockCases.filter(c => c.id.toLowerCase().includes(currentSearchTerm) || c.defendant.toLowerCase().includes(currentSearchTerm));
}

function notifyAll(msg) {
    notifications = JSON.parse(localStorage.getItem('taidao_notifications')) || [];
    notifications.unshift({ id: Date.now(), sender: currentUser.name, message: msg, time: new Date().toLocaleTimeString() });
    localStorage.setItem('taidao_notifications', JSON.stringify(notifications));
    showToast(msg);
    const b = document.getElementById('notif-badge');
    if (notifications.length > 0) { b.textContent = notifications.length; b.style.display = 'flex'; }
}

function showToast(msg) {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = `<i data-lucide="info"></i><span>${msg}</span>`;
    c.appendChild(t); lucide.createIcons();
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3500);
}

window.openAddModal = function() { document.getElementById('case-modal').style.display = 'flex'; };
window.closeAddModal = function() { document.getElementById('case-modal').style.display = 'none'; };
window.handleAddCase = function(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const newCase = { id: formData.get('caseId'), defendant: formData.get('defendant'), charge: formData.get('charge'), status: 'accepted', date: new Date().toISOString().split('T')[0], prosecutor: currentUser.name };
    mockCases = JSON.parse(localStorage.getItem('taidao_cases')) || [];
    mockCases.unshift(newCase);
    localStorage.setItem('taidao_cases', JSON.stringify(mockCases));
    notifyAll(`新增案件：${newCase.id}`);
    closeAddModal();
    switchView('dashboard');
};

function renderTable(data) {
    if (data.length === 0) return `<div style="text-align: center; padding: 2rem;">無相符資料</div>`;
    return `<table><thead><tr><th>案號</th><th>被告</th><th>狀態</th></tr></thead><tbody>${data.map(c => `<tr><td style="font-family: monospace; font-weight: 600;">${c.id}</td><td>${c.defendant}</td><td><span class="status-pill status-${c.status === 'rejected' ? 'rejected' : 'accepted'}">${getStatusLabel(c.status)}</span></td></tr>`).join('')}</tbody></table>`;
}

function initCalendar() {
    const el = document.getElementById('calendar-container'); if (!el) return;
    courtSessions = JSON.parse(localStorage.getItem('taidao_court_sessions')) || [];
    const calendar = new FullCalendar.Calendar(el, {
        initialView: 'dayGridMonth', locale: 'zh-tw',
        events: courtSessions.map(s => ({ title: `${s.caseId} - ${s.room}`, start: `${s.date}T${s.time}`, extendedProps: s })),
        eventClick: (info) => alert(`案號：${info.event.extendedProps.caseId}\n地點：${info.event.extendedProps.room}`)
    });
    calendar.render();
}
window.openCourtModal = function() { document.getElementById('court-modal').style.display = 'flex'; };
window.closeCourtModal = function() { document.getElementById('court-modal').style.display = 'none'; };
window.handleAddCourtDate = function(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const session = { id: Date.now(), caseId: formData.get('caseId'), room: formData.get('room'), date: formData.get('date'), time: formData.get('time'), prosecutor: currentUser.name };
    courtSessions = JSON.parse(localStorage.getItem('taidao_court_sessions')) || [];
    courtSessions.push(session);
    localStorage.setItem('taidao_court_sessions', JSON.stringify(courtSessions));
    notifyAll(`安排新庭期：${session.caseId}`);
    closeCourtModal();
    switchView('calendar');
};

window.toggleNotifications = function() {
    const d = document.getElementById('notification-dropdown');
    d.style.display = d.style.display === 'block' ? 'none' : 'block';
    if (d.style.display === 'block') {
        document.getElementById('notification-list').innerHTML = notifications.map(n => `<div class="notification-item"><b>${n.sender}</b>: ${n.message}<br><small>${n.time}</small></div>`).join('');
    }
};

window.clearAllData = function() { if (confirm('重置系統？')) { localStorage.clear(); sessionStorage.clear(); location.reload(); } };

window.onload = () => { lucide.createIcons(); if (currentUser) showApp(); };
