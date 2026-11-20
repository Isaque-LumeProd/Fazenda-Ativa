(function () {
  const STORAGE_SNAPSHOT_KEY = 'agrorancho_snapshot_v1';
  const STORAGE_QUEUE_KEY = 'agrorancho_offline_queue_v1';
  const STORAGE_OPERATOR_KEY = 'agrorancho_operator_v1';

  const state = {
    data: null,
    activeTab: 'hoje',
    animalFilter: 'Todos',
    operatorName: localStorage.getItem(STORAGE_OPERATOR_KEY) || 'Fazendeiro',
    iphonePreview: false,
    online: navigator.onLine,
    offlineQueue: loadOfflineQueue()
  };

  const els = {
    mainContent: document.getElementById('main-content'),
    pageTitle: document.getElementById('page-title'),
    sidebarFarmName: document.getElementById('sidebar-farm-name'),
    topbarFarmName: document.getElementById('topbar-farm-name'),
    topbarDate: document.getElementById('topbar-date'),
    operatorSelect: document.getElementById('operator-select'),
    mobileOperatorLabel: document.getElementById('mobile-operator-label'),
    syncStatusPill: document.getElementById('sync-status-pill'),
    syncStatusText: document.getElementById('sync-status-text'),
    btnSyncNow: document.getElementById('btn-sync-now'),
    offlineCount: document.getElementById('offline-count'),
    badgeHoje: document.getElementById('badge-hoje'),
    badgeRacao: document.getElementById('badge-racao'),
    badgeAgua: document.getElementById('badge-agua'),
    modalBackdrop: document.getElementById('modal-backdrop'),
    modalTitle: document.getElementById('modal-title'),
    modalBody: document.getElementById('modal-body'),
    modalClose: document.getElementById('modal-close'),
    toastContainer: document.getElementById('toast-container'),
    btnToggleIphone: document.getElementById('btn-toggle-iphone-preview'),
    btnConnectIphone: document.getElementById('btn-connect-iphone'),
    btnMobileIphoneHelp: document.getElementById('btn-mobile-iphone-help'),
    btnOpenFarmModal: document.getElementById('btn-open-farm-modal'),
    btnMobileOperator: document.getElementById('btn-mobile-operator')
  };

  function loadOfflineQueue() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_QUEUE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveOfflineQueue() {
    localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(state.offlineQueue));
    updateSyncIndicators();
  }

  function saveSnapshot(data) {
    try {
      localStorage.setItem(STORAGE_SNAPSHOT_KEY, JSON.stringify(data));
    } catch {
      // ignore storage quota
    }
  }

  function loadSnapshot() {
    try {
      const raw = localStorage.getItem(STORAGE_SNAPSHOT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatNumber(val, decimals = 0) {
    return Number(val || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function formatMoney(val) {
    return Number(val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function formatDateBR(dateStr) {
    if (!dateStr) return '-';
    const parts = String(dateStr).slice(0, 10).split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function formatTimeBR(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function categoryIcon(category) {
    switch (category) {
      case 'Nelores': return '🐂';
      case 'Vacas': return '🐄';
      case 'Galinhas': return '🐔';
      case 'Pintinhos': return '🐣';
      default: return '🐾';
    }
  }

  function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast${isError ? ' error' : ''}`;
    toast.textContent = message;
    els.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3400);
  }

  function updateSyncIndicators() {
    const queueLen = state.offlineQueue.length;
    els.offlineCount.textContent = String(queueLen);
    if (queueLen > 0) {
      els.btnSyncNow.classList.remove('hidden');
    } else {
      els.btnSyncNow.classList.add('hidden');
    }

    if (state.online) {
      els.syncStatusPill.className = 'status-pill online';
      els.syncStatusText.textContent = 'Online';
    } else {
      els.syncStatusPill.className = 'status-pill offline';
      els.syncStatusText.textContent = 'Offline Campo';
    }
  }

  async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error || 'Erro ao comunicar com o servidor');
    }
    return json;
  }

  async function loadBootstrap() {
    try {
      const payload = await apiRequest('/api/bootstrap');
      state.data = payload;
      state.online = true;
      saveSnapshot(payload);
      if (state.offlineQueue.length > 0) {
        await syncOfflineQueue(true);
      }
    } catch (err) {
      state.online = false;
      const cached = loadSnapshot();
      if (cached) {
        state.data = cached;
        showToast('Modo offline ativo — exibindo dados salvos no dispositivo.');
      } else {
        els.mainContent.innerHTML = `<div class="card"><h3>Sem conexão</h3><p>${escapeHtml(err.message)}</p></div>`;
      }
    }
    updateSyncIndicators();
    renderAll();
  }

  async function syncOfflineQueue(silent = false) {
    if (state.offlineQueue.length === 0) return;
    try {
      const res = await apiRequest('/api/sync-batch', {
        method: 'POST',
        body: JSON.stringify({ actions: state.offlineQueue })
      });
      state.offlineQueue = [];
      saveOfflineQueue();
      if (res.data) {
        state.data = { ...state.data, ...res.data };
        saveSnapshot(state.data);
      }
      state.online = true;
      updateSyncIndicators();
      renderAll();
      if (!silent) {
        showToast('Dados do campo sincronizados com sucesso!');
      }
    } catch {
      if (!silent) {
        showToast('Ainda sem sinal para sincronizar. Seus registros continuam salvos no aparelho.', true);
      }
    }
  }

  async function performActionOrQueue({ url, method = 'POST', body = {}, offlineAction, optimisticUpdate, successMessage }) {
    try {
      const res = await apiRequest(url, {
        method,
        body: JSON.stringify(body)
      });
      state.online = true;
      if (res.data) {
        state.data = { ...state.data, ...res.data };
        saveSnapshot(state.data);
      } else {
        await loadBootstrap();
      }
      updateSyncIndicators();
      renderAll();
      if (successMessage) showToast(successMessage);
    } catch (err) {
      if (offlineAction && (!navigator.onLine || err.name === 'TypeError' || err.message.includes('Failed to fetch'))) {
        state.online = false;
        state.offlineQueue.push({
          clientId: `off-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ...offlineAction
        });
        saveOfflineQueue();
        if (typeof optimisticUpdate === 'function' && state.data) {
          optimisticUpdate(state.data);
          saveSnapshot(state.data);
        }
        renderAll();
        showToast('Salvo offline no aparelho! Sincronize quando voltar o sinal.');
      } else {
        showToast(err.message || 'Erro ao executar ação', true);
      }
    }
  }

  function setActiveTab(tab) {
    state.activeTab = tab;
    document.querySelectorAll('.nav-btn, .bottom-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    const titles = {
      hoje: 'Hoje no Rancho',
      animais: 'Meus Animais (Rebanho & Plantel)',
      racao: 'Planejamento de Ração & Estoque',
      'agua-vitaminas': 'Troca de Água & Vitaminas',
      campo: 'Modo Campo — Checklist do Peão'
    };
    els.pageTitle.textContent = titles[tab] || 'AgroRancho';
    renderMainContent();
  }

  function renderAll() {
    if (!state.data) return;
    const { farm, users, totals, feeds, waterStations, vitamins } = state.data;

    els.sidebarFarmName.textContent = farm?.name || 'Meu Rancho';
    els.topbarFarmName.textContent = farm?.name || 'AgroRancho';
    els.topbarDate.textContent = `Manejo · ${formatDateBR(state.data.todayStr)}`;

    if (users && users.length > 0) {
      els.operatorSelect.innerHTML = users
        .map((u) => `<option value="${escapeHtml(u.name)}" ${u.name === state.operatorName ? 'selected' : ''}>${escapeHtml(u.name)}</option>`)
        .join('');
      if (!users.some((u) => u.name === state.operatorName)) {
        state.operatorName = users[0].name;
      }
    }
    els.mobileOperatorLabel.textContent = state.operatorName.split(' ')[0];

    const pendingCount = totals?.pendingTasksCount || 0;
    els.badgeHoje.textContent = String(pendingCount);
    els.badgeHoje.classList.toggle('hidden', pendingCount === 0);

    const lowFeedCount = (feeds || []).filter((f) => f.is_low_stock).length;
    els.badgeRacao.textContent = String(lowFeedCount);
    els.badgeRacao.classList.toggle('hidden', lowFeedCount === 0);

    const urgentWaterVit =
      (waterStations || []).filter((w) => w.computed_status !== 'em_dia').length +
      (vitamins || []).filter((v) => v.computed_status === 'atrasado' || v.computed_status === 'hoje').length;
    els.badgeAgua.textContent = String(urgentWaterVit);
    els.badgeAgua.classList.toggle('hidden', urgentWaterVit === 0);

    renderMainContent();
  }

  function renderMainContent() {
    if (!state.data) return;
    switch (state.activeTab) {
      case 'hoje':
        els.mainContent.innerHTML = renderHojeTab();
        break;
      case 'animais':
        els.mainContent.innerHTML = renderAnimaisTab();
        break;
      case 'racao':
        els.mainContent.innerHTML = renderRacaoTab();
        break;
      case 'agua-vitaminas':
        els.mainContent.innerHTML = renderAguaVitaminasTab();
        break;
      case 'campo':
        els.mainContent.innerHTML = renderCampoTab();
        break;
      default:
        els.mainContent.innerHTML = renderHojeTab();
    }
  }

  function renderHojeTab() {
    const { totals, categoryBreakdown, alerts, todayTasks, todayLogs, groups, feeds, waterStations, vitamins } = state.data;
    const isEmptyFarm = groups.length === 0 && feeds.length === 0 && waterStations.length === 0 && vitamins.length === 0;

    const welcomeHtml = isEmptyFarm
      ? `<section class="card" style="margin-bottom:18px; border:2px dashed var(--primary); background:var(--primary-soft);">
          <h2 style="margin:0 0 6px; font-size:18px; color:var(--primary);">👋 Bem-vindo ao seu painel de Fazenda &amp; Rancho!</h2>
          <p style="margin:0 0 12px; font-size:13px; color:var(--text);">
            O sistema começa 100% limpo para você cadastrar exatamente a realidade do seu rancho. Comece pelos botões abaixo:
          </p>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" data-action="new-animal">🐄 1. Cadastrar Animais</button>
            <button class="btn btn-secondary btn-sm" data-action="new-feed">🌽 2. Cadastrar Ração</button>
            <button class="btn btn-water btn-sm" data-action="new-water">💧 3. Cadastrar Bebedouro</button>
            <button class="btn btn-vitamin btn-sm" data-action="new-vitamin">💊 4. Cadastrar Vitamina</button>
          </div>
        </section>`
      : '';

    const alertHtml = alerts.length > 0
      ? `<div class="alert-list">
          ${alerts.map((a) => `
            <div class="alert-item ${escapeHtml(a.severity)}" data-jump-tab="${escapeHtml(a.targetTab)}">
              <div>
                <strong>${escapeHtml(a.title)}:</strong> ${escapeHtml(a.message)}
              </div>
              <span>Ver →</span>
            </div>
          `).join('')}
        </div>`
      : '';

    const kpiCards = [
      { key: 'Nelores', label: 'Nelores', ico: '🐂', count: totals.nelores, feed: categoryBreakdown.Nelores.dailyFeedKg, water: categoryBreakdown.Nelores.dailyWaterLiters },
      { key: 'Vacas', label: 'Vacas', ico: '🐄', count: totals.vacas, feed: categoryBreakdown.Vacas.dailyFeedKg, water: categoryBreakdown.Vacas.dailyWaterLiters },
      { key: 'Galinhas', label: 'Galinhas', ico: '🐔', count: totals.galinhas, feed: categoryBreakdown.Galinhas.dailyFeedKg, water: categoryBreakdown.Galinhas.dailyWaterLiters },
      { key: 'Pintinhos', label: 'Pintinhos', ico: '🐣', count: totals.pintinhos, feed: categoryBreakdown.Pintinhos.dailyFeedKg, water: categoryBreakdown.Pintinhos.dailyWaterLiters }
    ];

    return `
      ${welcomeHtml}
      ${alertHtml}

      <div class="grid-4">
        ${kpiCards.map((k) => `
          <div class="kpi-card" style="cursor:pointer" data-filter-animal="${escapeHtml(k.key)}">
            <div class="kpi-top">
              <span class="kpi-label">${escapeHtml(k.label)}</span>
              <span class="kpi-ico">${k.ico}</span>
            </div>
            <div class="kpi-value">${formatNumber(k.count)}</div>
            <div class="kpi-sub">🌽 ${formatNumber(k.feed, 1)} kg/dia · 💧 ${formatNumber(k.water, 0)} L/dia</div>
          </div>
        `).join('')}
      </div>

      <div class="grid-2">
        <section class="card">
          <div class="section-header">
            <h2 class="section-title">🌽 Planejamento do Trato de Hoje</h2>
            <span class="badge badge-ok">${formatNumber(totals.totalAnimals)} animais no total</span>
          </div>
          <div class="stat-pair-grid">
            <div class="stat-box">
              <div class="stat-box-label">Ração Total / Dia</div>
              <div class="stat-box-val">${formatNumber(totals.dailyFeedTotalKg, 2)} kg</div>
            </div>
            <div class="stat-box">
              <div class="stat-box-label">Água Estimada / Dia</div>
              <div class="stat-box-val">${formatNumber(totals.dailyWaterTotalLiters, 0)} L</div>
            </div>
            <div class="stat-box">
              <div class="stat-box-label">Trato Manhã (50%)</div>
              <div class="stat-box-val">${formatNumber(totals.morningFeedTotalKg, 2)} kg</div>
            </div>
            <div class="stat-box">
              <div class="stat-box-label">Trato Tarde (50%)</div>
              <div class="stat-box-val">${formatNumber(totals.afternoonFeedTotalKg, 2)} kg</div>
            </div>
          </div>
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">
            Custo diário estimado em ração: <strong>${formatMoney(totals.estimatedDailyFeedCost)}/dia</strong> (${formatNumber(totals.weeklyFeedTotalKg, 1)} kg/semana)
          </div>
          <div class="card-actions">
            <button class="btn btn-secondary btn-sm" data-action="serve-all-half">☀️ Baixar Meio Trato (${formatNumber(totals.morningFeedTotalKg, 1)} kg)</button>
            <button class="btn btn-primary btn-sm" data-action="serve-all-full">✅ Baixar Trato Completo (${formatNumber(totals.dailyFeedTotalKg, 1)} kg)</button>
          </div>
        </section>

        <section class="card">
          <div class="section-header">
            <h2 class="section-title">📋 Tarefas do Dia</h2>
            <span class="badge ${totals.pendingTasksCount > 0 ? 'badge-warn' : 'badge-ok'}">
              ${totals.pendingTasksCount} pendente(s)
            </span>
          </div>
          <div class="task-list">
            ${todayTasks.length === 0 ? '<p style="color:var(--text-muted);font-size:13px;">Tudo em dia por aqui!</p>' : ''}
            ${todayTasks.map((t) => renderTaskRow(t)).join('')}
          </div>
        </section>
      </div>

      <section class="card">
        <div class="section-header">
          <h2 class="section-title">🕒 Registros Realizados Hoje (${todayLogs.length})</h2>
          <button class="btn btn-outline btn-sm" data-action="open-campo">Abrir Modo Campo →</button>
        </div>
        ${todayLogs.length === 0
          ? '<p style="color:var(--text-muted); font-size:13px; margin:0;">Nenhum manejo registrado hoje ainda.</p>'
          : `<div class="log-list">
              ${todayLogs.map((l) => `
                <div class="log-item">
                  <div>
                    <strong>${escapeHtml(l.title)}</strong>
                    <div style="font-size:12px; color:var(--text-muted);">${escapeHtml(l.details)} · por ${escapeHtml(l.performed_by || 'Produtor')}</div>
                  </div>
                  <span class="log-time">${formatTimeBR(l.created_at)}</span>
                </div>
              `).join('')}
            </div>`
        }
      </section>
    `;
  }

  function renderTaskRow(task) {
    let actionBtn = '';
    if (task.completed) {
      actionBtn = `<span class="badge badge-ok">✓ Feito</span>`;
    } else if (task.type === 'agua') {
      actionBtn = `<button class="btn btn-water btn-sm" data-water-change="${task.refId}">💧 Trocar</button>`;
    } else if (task.type === 'vitamina') {
      actionBtn = `<button class="btn btn-vitamin btn-sm" data-vitamin-apply="${task.refId}">💊 Aplicar</button>`;
    } else if (task.type === 'racao') {
      const feedObj = state.data.feeds.find((f) => f.id === task.refId);
      const amt = feedObj ? feedObj.daily_consumption_kg : 0;
      actionBtn = `<button class="btn btn-primary btn-sm" data-feed-serve="${task.refId}" data-feed-amount="${amt}">🌽 Servir</button>`;
    }

    return `
      <div class="task-row ${task.completed ? 'done' : ''}">
        <div class="task-info">
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-sub">${escapeHtml(task.subtitle)}</div>
        </div>
        ${actionBtn}
      </div>
    `;
  }

  function renderAnimaisTab() {
    const { groups, movements } = state.data;
    const filters = ['Todos', 'Nelores', 'Vacas', 'Galinhas', 'Pintinhos', 'Outros'];
    const filteredGroups = state.animalFilter === 'Todos'
      ? groups
      : groups.filter((g) => g.category === state.animalFilter);

    return `
      <div class="section-header">
        <div class="chip-bar" style="margin-bottom:0;">
          ${filters.map((cat) => `
            <button class="chip ${state.animalFilter === cat ? 'active' : ''}" data-animal-filter="${escapeHtml(cat)}">
              ${cat === 'Todos' ? '🐾 Todos' : `${categoryIcon(cat)} ${escapeHtml(cat)}`}
            </button>
          `).join('')}
        </div>
        <button class="btn btn-primary" data-action="new-animal">+ Novo Lote / Animal</button>
      </div>

      <div class="grid-2">
        ${filteredGroups.length === 0
          ? `<div class="card"><p style="color:var(--text-muted); margin:0;">Nenhum lote cadastrado nesta categoria.</p></div>`
          : filteredGroups.map((g) => `
            <article class="card">
              <div class="section-header" style="margin-bottom:8px;">
                <div>
                  <span class="badge badge-neutral" style="margin-bottom:6px;">${categoryIcon(g.category)} ${escapeHtml(g.category)}</span>
                  <h3 style="margin:0; font-size:17px;">${escapeHtml(g.name)}</h3>
                  <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">📍 ${escapeHtml(g.location_area)} ${g.age_info ? `· ${escapeHtml(g.age_info)}` : ''}</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:28px; font-weight:900; color:var(--primary); line-height:1;">${formatNumber(g.quantity)}</div>
                  <div style="font-size:11px; color:var(--text-muted); font-weight:700;">${g.species === 'ave' ? 'aves' : 'cabeças'}</div>
                </div>
              </div>

              <div class="stat-pair-grid">
                <div class="stat-box">
                  <div class="stat-box-label">Ração Diária do Lote</div>
                  <div class="stat-box-val">${formatNumber(g.daily_feed_kg, 2)} kg/dia</div>
                  <div style="font-size:11px; color:var(--text-muted);">${escapeHtml(g.feed_name || 'Sem ração vinculada')} (${formatNumber(g.feed_per_head_grams)}g/cab)</div>
                </div>
                <div class="stat-box">
                  <div class="stat-box-label">Água Estimada / Dia</div>
                  <div class="stat-box-val">${formatNumber(g.daily_water_liters, 1)} L/dia</div>
                  <div style="font-size:11px; color:var(--text-muted);">Peso médio: ${formatNumber(g.avg_weight_kg, 1)} kg</div>
                </div>
              </div>

              ${g.notes ? `<p style="font-size:12px; color:var(--text-muted); margin:6px 0 0;">📝 ${escapeHtml(g.notes)}</p>` : ''}

              <div class="card-actions">
                <button class="btn btn-secondary btn-sm" data-animal-movement="${g.id}">± Movimentação</button>
                ${g.category === 'Pintinhos'
                  ? `<button class="btn btn-warning btn-sm" data-animal-evolve="${g.id}">🐣→🐔 Evoluir p/ Galinhas</button>`
                  : ''}
                <button class="btn btn-outline btn-sm" data-animal-edit="${g.id}">✏️ Editar</button>
                <button class="btn btn-danger btn-sm" data-animal-delete="${g.id}">🗑️</button>
              </div>
            </article>
          `).join('')}
      </div>

      <section class="card">
        <div class="section-header">
          <h2 class="section-title">📑 Últimas Movimentações (Nascimentos, Compras, Vendas, Evoluções)</h2>
        </div>
        ${movements.length === 0
          ? '<p style="color:var(--text-muted); font-size:13px; margin:0;">Nenhuma movimentação registrada.</p>'
          : `<div class="log-list">
              ${movements.slice(0, 15).map((m) => `
                <div class="log-item">
                  <div>
                    <strong>${escapeHtml(m.group_name || 'Lote')}</strong>
                    <span class="badge ${m.quantity_change >= 0 ? 'badge-ok' : 'badge-danger'}" style="margin-left:6px;">
                      ${m.quantity_change >= 0 ? '+' : ''}${m.quantity_change} (${escapeHtml(m.type)})
                    </span>
                    <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">${escapeHtml(m.description)}</div>
                  </div>
                  <span class="log-time">${formatDateBR(m.created_at)} ${formatTimeBR(m.created_at)}</span>
                </div>
              `).join('')}
            </div>`
        }
      </section>
    `;
  }

  function renderRacaoTab() {
    const { feeds, totals } = state.data;

    return `
      <div class="grid-3">
        <div class="kpi-card">
          <span class="kpi-label">Consumo Diário Total</span>
          <div class="kpi-value">${formatNumber(totals.dailyFeedTotalKg, 2)} kg</div>
          <div class="kpi-sub">Manhã: ${formatNumber(totals.morningFeedTotalKg, 1)} kg · Tarde: ${formatNumber(totals.afternoonFeedTotalKg, 1)} kg</div>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Previsão Semanal / Mensal</span>
          <div class="kpi-value">${formatNumber(totals.weeklyFeedTotalKg, 0)} kg/sem</div>
          <div class="kpi-sub">Mensal (30d): ${formatNumber(totals.monthlyFeedTotalKg, 0)} kg</div>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Custo Estimado</span>
          <div class="kpi-value">${formatMoney(totals.estimatedDailyFeedCost)}/dia</div>
          <div class="kpi-sub">${formatMoney(totals.estimatedDailyFeedCost * 30)} / mês</div>
        </div>
      </div>

      <div class="section-header">
        <h2 class="section-title">Estoque &amp; Consumo Automático por Ração</h2>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" data-action="serve-all-full">✅ Baixar Trato de Hoje</button>
          <button class="btn btn-primary btn-sm" data-action="new-feed">+ Nova Ração</button>
        </div>
      </div>

      <div class="grid-2">
        ${feeds.length === 0
          ? `<div class="card"><p style="color:var(--text-muted); margin:0 0 10px;">Nenhuma ração cadastrada ainda. Cadastre suas rações para o sistema calcular os dias de estoque.</p><button class="btn btn-primary btn-sm" data-action="new-feed">+ Cadastrar Primeira Ração</button></div>`
          : feeds.map((f) => {
          const days = f.days_remaining;
          const pct = Math.min(100, Math.round((f.stock_kg / Math.max(f.min_stock_alert_kg * 3, f.stock_kg, 1)) * 100));
          const barClass = f.is_low_stock ? (days !== null && days <= 2 ? 'danger' : 'warn') : '';

          return `
            <article class="card">
              <div class="section-header" style="margin-bottom:6px;">
                <div>
                  <span class="badge ${f.is_low_stock ? 'badge-danger' : 'badge-ok'}" style="margin-bottom:6px;">
                    ${f.is_low_stock ? '⚠️ Estoque Baixo' : '✓ Estoque Saudável'}
                  </span>
                  <h3 style="margin:0; font-size:17px;">${escapeHtml(f.name)}</h3>
                  <div style="font-size:12px; color:var(--text-muted);">Público-alvo: ${escapeHtml(f.target_category)} · Saco de ${formatNumber(f.bag_weight_kg)} kg</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:24px; font-weight:900;">${formatNumber(f.stock_kg, 1)} kg</div>
                  <div style="font-size:12px; color:var(--text-muted);">(${formatNumber(f.bags_remaining, 1)} sacos)</div>
                </div>
              </div>

              <div class="progress-track">
                <div class="progress-fill ${barClass}" style="width:${pct}%"></div>
              </div>

              <div class="stat-pair-grid">
                <div class="stat-box">
                  <div class="stat-box-label">Consumo Diário Calculado</div>
                  <div class="stat-box-val">${formatNumber(f.daily_consumption_kg, 2)} kg/dia</div>
                  <div style="font-size:11px; color:var(--text-muted);">Manhã ${formatNumber(f.morning_kg, 1)} kg · Tarde ${formatNumber(f.afternoon_kg, 1)} kg</div>
                </div>
                <div class="stat-box">
                  <div class="stat-box-label">Duração Prevista</div>
                  <div class="stat-box-val" style="color:${f.is_low_stock ? 'var(--danger)' : 'var(--primary)'}">
                    ${days !== null ? `${formatNumber(days, 1)} dias` : 'Sem consumo'}
                  </div>
                  <div style="font-size:11px; color:var(--text-muted);">Alerta abaixo de ${formatNumber(f.min_stock_alert_kg)} kg</div>
                </div>
              </div>

              ${f.linked_groups && f.linked_groups.length > 0
                ? `<div style="font-size:12px; color:var(--text-muted); margin-bottom:6px;">
                    Lotes vinculados: ${f.linked_groups.map((lg) => `<strong>${escapeHtml(lg.name)}</strong> (${lg.quantity})`).join(', ')}
                  </div>`
                : `<div style="font-size:12px; color:var(--text-muted); margin-bottom:6px;">Nenhum lote vinculado a esta ração ainda.</div>`
              }

              <div class="card-actions">
                <button class="btn btn-primary btn-sm" data-feed-restock="${f.id}">+ Comprar / Repor</button>
                <button class="btn btn-secondary btn-sm" data-feed-manual-serve="${f.id}">- Dar Baixa</button>
                <button class="btn btn-outline btn-sm" data-feed-edit="${f.id}">✏️ Editar</button>
                <button class="btn btn-danger btn-sm" data-feed-delete="${f.id}">🗑️</button>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderAguaVitaminasTab() {
    const { waterStations, vitamins } = state.data;

    const waterBadge = (status) => {
      if (status === 'atrasado') return '<span class="badge badge-danger">🚨 Troca Urgente</span>';
      if (status === 'atencao') return '<span class="badge badge-warn">⏰ Trocar em Breve</span>';
      return '<span class="badge badge-ok">💧 Água Limpa</span>';
    };

    const vitBadge = (v) => {
      if (v.computed_status === 'atrasado') return `<span class="badge badge-danger">🚨 Atrasada (${Math.abs(v.days_until_due)}d)</span>`;
      if (v.computed_status === 'hoje') return '<span class="badge badge-vit">💊 Aplicar Hoje</span>';
      if (v.computed_status === 'proximo') return `<span class="badge badge-warn">Em ${v.days_until_due} dia(s)</span>`;
      return `<span class="badge badge-ok">Em ${v.days_until_due} dias</span>`;
    };

    return `
      <div class="grid-2">
        <!-- Coluna Troca de Água -->
        <section>
          <div class="section-header">
            <h2 class="section-title">💧 Pontos de Água &amp; Bebedouros</h2>
            <button class="btn btn-water btn-sm" data-action="new-water">+ Bebedouro</button>
          </div>
          <div style="display:flex; flex-direction:column; gap:12px;">
            ${waterStations.length === 0
              ? `<div class="card"><p style="color:var(--text-muted); margin:0 0 10px;">Nenhum bebedouro cadastrado ainda.</p><button class="btn btn-water btn-sm" data-action="new-water">+ Cadastrar Bebedouro</button></div>`
              : waterStations.map((w) => {
              const pctUsed = Math.min(100, Math.round((w.hours_since_change / Math.max(1, w.frequency_hours)) * 100));
              const fillClass = w.computed_status === 'atrasado' ? 'danger' : (w.computed_status === 'atencao' ? 'warn' : 'water');
              return `
                <article class="card">
                  <div class="section-header" style="margin-bottom:6px;">
                    <div>
                      ${waterBadge(w.computed_status)}
                      <h3 style="margin:6px 0 2px; font-size:16px;">${escapeHtml(w.name)}</h3>
                      <div style="font-size:12px; color:var(--text-muted);">📍 ${escapeHtml(w.location_area)} · ${escapeHtml(w.animal_category)} · ${formatNumber(w.capacity_liters)}L</div>
                    </div>
                  </div>
                  <div class="progress-track">
                    <div class="progress-fill ${fillClass}" style="width:${pctUsed}%"></div>
                  </div>
                  <div style="font-size:12px; color:var(--text-muted); display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap;">
                    <span>Troca a cada <strong>${w.frequency_hours}h</strong></span>
                    <span>Última há <strong>${formatNumber(w.hours_since_change, 1)}h</strong> (${escapeHtml(w.last_changed_by || '-')})</span>
                  </div>
                  ${w.water_quality_note ? `<div style="font-size:12px; color:var(--text-muted); margin-top:6px;">📝 ${escapeHtml(w.water_quality_note)}</div>` : ''}
                  <div class="card-actions">
                    <button class="btn btn-water btn-sm" data-water-change="${w.id}">💧 Trocar Água Agora</button>
                    <button class="btn btn-outline btn-sm" data-water-edit="${w.id}">✏️ Editar</button>
                    <button class="btn btn-danger btn-sm" data-water-delete="${w.id}">🗑️</button>
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        </section>

        <!-- Coluna Vitaminas & Suplementos -->
        <section>
          <div class="section-header">
            <h2 class="section-title">💊 Vitaminas, Suplementos &amp; Vacinas</h2>
            <button class="btn btn-vitamin btn-sm" data-action="new-vitamin">+ Nova Vitamina</button>
          </div>
          <div style="display:flex; flex-direction:column; gap:12px;">
            ${vitamins.length === 0
              ? `<div class="card"><p style="color:var(--text-muted); margin:0 0 10px;">Nenhuma vitamina ou vacina programada ainda.</p><button class="btn btn-vitamin btn-sm" data-action="new-vitamin">+ Cadastrar Vitamina</button></div>`
              : vitamins.map((v) => `
              <article class="card">
                <div class="section-header" style="margin-bottom:6px;">
                  <div>
                    ${vitBadge(v)}
                    <h3 style="margin:6px 0 2px; font-size:16px;">${escapeHtml(v.title)}</h3>
                    <div style="font-size:12px; color:var(--text-muted);">
                      Produto: <strong>${escapeHtml(v.product_name)}</strong> · ${escapeHtml(v.target_category)} ${v.target_group_name ? `(${escapeHtml(v.target_group_name)})` : ''}
                    </div>
                  </div>
                </div>
                <div class="stat-pair-grid">
                  <div class="stat-box">
                    <div class="stat-box-label">Via &amp; Frequência</div>
                    <div class="stat-box-val" style="font-size:13px;">${escapeHtml(v.application_method)} · cada ${v.frequency_days}d</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-box-label">Próxima Data / Estoque</div>
                    <div class="stat-box-val" style="font-size:13px;">${formatDateBR(v.next_due_date)} (${v.stock_doses} doses)</div>
                  </div>
                </div>
                <div style="font-size:12px; color:var(--text); background:var(--surface-alt); padding:8px 10px; border-radius:8px; border:1px solid var(--border);">
                  <strong>Dosagem:</strong> ${escapeHtml(v.dosage_instructions)}
                </div>
                <div class="card-actions">
                  <button class="btn btn-vitamin btn-sm" data-vitamin-apply="${v.id}">💊 Confirmar Aplicação</button>
                  <button class="btn btn-outline btn-sm" data-vitamin-edit="${v.id}">✏️ Editar</button>
                  <button class="btn btn-danger btn-sm" data-vitamin-delete="${v.id}">🗑️</button>
                </div>
              </article>
            `).join('')}
          </div>
        </section>
      </div>
    `;
  }

  function renderCampoTab() {
    const { todayTasks, todayLogs } = state.data;
    const pending = todayTasks.filter((t) => !t.completed);
    const done = todayTasks.filter((t) => t.completed);

    return `
      <div class="campo-banner">
        <h2>👷 Modo Campo / Peão</h2>
        <p>Operando como: <strong>${escapeHtml(state.operatorName)}</strong> · ${pending.length} tarefa(s) pendente(s) no manejo de hoje.</p>
      </div>

      ${pending.length === 0
        ? `<div class="card" style="text-align:center; padding:28px;">
            <div style="font-size:40px; margin-bottom:8px;">✅</div>
            <h3 style="margin:0 0 4px;">Todas as tarefas do dia foram concluídas!</h3>
            <p style="color:var(--text-muted); margin:0; font-size:13px;">Os bebedouros, rações e vitaminas programadas para hoje estão em dia.</p>
          </div>`
        : pending.map((t) => {
            let btnHtml = '';
            if (t.type === 'agua') {
              btnHtml = `<button class="btn btn-water btn-lg btn-block" data-water-change="${t.refId}">💧 Confirmar Troca de Água</button>`;
            } else if (t.type === 'vitamina') {
              btnHtml = `<button class="btn btn-vitamin btn-lg btn-block" data-vitamin-apply="${t.refId}">💊 Confirmar Vitamina Aplicada</button>`;
            } else if (t.type === 'racao') {
              const feedObj = state.data.feeds.find((f) => f.id === t.refId);
              const amt = feedObj ? feedObj.daily_consumption_kg : 0;
              btnHtml = `<button class="btn btn-primary btn-lg btn-block" data-feed-serve="${t.refId}" data-feed-amount="${amt}">🌽 Confirmar Ração Servida (${formatNumber(amt, 1)} kg)</button>`;
            }
            return `
              <div class="campo-card ${t.priority === 1 ? 'urgent' : ''}">
                <div>
                  <span class="badge ${t.priority === 1 ? 'badge-danger' : 'badge-warn'}" style="margin-bottom:6px;">
                    ${t.priority === 1 ? '🚨 Prioridade Alta' : '📌 Manejo de Hoje'}
                  </span>
                  <div style="font-size:18px; font-weight:900; margin-bottom:4px;">${escapeHtml(t.title)}</div>
                  <div style="font-size:13px; color:var(--text-muted);">${escapeHtml(t.subtitle)}</div>
                </div>
                ${btnHtml}
              </div>
            `;
          }).join('')
      }

      ${done.length > 0 || todayLogs.length > 0
        ? `<section class="card" style="margin-top:16px;">
            <h3 style="margin:0 0 10px; font-size:15px;">✔️ Concluído Hoje (${todayLogs.length})</h3>
            <div class="log-list">
              ${todayLogs.map((l) => `
                <div class="log-item">
                  <div>
                    <strong>${escapeHtml(l.title)}</strong>
                    <div style="font-size:12px; color:var(--text-muted);">${escapeHtml(l.performed_by || '')}</div>
                  </div>
                  <span class="log-time">${formatTimeBR(l.created_at)}</span>
                </div>
              `).join('')}
            </div>
          </section>`
        : ''
      }
    `;
  }

  /* ======================== MODAIS ======================== */

  function openModal(title, htmlContent) {
    els.modalTitle.textContent = title;
    els.modalBody.innerHTML = htmlContent;
    els.modalBackdrop.classList.remove('hidden');
  }

  function closeModal() {
    els.modalBackdrop.classList.add('hidden');
    els.modalBody.innerHTML = '';
  }

  function openFarmModal() {
    const farm = state.data.farm || {};
    const worker = (state.data.users || []).find((u) => u.role === 'worker');
    openModal('⚙️ Dados da Fazenda / Rancho', `
      <form id="form-farm" class="form-grid">
        <div class="field">
          <label>Nome da Fazenda / Rancho</label>
          <input name="name" value="${escapeHtml(farm.name || '')}" required />
        </div>
        <div class="form-row-2">
          <div class="field">
            <label>Nome do Fazendeiro / Dono</label>
            <input name="owner_name" value="${escapeHtml(farm.owner_name || '')}" required />
          </div>
          <div class="field">
            <label>Nome do Funcionário / Peão</label>
            <input name="worker_name" value="${escapeHtml(worker?.name || 'Funcionário (Campo)')}" />
          </div>
        </div>
        <div class="form-row-2">
          <div class="field">
            <label>Município / Localização</label>
            <input name="location" value="${escapeHtml(farm.location || '')}" />
          </div>
          <div class="field">
            <label>Área Total (hectares)</label>
            <input type="number" step="0.1" name="total_area_ha" value="${escapeHtml(farm.total_area_ha || 0)}" />
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Salvar Alterações</button>
      </form>
      <div style="border-top:1px solid var(--border); margin-top:16px; padding-top:14px;">
        <button type="button" id="btn-reset-farm-data" class="btn btn-danger btn-sm btn-block">🗑️ Zerar Todos os Lotes, Rações, Águas e Vitaminas</button>
      </div>
    `);

    document.getElementById('form-farm').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await performActionOrQueue({
        url: '/api/farm',
        method: 'PUT',
        body: Object.fromEntries(fd.entries()),
        successMessage: 'Dados da fazenda atualizados!'
      });
      closeModal();
    };

    document.getElementById('btn-reset-farm-data').onclick = async () => {
      if (!confirm('Tem certeza? Isso apagará todos os lotes, rações, bebedouros, vitaminas e históricos cadastrados.')) return;
      await performActionOrQueue({
        url: '/api/reset',
        method: 'POST',
        body: {},
        successMessage: 'Sistema zerado! Agora você pode cadastrar tudo do início.'
      });
      closeModal();
    };
  }

  function openConnectIphoneModal() {
    const urls = state.data?.mobileUrls || [];
    const currentHref = window.location.origin;
    const primaryUrl = urls[0] || currentHref;

    openModal('📱 Abrir e Instalar no iPhone', `
      <div style="display:flex; flex-direction:column; gap:12px; font-size:14px;">
        <p style="margin:0;">Com o iPhone conectado no <strong>mesmo Wi-Fi</strong> deste computador, abra o navegador <strong>Safari</strong> no iPhone e digite o endereço abaixo:</p>
        ${urls.length > 0
          ? urls.map((u) => `<div class="url-box">${escapeHtml(u)}</div>`).join('')
          : `<div class="url-box">${escapeHtml(primaryUrl)}</div>`
        }
        <div style="background:var(--surface-alt); border:1px solid var(--border); border-radius:12px; padding:12px;">
          <strong>Como transformar em App na tela do iPhone (PWA):</strong>
          <ol style="margin:8px 0 0; padding-left:18px; line-height:1.6;">
            <li>Abra o endereço acima no <strong>Safari</strong> do iPhone.</li>
            <li>Toque no ícone de <strong>Compartilhar</strong> (quadrado com seta para cima na barra inferior).</li>
            <li>Role e toque em <strong>"Adicionar à Tela de Início"</strong>.</li>
            <li>Pronto! O ícone do <strong>AgroRancho</strong> aparece junto aos seus apps e funciona até offline no pasto.</li>
          </ol>
        </div>
        <button class="btn btn-primary btn-block" id="btn-modal-simulate-iphone">📱 Testar Visual de iPhone Aqui no PC</button>
      </div>
    `);

    document.getElementById('btn-modal-simulate-iphone').onclick = () => {
      closeModal();
      toggleIphonePreview(true);
    };
  }

  function openAnimalModal(group = null) {
    const feeds = state.data?.feeds || [];
    const defaultsByCategory = {
      Nelores: { g: 1800, w: 45 },
      Vacas: { g: 2500, w: 60 },
      Galinhas: { g: 115, w: 0.35 },
      Pintinhos: { g: 35, w: 0.12 },
      Outros: { g: 500, w: 5 }
    };

    const isEdit = Boolean(group);
    openModal(isEdit ? `✏️ Editar ${group.name}` : '🐄 Novo Lote / Animais', `
      <form id="form-animal" class="form-grid">
        <div class="form-row-2">
          <div class="field">
            <label>Categoria</label>
            <select name="category" id="animal-cat-select">
              ${['Nelores', 'Vacas', 'Galinhas', 'Pintinhos', 'Outros'].map((c) => `
                <option value="${c}" ${group?.category === c ? 'selected' : ''}>${c}</option>
              `).join('')}
            </select>
          </div>
          <div class="field">
            <label>Quantidade Atual</label>
            <input type="number" min="0" name="quantity" value="${group ? group.quantity : 10}" required />
          </div>
        </div>
        <div class="field">
          <label>Nome do Lote / Identificação</label>
          <input name="name" value="${escapeHtml(group?.name || '')}" placeholder="Ex: Lote Nelore Pasto Fundo" required />
        </div>
        <div class="form-row-2">
          <div class="field">
            <label>Pasto / Galinheiro / Local</label>
            <input name="location_area" value="${escapeHtml(group?.location_area || '')}" placeholder="Ex: Pasto 02 ou Galinheiro" required />
          </div>
          <div class="field">
            <label>Idade / Fase</label>
            <input name="age_info" value="${escapeHtml(group?.age_info || '')}" placeholder="Ex: 15 dias / Adultas" />
          </div>
        </div>
        <div class="form-row-2">
          <div class="field">
            <label>Ração Vinculada</label>
            <select name="feed_id">
              <option value="">Sem ração vinculada</option>
              ${feeds.map((f) => `<option value="${f.id}" ${Number(group?.feed_id) === f.id ? 'selected' : ''}>${escapeHtml(f.name)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Peso Médio (kg)</label>
            <input type="number" step="0.01" min="0" name="avg_weight_kg" value="${group ? group.avg_weight_kg : 0}" />
          </div>
        </div>
        <div class="form-row-2">
          <div class="field">
            <label>Ração por animal/dia (gramas)</label>
            <input type="number" step="1" min="0" name="feed_per_head_grams" id="animal-feed-g" value="${group ? group.feed_per_head_grams : 1800}" />
          </div>
          <div class="field">
            <label>Água por animal/dia (litros)</label>
            <input type="number" step="0.01" min="0" name="water_per_head_liters" id="animal-water-l" value="${group ? group.water_per_head_liters : 45}" />
          </div>
        </div>
        <div class="field">
          <label>Observações</label>
          <textarea name="notes" rows="2">${escapeHtml(group?.notes || '')}</textarea>
        </div>
        <button type="submit" class="btn btn-primary btn-block">${isEdit ? 'Salvar Alterações' : 'Cadastrar Lote'}</button>
      </form>
    `);

    if (!isEdit) {
      const catSelect = document.getElementById('animal-cat-select');
      catSelect.onchange = () => {
        const def = defaultsByCategory[catSelect.value] || defaultsByCategory.Outros;
        document.getElementById('animal-feed-g').value = def.g;
        document.getElementById('animal-water-l').value = def.w;
      };
    }

    document.getElementById('form-animal').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = Object.fromEntries(fd.entries());
      await performActionOrQueue({
        url: isEdit ? `/api/animals/${group.id}` : '/api/animals',
        method: isEdit ? 'PUT' : 'POST',
        body: payload,
        successMessage: isEdit ? 'Lote atualizado!' : 'Novo lote cadastrado!'
      });
      closeModal();
    };
  }

  function openMovementModal(group, defaultType = 'nascimento') {
    const chickenGroups = (state.data?.groups || []).filter((g) => g.category === 'Galinhas' && g.id !== group.id);
    openModal(`± Movimentação — ${group.name}`, `
      <form id="form-movement" class="form-grid">
        <div style="font-size:13px; color:var(--text-muted);">
          Quantidade atual neste lote: <strong>${group.quantity}</strong>
        </div>
        <div class="form-row-2">
          <div class="field">
            <label>Tipo de Movimentação</label>
            <select name="type" id="mov-type-select">
              <option value="nascimento" ${defaultType === 'nascimento' ? 'selected' : ''}>🐣 Nascimento (+)</option>
              <option value="compra" ${defaultType === 'compra' ? 'selected' : ''}>🛒 Compra / Entrada (+)</option>
              <option value="venda" ${defaultType === 'venda' ? 'selected' : ''}>💰 Venda (-)</option>
              <option value="baixa" ${defaultType === 'baixa' ? 'selected' : ''}>⚠️ Baixa / Mortalidade (-)</option>
              <option value="evolucao" ${defaultType === 'evolucao' ? 'selected' : ''}>🔄 Evolução p/ outro lote (- / +)</option>
            </select>
          </div>
          <div class="field">
            <label>Quantidade</label>
            <input type="number" min="1" name="quantity_change" value="1" required />
          </div>
        </div>
        <div class="field ${defaultType === 'evolucao' ? '' : 'hidden'}" id="mov-target-wrap">
          <label>Lote de Destino (para Evolução)</label>
          <select name="target_group_id">
            ${chickenGroups.length > 0
              ? chickenGroups.map((cg) => `<option value="${cg.id}">${escapeHtml(cg.name)} (atual: ${cg.quantity})</option>`).join('')
              : (state.data?.groups || []).filter((g) => g.id !== group.id).map((og) => `<option value="${og.id}">${escapeHtml(og.name)}</option>`).join('')
            }
          </select>
        </div>
        <div class="field">
          <label>Motivo / Observação</label>
          <input name="description" placeholder="Ex: Eclosão, venda na feira, crescimento das aves..." />
        </div>
        <button type="submit" class="btn btn-primary btn-block">Confirmar Movimentação</button>
      </form>
    `);

    const typeSel = document.getElementById('mov-type-select');
    const targetWrap = document.getElementById('mov-target-wrap');
    typeSel.onchange = () => {
      targetWrap.classList.toggle('hidden', typeSel.value !== 'evolucao');
    };

    document.getElementById('form-movement').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = Object.fromEntries(fd.entries());
      body.performed_by = state.operatorName;
      if (body.type !== 'evolucao') delete body.target_group_id;

      await performActionOrQueue({
        url: `/api/animals/${group.id}/movement`,
        method: 'POST',
        body,
        offlineAction: { type: 'animal_movement', id: group.id, payload: body },
        successMessage: 'Movimentação registrada e cálculos atualizados!'
      });
      closeModal();
    };
  }

  function openFeedModal(feed = null) {
    const isEdit = Boolean(feed);
    openModal(isEdit ? `✏️ Editar ${feed.name}` : '🌽 Cadastrar Nova Ração', `
      <form id="form-feed" class="form-grid">
        <div class="field">
          <label>Nome da Ração / Suplemento</label>
          <input name="name" value="${escapeHtml(feed?.name || '')}" placeholder="Ex: Ração Crescimento Frango" required />
        </div>
        <div class="form-row-2">
          <div class="field">
            <label>Categoria Alvo</label>
            <select name="target_category">
              ${['Nelores', 'Vacas', 'Galinhas', 'Pintinhos', 'Geral'].map((c) => `
                <option value="${c}" ${feed?.target_category === c ? 'selected' : ''}>${c}</option>
              `).join('')}
            </select>
          </div>
          <div class="field">
            <label>Estoque Atual (kg)</label>
            <input type="number" step="0.1" min="0" name="stock_kg" value="${feed ? feed.stock_kg : 50}" required />
          </div>
        </div>
        <div class="form-row-2">
          <div class="field">
            <label>Peso por Saco (kg)</label>
            <input type="number" step="0.5" min="1" name="bag_weight_kg" value="${feed ? feed.bag_weight_kg : 25}" />
          </div>
          <div class="field">
            <label>Alerta de Estoque Mínimo (kg)</label>
            <input type="number" step="1" min="0" name="min_stock_alert_kg" value="${feed ? feed.min_stock_alert_kg : 20}" />
          </div>
        </div>
        <div class="field">
          <label>Custo por kg (R$)</label>
          <input type="number" step="0.01" min="0" name="cost_per_kg" value="${feed ? feed.cost_per_kg : 2.5}" />
        </div>
        <div class="field">
          <label>Observações de Manejo</label>
          <textarea name="notes" rows="2">${escapeHtml(feed?.notes || '')}</textarea>
        </div>
        <button type="submit" class="btn btn-primary btn-block">${isEdit ? 'Salvar Ração' : 'Cadastrar Ração'}</button>
      </form>
    `);

    document.getElementById('form-feed').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await performActionOrQueue({
        url: isEdit ? `/api/feeds/${feed.id}` : '/api/feeds',
        method: isEdit ? 'PUT' : 'POST',
        body: Object.fromEntries(fd.entries()),
        successMessage: isEdit ? 'Ração atualizada!' : 'Nova ração cadastrada!'
      });
      closeModal();
    };
  }

  function openFeedAdjustModal(feed, mode = 'restock') {
    const isRestock = mode === 'restock';
    openModal(isRestock ? `➕ Repor Estoque — ${feed.name}` : `➖ Baixar Ração — ${feed.name}`, `
      <form id="form-feed-adjust" class="form-grid">
        <div style="font-size:13px; color:var(--text-muted);">
          Estoque atual: <strong>${formatNumber(feed.stock_kg, 1)} kg</strong> (saco de ${feed.bag_weight_kg} kg)
        </div>
        <div class="form-row-2">
          <div class="field">
            <label>Quantidade em Sacos</label>
            <input type="number" step="0.5" min="0" name="bags" value="${isRestock ? 2 : 0}" />
          </div>
          <div class="field">
            <label>Ou em Quilos (kg)</label>
            <input type="number" step="0.1" min="0" name="amount_kg" value="${isRestock ? 0 : feed.daily_consumption_kg || 5}" />
          </div>
        </div>
        <div class="field">
          <label>Observação</label>
          <input name="details" placeholder="${isRestock ? 'Ex: Compra na casa agropecuária' : 'Ex: Trato da manhã servido'}" />
        </div>
        <button type="submit" class="btn ${isRestock ? 'btn-primary' : 'btn-secondary'} btn-block">
          ${isRestock ? 'Adicionar ao Estoque' : 'Confirmar Baixa'}
        </button>
      </form>
    `);

    document.getElementById('form-feed-adjust').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = {
        mode,
        bags: Number(fd.get('bags') || 0),
        amount_kg: Number(fd.get('amount_kg') || 0),
        details: fd.get('details') || '',
        performed_by: state.operatorName
      };
      await performActionOrQueue({
        url: `/api/feeds/${feed.id}/adjust`,
        method: 'POST',
        body,
        offlineAction: { type: 'feed_adjust', id: feed.id, payload: body },
        successMessage: isRestock ? 'Estoque reposto com sucesso!' : 'Baixa de ração registrada!'
      });
      closeModal();
    };
  }

  function openWaterModal(station = null) {
    const isEdit = Boolean(station);
    openModal(isEdit ? `✏️ Editar ${station.name}` : '💧 Novo Ponto de Água / Bebedouro', `
      <form id="form-water" class="form-grid">
        <div class="field">
          <label>Nome do Bebedouro / Cocho</label>
          <input name="name" value="${escapeHtml(station?.name || '')}" placeholder="Ex: Bebedouro Piquete 03" required />
        </div>
        <div class="form-row-2">
          <div class="field">
            <label>Local / Área</label>
            <input name="location_area" value="${escapeHtml(station?.location_area || '')}" placeholder="Ex: Galinheiro 2" required />
          </div>
          <div class="field">
            <label>Animais Atendidos</label>
            <select name="animal_category">
              ${['Nelores', 'Vacas', 'Galinhas', 'Pintinhos', 'Geral'].map((c) => `
                <option value="${c}" ${station?.animal_category === c ? 'selected' : ''}>${c}</option>
              `).join('')}
            </select>
          </div>
        </div>
        <div class="form-row-2">
          <div class="field">
            <label>Capacidade (Litros)</label>
            <input type="number" step="1" min="1" name="capacity_liters" value="${station ? station.capacity_liters : 50}" />
          </div>
          <div class="field">
            <label>Trocar Água a Cada (horas)</label>
            <input type="number" min="1" name="frequency_hours" value="${station ? station.frequency_hours : 24}" required />
          </div>
        </div>
        <div class="field">
          <label>Instrução de Limpeza</label>
          <input name="water_quality_note" value="${escapeHtml(station?.water_quality_note || '')}" placeholder="Ex: Escovar fundo e conferir bóia" />
        </div>
        <button type="submit" class="btn btn-water btn-block">${isEdit ? 'Salvar Bebedouro' : 'Cadastrar Bebedouro'}</button>
      </form>
    `);

    document.getElementById('form-water').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await performActionOrQueue({
        url: isEdit ? `/api/water/${station.id}` : '/api/water',
        method: isEdit ? 'PUT' : 'POST',
        body: Object.fromEntries(fd.entries()),
        successMessage: isEdit ? 'Bebedouro atualizado!' : 'Bebedouro cadastrado!'
      });
      closeModal();
    };
  }

  function openVitaminModal(vit = null) {
    const isEdit = Boolean(vit);
    const groups = state.data?.groups || [];
    const today = state.data?.todayStr || new Date().toISOString().slice(0, 10);

    openModal(isEdit ? `✏️ Editar ${vit.title}` : '💊 Nova Vitamina / Suplemento / Vacina', `
      <form id="form-vit" class="form-grid">
        <div class="field">
          <label>Nome do Protocolo / Vitamina</label>
          <input name="title" value="${escapeHtml(vit?.title || '')}" placeholder="Ex: Complexo B + Eletrolítico" required />
        </div>
        <div class="form-row-2">
          <div class="field">
            <label>Nome do Produto</label>
            <input name="product_name" value="${escapeHtml(vit?.product_name || '')}" placeholder="Ex: VitaGold" required />
          </div>
          <div class="field">
            <label>Via de Aplicação</label>
            <select name="application_method">
              ${['Na Água', 'Na Ração', 'Injetável', 'Oral'].map((m) => `
                <option value="${m}" ${vit?.application_method === m ? 'selected' : ''}>${m}</option>
              `).join('')}
            </select>
          </div>
        </div>
        <div class="form-row-2">
          <div class="field">
            <label>Categoria Alvo</label>
            <select name="target_category">
              ${['Pintinhos', 'Galinhas', 'Nelores', 'Vacas', 'Geral'].map((c) => `
                <option value="${c}" ${vit?.target_category === c ? 'selected' : ''}>${c}</option>
              `).join('')}
            </select>
          </div>
          <div class="field">
            <label>Lote Específico (Opcional)</label>
            <select name="target_group_id">
              <option value="">Toda a categoria</option>
              ${groups.map((g) => `<option value="${g.id}" ${Number(vit?.target_group_id) === g.id ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row-2">
          <div class="field">
            <label>Repetir a Cada (dias)</label>
            <input type="number" min="1" name="frequency_days" value="${vit ? vit.frequency_days : 7}" required />
          </div>
          <div class="field">
            <label>Próxima Aplicação</label>
            <input type="date" name="next_due_date" value="${vit ? vit.next_due_date : today}" required />
          </div>
        </div>
        <div class="field">
          <label>Doses em Estoque</label>
          <input type="number" min="0" name="stock_doses" value="${vit ? vit.stock_doses : 10}" />
        </div>
        <div class="field">
          <label>Dosagem / Modo de Uso</label>
          <textarea name="dosage_instructions" rows="2" required>${escapeHtml(vit?.dosage_instructions || '')}</textarea>
        </div>
        <button type="submit" class="btn btn-vitamin btn-block">${isEdit ? 'Salvar Protocolo' : 'Cadastrar Protocolo'}</button>
      </form>
    `);

    document.getElementById('form-vit').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await performActionOrQueue({
        url: isEdit ? `/api/vitamins/${vit.id}` : '/api/vitamins',
        method: isEdit ? 'PUT' : 'POST',
        body: Object.fromEntries(fd.entries()),
        successMessage: isEdit ? 'Protocolo atualizado!' : 'Vitamina programada!'
      });
      closeModal();
    };
  }

  function toggleIphonePreview(forceState) {
    state.iphonePreview = typeof forceState === 'boolean' ? forceState : !state.iphonePreview;
    document.body.classList.toggle('iphone-preview', state.iphonePreview);
    els.btnToggleIphone.textContent = state.iphonePreview ? '🖥️ Voltar ao Modo PC' : '📱 Simular Tela iPhone';
  }

  /* ======================== EVENTOS ======================== */

  document.querySelectorAll('.nav-btn, .bottom-btn').forEach((btn) => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
  });

  els.operatorSelect.addEventListener('change', (e) => {
    state.operatorName = e.target.value;
    localStorage.setItem(STORAGE_OPERATOR_KEY, state.operatorName);
    renderAll();
  });

  els.btnMobileOperator.addEventListener('click', () => {
    const users = state.data?.users || [];
    if (users.length < 2) return;
    const idx = users.findIndex((u) => u.name === state.operatorName);
    const next = users[(idx + 1) % users.length];
    state.operatorName = next.name;
    localStorage.setItem(STORAGE_OPERATOR_KEY, state.operatorName);
    renderAll();
    showToast(`Operando agora como: ${next.name}`);
  });

  els.btnToggleIphone.addEventListener('click', () => toggleIphonePreview());
  els.btnConnectIphone.addEventListener('click', openConnectIphoneModal);
  els.btnMobileIphoneHelp.addEventListener('click', openConnectIphoneModal);
  els.btnOpenFarmModal.addEventListener('click', openFarmModal);
  els.btnSyncNow.addEventListener('click', () => syncOfflineQueue(false));
  els.modalClose.addEventListener('click', closeModal);
  els.modalBackdrop.addEventListener('click', (e) => {
    if (e.target === els.modalBackdrop) closeModal();
  });

  els.mainContent.addEventListener('click', async (e) => {
    const target = e.target.closest('button, [data-jump-tab], [data-filter-animal]');
    if (!target) return;

    if (target.dataset.jumpTab) {
      setActiveTab(target.dataset.jumpTab);
      return;
    }

    if (target.dataset.filterAnimal) {
      state.animalFilter = target.dataset.filterAnimal;
      setActiveTab('animais');
      return;
    }

    if (target.dataset.animalFilter) {
      state.animalFilter = target.dataset.animalFilter;
      renderMainContent();
      return;
    }

    const action = target.dataset.action;
    if (action === 'open-campo') return setActiveTab('campo');
    if (action === 'new-animal') return openAnimalModal();
    if (action === 'new-feed') return openFeedModal();
    if (action === 'new-water') return openWaterModal();
    if (action === 'new-vitamin') return openVitaminModal();

    if (action === 'serve-all-half' || action === 'serve-all-full') {
      const fraction = action === 'serve-all-half' ? 0.5 : 1;
      await performActionOrQueue({
        url: '/api/feeds/serve-all',
        method: 'POST',
        body: { fraction, performed_by: state.operatorName },
        successMessage: fraction === 0.5 ? 'Meio trato baixado do estoque!' : 'Trato completo do dia registrado!'
      });
      return;
    }

    if (target.dataset.waterChange) {
      const id = Number(target.dataset.waterChange);
      await performActionOrQueue({
        url: `/api/water/${id}/change`,
        method: 'POST',
        body: { performed_by: state.operatorName },
        offlineAction: { type: 'water_change', id, payload: { performed_by: state.operatorName } },
        optimisticUpdate: (d) => {
          const st = d.waterStations.find((w) => w.id === id);
          if (st) {
            st.computed_status = 'em_dia';
            st.hours_since_change = 0;
            st.last_changed_by = state.operatorName;
          }
          const t = d.todayTasks.find((tk) => tk.taskId === `water-${id}`);
          if (t) t.completed = true;
        },
        successMessage: 'Troca de água registrada!'
      });
      return;
    }

    if (target.dataset.vitaminApply) {
      const id = Number(target.dataset.vitaminApply);
      await performActionOrQueue({
        url: `/api/vitamins/${id}/apply`,
        method: 'POST',
        body: { performed_by: state.operatorName },
        offlineAction: { type: 'vitamin_apply', id, payload: { performed_by: state.operatorName } },
        optimisticUpdate: (d) => {
          const v = d.vitamins.find((vit) => vit.id === id);
          if (v) {
            v.computed_status = 'programado';
            v.stock_doses = Math.max(0, v.stock_doses - 1);
          }
          const t = d.todayTasks.find((tk) => tk.taskId === `vit-${id}`);
          if (t) t.completed = true;
        },
        successMessage: 'Aplicação de vitamina registrada!'
      });
      return;
    }

    if (target.dataset.feedServe) {
      const id = Number(target.dataset.feedServe);
      const amt = Number(target.dataset.feedAmount || 0);
      if (amt <= 0) return;
      const body = { mode: 'serve', amount_kg: amt, performed_by: state.operatorName, details: 'Trato diário servido' };
      await performActionOrQueue({
        url: `/api/feeds/${id}/adjust`,
        method: 'POST',
        body,
        offlineAction: { type: 'feed_adjust', id, payload: body },
        optimisticUpdate: (d) => {
          const f = d.feeds.find((fd) => fd.id === id);
          if (f) {
            f.stock_kg = Math.max(0, Number((f.stock_kg - amt).toFixed(2)));
            f.served_today = true;
          }
          const t = d.todayTasks.find((tk) => tk.taskId === `feed-${id}`);
          if (t) t.completed = true;
        },
        successMessage: `Baixa de ${formatNumber(amt, 1)} kg registrada!`
      });
      return;
    }

    if (target.dataset.animalEdit) {
      const g = state.data.groups.find((x) => x.id === Number(target.dataset.animalEdit));
      if (g) openAnimalModal(g);
      return;
    }

    if (target.dataset.animalMovement) {
      const g = state.data.groups.find((x) => x.id === Number(target.dataset.animalMovement));
      if (g) openMovementModal(g, 'nascimento');
      return;
    }

    if (target.dataset.animalEvolve) {
      const g = state.data.groups.find((x) => x.id === Number(target.dataset.animalEvolve));
      if (g) openMovementModal(g, 'evolucao');
      return;
    }

    if (target.dataset.animalDelete) {
      const id = Number(target.dataset.animalDelete);
      if (!confirm('Remover este lote de animais?')) return;
      await performActionOrQueue({
        url: `/api/animals/${id}`,
        method: 'DELETE',
        successMessage: 'Lote removido!'
      });
      return;
    }

    if (target.dataset.feedRestock) {
      const f = state.data.feeds.find((x) => x.id === Number(target.dataset.feedRestock));
      if (f) openFeedAdjustModal(f, 'restock');
      return;
    }

    if (target.dataset.feedManualServe) {
      const f = state.data.feeds.find((x) => x.id === Number(target.dataset.feedManualServe));
      if (f) openFeedAdjustModal(f, 'serve');
      return;
    }

    if (target.dataset.feedEdit) {
      const f = state.data.feeds.find((x) => x.id === Number(target.dataset.feedEdit));
      if (f) openFeedModal(f);
      return;
    }

    if (target.dataset.feedDelete) {
      const id = Number(target.dataset.feedDelete);
      if (!confirm('Excluir esta ração?')) return;
      await performActionOrQueue({
        url: `/api/feeds/${id}`,
        method: 'DELETE',
        successMessage: 'Ração removida!'
      });
      return;
    }

    if (target.dataset.waterEdit) {
      const w = state.data.waterStations.find((x) => x.id === Number(target.dataset.waterEdit));
      if (w) openWaterModal(w);
      return;
    }

    if (target.dataset.waterDelete) {
      const id = Number(target.dataset.waterDelete);
      if (!confirm('Excluir este bebedouro?')) return;
      await performActionOrQueue({
        url: `/api/water/${id}`,
        method: 'DELETE',
        successMessage: 'Bebedouro removido!'
      });
      return;
    }

    if (target.dataset.vitaminEdit) {
      const v = state.data.vitamins.find((x) => x.id === Number(target.dataset.vitaminEdit));
      if (v) openVitaminModal(v);
      return;
    }

    if (target.dataset.vitaminDelete) {
      const id = Number(target.dataset.vitaminDelete);
      if (!confirm('Excluir este protocolo de vitamina?')) return;
      await performActionOrQueue({
        url: `/api/vitamins/${id}`,
        method: 'DELETE',
        successMessage: 'Protocolo removido!'
      });
    }
  });

  window.addEventListener('online', () => {
    state.online = true;
    updateSyncIndicators();
    syncOfflineQueue(false);
  });

  window.addEventListener('offline', () => {
    state.online = false;
    updateSyncIndicators();
    showToast('Sem sinal no campo — alterações serão salvas no dispositivo.');
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  loadBootstrap();
})();
