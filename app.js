// Data for the System
let mockCases = [];

const views = {
    dashboard: () => `
        <div class="view-header">
            <h2 style="margin-bottom: 1.5rem; font-size: 1.5rem;">儀表板總覽</h2>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">辦理中案件</div>
                <div class="stat-value">24</div>
                <div style="font-size: 0.8rem; color: var(--success)">↑ 12% 較上月</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">待簽核文書</div>
                <div class="stat-value" style="color: var(--warning)">08</div>
                <div style="font-size: 0.8rem; color: var(--text-muted)">今日截止 2 件</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">本月結案數</div>
                <div class="stat-value">15</div>
                <div style="font-size: 0.8rem; color: var(--text-muted)">目標達成率 75%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">開庭次數 (本週)</div>
                <div class="stat-value" style="color: var(--accent-color)">06</div>
                <div style="font-size: 0.8rem; color: var(--text-muted)">下一場：14:30</div>
            </div>
        </div>

        <div class="section-card">
            <div class="section-header">
                <h3>案件列表</h3>
                <button class="btn-primary" onclick="openAddModal()">+ 手動新增案件</button>
            </div>
            <div id="dashboard-table-container">
                ${renderTable(mockCases.slice(0, 5))}
            </div>
        </div>
    `,
    cases: () => `
        <div class="section-header">
            <h2 style="font-size: 1.5rem;">案件管理系統</h2>
            <button class="btn-primary">+ 新增案件</button>
        </div>
        <div class="section-card">
            <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                <select style="background: var(--secondary-bg); color: white; border: 1px solid var(--card-border); padding: 0.5rem; border-radius: 8px;">
                    <option>所有類型</option>
                    <option>偵字案</option>
                    <option>他字案</option>
                </select>
                <select style="background: var(--secondary-bg); color: white; border: 1px solid var(--card-border); padding: 0.5rem; border-radius: 8px;">
                    <option>所有狀態</option>
                    <option>偵辦中</option>
                    <option>待分案</option>
                    <option>已結案</option>
                </select>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>案號</th>
                        <th>被告</th>
                        <th>案由</th>
                        <th>承辦檢察官</th>
                        <th>目前狀態</th>
                        <th>收案日期</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${mockCases.map(c => `
                        <tr>
                            <td style="font-family: monospace; font-weight: 600;">${c.id}</td>
                            <td>${c.defendant}</td>
                            <td>${c.charge}</td>
                            <td>${c.prosecutor}</td>
                            <td><span class="status-pill status-${c.status}">${getStatusLabel(c.status)}</span></td>
                            <td>${c.date}</td>
                            <td>
                                <div style="display: flex; gap: 10px;">
                                    <i data-lucide="eye" size="18" style="cursor: pointer; color: var(--text-muted)"></i>
                                    <i data-lucide="edit-3" size="18" style="cursor: pointer; color: var(--text-muted)"></i>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `,
    documents: () => `
        <div class="view-header">
            <h2 style="margin-bottom: 1.5rem;">法律文書系統</h2>
        </div>
        <div class="stats-grid">
            <div class="stat-card" style="display: flex; align-items: center; gap: 15px;">
                <i data-lucide="file-plus" size="32" style="color: var(--accent-color)"></i>
                <div>
                    <div style="font-weight: 600;">製作起訴書</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">使用範本快速生成</div>
                </div>
            </div>
            <div class="stat-card" style="display: flex; align-items: center; gap: 15px;">
                <i data-lucide="file-check" size="32" style="color: var(--success)"></i>
                <div>
                    <div style="font-weight: 600;">製作不起訴處分書</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">適用於偵查結果</div>
                </div>
            </div>
            <div class="stat-card" style="display: flex; align-items: center; gap: 15px;">
                <i data-lucide="clipboard-list" size="32" style="color: var(--warning)"></i>
                <div>
                    <div style="font-weight: 600;">傳票/公文系統</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">發送法律效力文件</div>
                </div>
            </div>
        </div>
        <div class="section-card" style="margin-top: 2rem;">
            <h3>待簽核文件列表</h3>
            <p style="color: var(--text-muted); margin-top: 1rem;">目前沒有需要立即處理的文書。</p>
        </div>
    `,
    analytics: () => `
        <div class="view-header">
            <h2 style="margin-bottom: 1.5rem;">數據統計分析</h2>
        </div>
        <div class="section-card">
            <div style="height: 300px; display: flex; align-items: center; justify-content: center; border: 1px dashed var(--card-border); border-radius: 15px;">
                <div style="text-align: center">
                    <i data-lucide="pie-chart" size="48" style="color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <p>統計圖表載入中...</p>
                </div>
            </div>
        </div>
    `
};

function getStatusLabel(status) {
    const labels = {
        'active': '偵辦中',
        'pending': '待處理',
        'closed': '已結案'
    };
    return labels[status] || status;
}

function renderTable(data) {
    if (data.length === 0) {
        return `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">目前尚無案件，請點擊上方按鈕新增。</div>`;
    }
    return `
        <table>
            <thead>
                <tr>
                    <th>案號</th>
                    <th>被告</th>
                    <th>案由</th>
                    <th>目前狀態</th>
                    <th>最後更新</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(c => `
                    <tr>
                        <td style="font-family: monospace; font-weight: 600;">${c.id}</td>
                        <td>${c.defendant}</td>
                        <td>${c.charge}</td>
                        <td><span class="status-pill status-${c.status}">${getStatusLabel(c.status)}</span></td>
                        <td>${c.date}</td>
                        <td><i data-lucide="external-link" size="16" style="cursor: pointer"></i></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function openAddModal() {
    document.getElementById('case-modal').style.display = 'flex';
}

function closeAddModal() {
    document.getElementById('case-modal').style.display = 'none';
}

function handleAddCase(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const newCase = {
        id: formData.get('caseId'),
        defendant: formData.get('defendant'),
        charge: formData.get('charge'),
        status: formData.get('status'),
        date: new Date().toISOString().split('T')[0],
        prosecutor: '陳大文'
    };
    
    mockCases.unshift(newCase);
    closeAddModal();
    event.target.reset();
    
    // Refresh current view
    const currentView = document.querySelector('.nav-link.active').onclick.toString().match(/'(.*?)'/)[1];
    switchView(currentView);
}

function switchView(viewName) {
    const content = document.getElementById('app-content');
    
    // Update Nav Links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick')?.includes(viewName)) {
            link.classList.add('active');
        }
    });

    // Render View
    if (views[viewName]) {
        content.innerHTML = views[viewName]();
        // Re-initialize icons for new content
        lucide.createIcons();
    }
}

// Initial View
window.onload = () => {
    switchView('dashboard');
};
