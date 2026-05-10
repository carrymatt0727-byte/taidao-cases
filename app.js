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
            <div class="stat-card"><div class="stat-label">辦理中案件</div><div class="stat-value">${mockCases.filter(c => ['accepted', 'investigating', 'pending_sign'].includes(c.status)).length}</div></div>
            <div class="stat-card"><div class="stat-label">待簽章案件</div><div class="stat-value" style="color: var(--gold)">${mockCases.filter(c => c.status === 'pending_sign').length}</div></div>
            <div class="stat-card"><div class="stat-label">本月結案數</div><div class="stat-value">${mockCases.filter(c => ['indicted', 'not_prosecuted', 'deferred'].includes(c.status)).length}</div></div>
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
            <div id="case-list-container">${renderCaseTableFull(getFilteredCases())}</div>
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
    }
};

// Case Management - Full
function renderCaseTableFull(data) {
    if (data.length === 0) return `<div style="text-align: center; padding: 2rem;">無相符資料</div>`;
    return `<table><thead><tr><th>案號</th><th>被告</th><th>狀態</th><th>手動變更</th><th>操作</th></tr></thead><tbody>${data.map(c => `
        <tr>
            <td style="font-family: monospace; font-weight: 600;">${c.id}</td><td>${c.defendant}</td>
            <td><span class="status-pill status-${c.status}">${getStatusLabel(c.status)}</span></td>
            <td>
                <select onchange="window.manualUpdateStatus('${c.id}', this.value)" style="font-size: 0.75rem; padding: 2px; background: rgba(255,255,255,0.05); color: white; border: 1px solid var(--card-border); border-radius: 4px;">
                    <option value="">-- 快速變更 --</option>
                    <option value="accepted">已受理</option><option value="rejected">不受理</option>
                    <option value="investigating">偵查中</option><option value="indicted">起訴</option>
                    <option value="not_prosecuted">不起訴</option><option value="deferred">緩起訴</option>
                    <option value="awaiting_trial">待審判</option>
                </select>
            </td>
            <td>
                ${c.status === 'accepted' ? `<button class="btn-secondary" style="font-size: 0.75rem; padding: 2px 6px;" onclick="window.submitForApproval('${c.id}')">送審</button>` : ''}
                ${c.status === 'investigating' ? `<button class="btn-primary" style="font-size: 0.75rem; padding: 2px 6px;" onclick="window.submitForSign('${c.id}')">簽章</button>` : ''}
            </td>
        </tr>`).join('')}</tbody></table>`;
}

window.manualUpdateStatus = function(id, newStatus) {
    if (!newStatus) return;
    const idx = mockCases.findIndex(x => x.id === id);
    if (idx !== -1) {
        mockCases[idx].status = newStatus;
        localStorage.setItem('taidao_cases', JSON.stringify(mockCases));
        notifyAll(`案件 ${id} 狀態已變更為：${getStatusLabel(newStatus)}`);
        switchView('cases');
    }
};

// Rest of logic (Signing, Approval, etc.)
window.signCase = function(id, result) {
    const idx = mockCases.findIndex(x => x.id === id);
    if (idx !== -1) {
        mockCases[idx].status = (result === 'approved' ? 'awaiting_trial' : 'rejected');
        localStorage.setItem('taidao_cases', JSON.stringify(mockCases));
        notifyAll(`案件 ${id} 簽章：${result === 'approved' ? '通過' : '不通過'}`);
        switchView('signing');
    }
};

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
    notifyAll(`案件 ${approvals[idx].caseId} 審核：${result === 'approved' ? '通過' : '不通過'}`);
    switchView('approvals');
};

function getStatusLabel(s) {
    const l = { accepted: '已受理', rejected: '不受理', investigating: '偵查中', indicted: '起訴', not_prosecuted: '不起訴', deferred: '緩起訴', awaiting_trial: '待審判', pending_sign: '待簽章' };
    return l[s] || s;
}

// Common functions
window.submitForApproval = function(caseId) {
    approvals = JSON.parse(localStorage.getItem('taidao_approvals')) || [];
    if (approvals.find(a => a.caseId === caseId && a.status === 'pending')) { alert('已在審核中'); return; }
    const c = mockCases.find(x => x.id === caseId);
    const app = { id: Date.now(), caseId: caseId, defendant: c.defendant, prosecutor: c.prosecutor, status: 'pending', time: new Date().toLocaleString() };
    approvals.unshift(app);
    localStorage.setItem('taidao_approvals', JSON.stringify(approvals));
    notifyAll(`案件 ${caseId} 已送審`);
    switchView('cases');
};

window.submitForSign = function(id) {
    const idx = mockCases.findIndex(x => x.id === id);
    if (idx !== -1) {
        mockCases[idx].status = 'pending_sign';
        localStorage.setItem('taidao_cases', JSON.stringify(mockCases));
        notifyAll(`案件 ${id} 已送簽章`);
        switchView('cases');
    }
};

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

window.switchView = function(view) {
    if (!currentUser) return;
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
    const newCase = { id: formData.get('caseId'), defendant: formData.get('defendant'), charge: formData.get('charge'), status: formData.get('status'), date: new Date().toISOString().split('T')[0], prosecutor: currentUser.name };
    mockCases = JSON.parse(localStorage.getItem('taidao_cases')) || [];
    mockCases.unshift(newCase);
    localStorage.setItem('taidao_cases', JSON.stringify(mockCases));
    notifyAll(`新增案件：${newCase.id}`);
    closeAddModal();
    switchView('dashboard');
};

function renderTable(data) {
    if (data.length === 0) return `<div style="text-align: center; padding: 2rem;">無資料</div>`;
    return `<table><thead><tr><th>案號</th><th>被告</th><th>狀態</th></tr></thead><tbody>${data.map(c => `<tr><td style="font-family: monospace; font-weight: 600;">${c.id}</td><td>${c.defendant}</td><td><span class="status-pill status-${c.status}">${getStatusLabel(c.status)}</span></td></tr>`).join('')}</tbody></table>`;
}

window.mockReview = function(id) { alert('閱卷中...'); };
window.logout = function() { sessionStorage.clear(); location.reload(); };
window.clearAllData = function() { if (confirm('重置系統？')) { localStorage.clear(); sessionStorage.clear(); location.reload(); } };

function initCalendar() {
    const el = document.getElementById('calendar-container'); if (!el) return;
    courtSessions = JSON.parse(localStorage.getItem('taidao_court_sessions')) || [];
    const calendar = new FullCalendar.Calendar(el, {
        initialView: 'dayGridMonth', locale: 'zh-tw',
        events: courtSessions.map(s => ({ title: `${s.caseId}`, start: `${s.date}T${s.time}` })),
        eventClick: (info) => alert(`案號：${info.event.title}`)
    });
    calendar.render();
}
window.openCourtModal = function() { document.getElementById('court-modal').style.display = 'flex'; };
window.closeCourtModal = function() { document.getElementById('court-modal').style.display = 'none'; };
window.handleAddCourtDate = function(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const session = { id: Date.now(), caseId: formData.get('caseId'), room: formData.get('room'), date: formData.get('date'), time: formData.get('time'), prosecutor: currentUser.name };
    courtSessions.push(session);
    localStorage.setItem('taidao_court_sessions', JSON.stringify(courtSessions));
    notifyAll(`安排庭期：${session.caseId}`);
    closeCourtModal();
    switchView('calendar');
};
window.toggleNotifications = function() {
    const d = document.getElementById('notification-dropdown');
    d.style.display = d.style.display === 'block' ? 'none' : 'block';
    if (d.style.display === 'block') {
        document.getElementById('notification-list').innerHTML = notifications.map(n => `<div class="notification-item"><b>${n.sender}</b>: ${n.message}</div>`).join('');
    }
};

window.handleSearch = function(term) {
    currentSearchTerm = term.toLowerCase();
    const activeLink = document.querySelector('.nav-link.active');
    if (activeLink) switchView(activeLink.getAttribute('onclick').match(/'(.*?)'/)[1]);
};

window.onload = () => { lucide.createIcons(); if (currentUser) showApp(); };
