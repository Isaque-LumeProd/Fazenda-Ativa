const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_DB_PATH = path.join(DATA_DIR, 'fazenda.db');

function toLocalDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysToDateStr(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + Number(days || 0));
  return toLocalDateStr(dt);
}

function diffDays(targetDateStr, baseDateStr) {
  const [ty, tm, td] = targetDateStr.split('-').map(Number);
  const [by, bm, bd] = baseDateStr.split('-').map(Number);
  const t = Date.UTC(ty, tm - 1, td);
  const b = Date.UTC(by, bm - 1, bd);
  return Math.round((t - b) / (1000 * 60 * 60 * 24));
}

function inferSpecies(category) {
  const norm = String(category || '').toLowerCase();
  if (norm.includes('nelore') || norm.includes('vaca') || norm.includes('boi') || norm.includes('bezerro') || norm.includes('gado')) {
    return 'bovino';
  }
  if (norm.includes('galinha') || norm.includes('pintinho') || norm.includes('frango') || norm.includes('ave') || norm.includes('pato')) {
    return 'ave';
  }
  return 'outro';
}

function createDatabase(dbPath = DEFAULT_DB_PATH) {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = DELETE;');
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS farms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT '',
      total_area_ha REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'owner',
      pin TEXT DEFAULT '',
      FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS feeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      target_category TEXT NOT NULL,
      stock_kg REAL NOT NULL DEFAULT 0,
      min_stock_alert_kg REAL NOT NULL DEFAULT 20,
      bag_weight_kg REAL NOT NULL DEFAULT 25,
      cost_per_kg REAL NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      updated_at TEXT NOT NULL,
      FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS animal_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      species TEXT NOT NULL,
      name TEXT NOT NULL,
      location_area TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      avg_weight_kg REAL DEFAULT 0,
      age_info TEXT DEFAULT '',
      feed_id INTEGER,
      feed_per_head_grams REAL NOT NULL DEFAULT 0,
      water_per_head_liters REAL NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      updated_at TEXT NOT NULL,
      FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
      FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS animal_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      quantity_change INTEGER NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES animal_groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS water_stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      location_area TEXT NOT NULL,
      animal_category TEXT NOT NULL,
      capacity_liters REAL DEFAULT 50,
      frequency_hours INTEGER NOT NULL DEFAULT 24,
      last_changed_at TEXT NOT NULL,
      last_changed_by TEXT DEFAULT '',
      water_quality_note TEXT DEFAULT '',
      status TEXT DEFAULT 'em_dia',
      FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vitamin_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      product_name TEXT NOT NULL,
      target_group_id INTEGER,
      target_category TEXT NOT NULL,
      application_method TEXT NOT NULL,
      dosage_instructions TEXT NOT NULL,
      frequency_days INTEGER NOT NULL DEFAULT 7,
      next_due_date TEXT NOT NULL,
      last_applied_at TEXT,
      last_applied_by TEXT DEFAULT '',
      stock_doses INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
      FOREIGN KEY (target_group_id) REFERENCES animal_groups(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS daily_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm_id INTEGER NOT NULL,
      log_date TEXT NOT NULL,
      log_type TEXT NOT NULL,
      reference_id INTEGER,
      title TEXT NOT NULL,
      details TEXT DEFAULT '',
      performed_by TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
    );
  `);

  seedInitialData(db);

  function getActiveFarmId() {
    const row = db.prepare('SELECT id FROM farms ORDER BY id ASC LIMIT 1').get();
    return row ? row.id : 1;
  }

  function calculateFarmSummary(farmId = getActiveFarmId()) {
    const now = new Date();
    const todayStr = toLocalDateStr(now);

    const farm = db.prepare('SELECT * FROM farms WHERE id = ?').get(farmId);
    const users = db.prepare('SELECT * FROM users WHERE farm_id = ? ORDER BY id ASC').all(farmId);
    const feeds = db.prepare('SELECT * FROM feeds WHERE farm_id = ? ORDER BY id ASC').all(farmId);
    const groups = db.prepare(`
      SELECT g.*, f.name AS feed_name
      FROM animal_groups g
      LEFT JOIN feeds f ON f.id = g.feed_id
      WHERE g.farm_id = ?
      ORDER BY g.id ASC
    `).all(farmId);
    const movements = db.prepare(`
      SELECT m.*, g.name AS group_name, g.category AS group_category
      FROM animal_movements m
      LEFT JOIN animal_groups g ON g.id = m.group_id
      WHERE m.farm_id = ?
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT 40
    `).all(farmId);
    const waterStations = db.prepare('SELECT * FROM water_stations WHERE farm_id = ? ORDER BY id ASC').all(farmId);
    const vitamins = db.prepare(`
      SELECT v.*, g.name AS target_group_name
      FROM vitamin_schedules v
      LEFT JOIN animal_groups g ON g.id = v.target_group_id
      WHERE v.farm_id = ?
      ORDER BY v.next_due_date ASC, v.id ASC
    `).all(farmId);
    const todayLogs = db.prepare(`
      SELECT * FROM daily_logs
      WHERE farm_id = ? AND log_date = ?
      ORDER BY created_at DESC, id DESC
    `).all(farmId, todayStr);
    const recentLogs = db.prepare(`
      SELECT * FROM daily_logs
      WHERE farm_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 40
    `).all(farmId);

    const categoryBreakdown = {
      Nelores: { count: 0, dailyFeedKg: 0, dailyWaterLiters: 0, groups: 0 },
      Vacas: { count: 0, dailyFeedKg: 0, dailyWaterLiters: 0, groups: 0 },
      Galinhas: { count: 0, dailyFeedKg: 0, dailyWaterLiters: 0, groups: 0 },
      Pintinhos: { count: 0, dailyFeedKg: 0, dailyWaterLiters: 0, groups: 0 },
      Outros: { count: 0, dailyFeedKg: 0, dailyWaterLiters: 0, groups: 0 }
    };

    const feedConsumptionMap = new Map();
    for (const f of feeds) {
      feedConsumptionMap.set(f.id, {
        dailyKg: 0,
        linkedGroups: []
      });
    }

    let totalAnimals = 0;
    let dailyFeedTotalKg = 0;
    let dailyWaterTotalLiters = 0;

    const enrichedGroups = groups.map((g) => {
      const qty = Number(g.quantity || 0);
      const feedPerHeadG = Number(g.feed_per_head_grams || 0);
      const waterPerHeadL = Number(g.water_per_head_liters || 0);

      const groupDailyFeedKg = Number(((qty * feedPerHeadG) / 1000).toFixed(2));
      const groupMorningFeedKg = Number((groupDailyFeedKg * 0.5).toFixed(2));
      const groupAfternoonFeedKg = Number((groupDailyFeedKg * 0.5).toFixed(2));
      const groupDailyWaterLiters = Number((qty * waterPerHeadL).toFixed(1));

      totalAnimals += qty;
      dailyFeedTotalKg += groupDailyFeedKg;
      dailyWaterTotalLiters += groupDailyWaterLiters;

      const bucketKey = categoryBreakdown[g.category] ? g.category : 'Outros';
      categoryBreakdown[bucketKey].count += qty;
      categoryBreakdown[bucketKey].dailyFeedKg = Number((categoryBreakdown[bucketKey].dailyFeedKg + groupDailyFeedKg).toFixed(2));
      categoryBreakdown[bucketKey].dailyWaterLiters = Number((categoryBreakdown[bucketKey].dailyWaterLiters + groupDailyWaterLiters).toFixed(1));
      categoryBreakdown[bucketKey].groups += 1;

      if (g.feed_id && feedConsumptionMap.has(g.feed_id)) {
        const entry = feedConsumptionMap.get(g.feed_id);
        entry.dailyKg += groupDailyFeedKg;
        entry.linkedGroups.push({
          id: g.id,
          name: g.name,
          category: g.category,
          quantity: qty,
          dailyFeedKg: groupDailyFeedKg
        });
      }

      return {
        ...g,
        daily_feed_kg: groupDailyFeedKg,
        morning_feed_kg: groupMorningFeedKg,
        afternoon_feed_kg: groupAfternoonFeedKg,
        weekly_feed_kg: Number((groupDailyFeedKg * 7).toFixed(2)),
        daily_water_liters: groupDailyWaterLiters
      };
    });

    let estimatedDailyFeedCost = 0;
    const feedServedTodayIds = new Set(
      todayLogs.filter((l) => l.log_type === 'racao' && l.reference_id).map((l) => Number(l.reference_id))
    );

    const feedAnalytics = feeds.map((f) => {
      const usage = feedConsumptionMap.get(f.id) || { dailyKg: 0, linkedGroups: [] };
      const dailyKg = Number(usage.dailyKg.toFixed(2));
      const morningKg = Number((dailyKg * 0.5).toFixed(2));
      const afternoonKg = Number((dailyKg * 0.5).toFixed(2));
      const weeklyKg = Number((dailyKg * 7).toFixed(2));
      const monthlyKg = Number((dailyKg * 30).toFixed(2));
      const stockKg = Number(Number(f.stock_kg || 0).toFixed(2));
      const bagWeight = Number(f.bag_weight_kg || 25);
      const bagsRemaining = bagWeight > 0 ? Number((stockKg / bagWeight).toFixed(1)) : 0;
      const daysRemaining = dailyKg > 0 ? Number((stockKg / dailyKg).toFixed(1)) : null;
      const isLowStock = stockKg <= Number(f.min_stock_alert_kg || 0) || (daysRemaining !== null && daysRemaining <= 5);
      const dailyCost = Number((dailyKg * Number(f.cost_per_kg || 0)).toFixed(2));
      estimatedDailyFeedCost += dailyCost;

      return {
        ...f,
        stock_kg: stockKg,
        daily_consumption_kg: dailyKg,
        morning_kg: morningKg,
        afternoon_kg: afternoonKg,
        weekly_consumption_kg: weeklyKg,
        monthly_consumption_kg: monthlyKg,
        bags_remaining: bagsRemaining,
        days_remaining: daysRemaining,
        daily_cost: dailyCost,
        is_low_stock: isLowStock,
        served_today: feedServedTodayIds.has(f.id),
        linked_groups: usage.linkedGroups
      };
    });

    const waterAnalytics = waterStations.map((w) => {
      const lastDate = new Date(w.last_changed_at);
      const elapsedHours = Math.max(0, (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60));
      const freq = Math.max(1, Number(w.frequency_hours || 24));
      const hoursUntilNext = Number((freq - elapsedHours).toFixed(1));
      const nextChangeDate = new Date(lastDate.getTime() + freq * 60 * 60 * 1000);

      let computedStatus = 'em_dia';
      if (elapsedHours >= freq) {
        computedStatus = 'atrasado';
      } else if (elapsedHours >= freq * 0.75) {
        computedStatus = 'atencao';
      }

      return {
        ...w,
        hours_since_change: Number(elapsedHours.toFixed(1)),
        hours_until_next: hoursUntilNext,
        next_change_at: nextChangeDate.toISOString(),
        computed_status: computedStatus
      };
    });

    const vitaminAnalytics = vitamins.map((v) => {
      const daysUntilDue = diffDays(v.next_due_date, todayStr);
      let computedStatus = 'programado';
      if (daysUntilDue < 0) {
        computedStatus = 'atrasado';
      } else if (daysUntilDue === 0) {
        computedStatus = 'hoje';
      } else if (daysUntilDue <= 3) {
        computedStatus = 'proximo';
      }

      return {
        ...v,
        days_until_due: daysUntilDue,
        computed_status: computedStatus
      };
    });

    const alerts = [];
    for (const f of feedAnalytics) {
      if (f.is_low_stock) {
        const msg = f.days_remaining !== null
          ? `Estoque baixo: ${f.name} dura apenas ${f.days_remaining} dias (${f.stock_kg} kg restantes)`
          : `Estoque baixo: ${f.name} (${f.stock_kg} kg restantes)`;
        alerts.push({
          id: `feed-${f.id}`,
          severity: f.days_remaining !== null && f.days_remaining <= 2 ? 'critical' : 'warning',
          category: 'racao',
          title: 'Reposição de Ração',
          message: msg,
          targetTab: 'racao'
        });
      }
    }

    for (const w of waterAnalytics) {
      if (w.computed_status === 'atrasado' || w.computed_status === 'atencao') {
        alerts.push({
          id: `water-${w.id}`,
          severity: w.computed_status === 'atrasado' ? 'critical' : 'warning',
          category: 'agua',
          title: w.computed_status === 'atrasado' ? 'Troca de Água Atrasada' : 'Troca de Água em Breve',
          message: `${w.name} (${w.location_area}) - última troca há ${w.hours_since_change}h`,
          targetTab: 'agua-vitaminas'
        });
      }
    }

    for (const v of vitaminAnalytics) {
      if (v.computed_status === 'atrasado' || v.computed_status === 'hoje') {
        alerts.push({
          id: `vit-${v.id}`,
          severity: v.computed_status === 'atrasado' ? 'critical' : 'info',
          category: 'vitamina',
          title: v.computed_status === 'atrasado' ? 'Vitamina Atrasada' : 'Vitamina Programada para Hoje',
          message: `${v.title} (${v.target_category}) — ${v.application_method}`,
          targetTab: 'agua-vitaminas'
        });
      }
    }

    const todayTasks = [];
    for (const w of waterAnalytics) {
      const doneRecently = w.hours_since_change < Math.min(4, w.frequency_hours * 0.4);
      if (w.computed_status !== 'em_dia' || doneRecently) {
        todayTasks.push({
          taskId: `water-${w.id}`,
          type: 'agua',
          refId: w.id,
          title: `Trocar água: ${w.name}`,
          subtitle: `${w.location_area} (${w.animal_category}) · a cada ${w.frequency_hours}h · última há ${w.hours_since_change}h`,
          priority: w.computed_status === 'atrasado' ? 1 : (w.computed_status === 'atencao' ? 2 : 3),
          status: w.computed_status,
          completed: w.computed_status === 'em_dia'
        });
      }
    }

    for (const v of vitaminAnalytics) {
      const appliedToday = v.last_applied_at && v.last_applied_at.startsWith(todayStr);
      if (v.computed_status === 'atrasado' || v.computed_status === 'hoje' || appliedToday) {
        todayTasks.push({
          taskId: `vit-${v.id}`,
          type: 'vitamina',
          refId: v.id,
          title: `Aplicar ${v.title}`,
          subtitle: `${v.target_category} · ${v.application_method} · ${v.dosage_instructions}`,
          priority: v.computed_status === 'atrasado' ? 1 : 2,
          status: appliedToday ? 'concluido' : v.computed_status,
          completed: Boolean(appliedToday)
        });
      }
    }

    for (const f of feedAnalytics) {
      if (f.daily_consumption_kg > 0) {
        todayTasks.push({
          taskId: `feed-${f.id}`,
          type: 'racao',
          refId: f.id,
          title: `Servir ${f.daily_consumption_kg} kg de ${f.name}`,
          subtitle: `Manhã: ${f.morning_kg} kg · Tarde: ${f.afternoon_kg} kg · Estoque: ${f.stock_kg} kg`,
          priority: 2,
          status: f.served_today ? 'concluido' : 'pendente',
          completed: f.served_today
        });
      }
    }

    todayTasks.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.priority - b.priority;
    });

    const totals = {
      totalAnimals,
      nelores: categoryBreakdown.Nelores.count,
      vacas: categoryBreakdown.Vacas.count,
      galinhas: categoryBreakdown.Galinhas.count,
      pintinhos: categoryBreakdown.Pintinhos.count,
      outros: categoryBreakdown.Outros.count,
      dailyFeedTotalKg: Number(dailyFeedTotalKg.toFixed(2)),
      morningFeedTotalKg: Number((dailyFeedTotalKg * 0.5).toFixed(2)),
      afternoonFeedTotalKg: Number((dailyFeedTotalKg * 0.5).toFixed(2)),
      weeklyFeedTotalKg: Number((dailyFeedTotalKg * 7).toFixed(2)),
      monthlyFeedTotalKg: Number((dailyFeedTotalKg * 30).toFixed(2)),
      dailyWaterTotalLiters: Number(dailyWaterTotalLiters.toFixed(1)),
      estimatedDailyFeedCost: Number(estimatedDailyFeedCost.toFixed(2)),
      pendingTasksCount: todayTasks.filter((t) => !t.completed).length,
      completedTasksToday: todayLogs.length
    };

    return {
      todayStr,
      farm,
      users,
      totals,
      categoryBreakdown,
      groups: enrichedGroups,
      movements,
      feeds: feedAnalytics,
      waterStations: waterAnalytics,
      vitamins: vitaminAnalytics,
      alerts,
      todayTasks,
      todayLogs,
      recentLogs
    };
  }

  function updateFarm(farmId, data) {
    const current = db.prepare('SELECT * FROM farms WHERE id = ?').get(farmId);
    if (!current) throw new Error('Fazenda não encontrada');
    const ownerName = data.owner_name ?? current.owner_name;
    db.prepare(`
      UPDATE farms SET name = ?, owner_name = ?, location = ?, total_area_ha = ?
      WHERE id = ?
    `).run(
      data.name ?? current.name,
      ownerName,
      data.location ?? current.location,
      Number(data.total_area_ha ?? current.total_area_ha),
      farmId
    );
    if (data.owner_name) {
      db.prepare(`UPDATE users SET name = ? WHERE farm_id = ? AND role = 'owner'`)
        .run(data.owner_name, farmId);
    }
    if (data.worker_name) {
      db.prepare(`UPDATE users SET name = ? WHERE farm_id = ? AND role = 'worker'`)
        .run(data.worker_name, farmId);
    }
    return db.prepare('SELECT * FROM farms WHERE id = ?').get(farmId);
  }

  function resetFarmData(farmId) {
    db.exec('BEGIN');
    try {
      db.prepare('DELETE FROM daily_logs WHERE farm_id = ?').run(farmId);
      db.prepare('DELETE FROM animal_movements WHERE farm_id = ?').run(farmId);
      db.prepare('DELETE FROM vitamin_schedules WHERE farm_id = ?').run(farmId);
      db.prepare('DELETE FROM water_stations WHERE farm_id = ?').run(farmId);
      db.prepare('DELETE FROM animal_groups WHERE farm_id = ?').run(farmId);
      db.prepare('DELETE FROM feeds WHERE farm_id = ?').run(farmId);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  function createAnimalGroup(farmId, data) {
    const nowIso = new Date().toISOString();
    const category = data.category || 'Outros';
    const species = data.species || inferSpecies(category);
    const qty = Math.max(0, Math.round(Number(data.quantity || 0)));
    const feedId = data.feed_id ? Number(data.feed_id) : null;

    const info = db.prepare(`
      INSERT INTO animal_groups (
        farm_id, category, species, name, location_area, quantity,
        avg_weight_kg, age_info, feed_id, feed_per_head_grams, water_per_head_liters, notes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      farmId,
      category,
      species,
      data.name || `Lote ${category}`,
      data.location_area || 'Pasto / Galinheiro',
      qty,
      Number(data.avg_weight_kg || 0),
      data.age_info || '',
      feedId,
      Number(data.feed_per_head_grams || 0),
      Number(data.water_per_head_liters || 0),
      data.notes || '',
      nowIso
    );

    if (qty > 0) {
      db.prepare(`
        INSERT INTO animal_movements (farm_id, group_id, type, quantity_change, description, created_at)
        VALUES (?, ?, 'compra', ?, ?, ?)
      `).run(farmId, info.lastInsertRowid, qty, 'Cadastro inicial do lote', nowIso);
    }

    return info.lastInsertRowid;
  }

  function updateAnimalGroup(groupId, data) {
    const current = db.prepare('SELECT * FROM animal_groups WHERE id = ?').get(groupId);
    if (!current) throw new Error('Lote de animais não encontrado');
    const nowIso = new Date().toISOString();
    const category = data.category ?? current.category;
    const species = data.species ?? inferSpecies(category);
    const feedId = data.feed_id === undefined ? current.feed_id : (data.feed_id ? Number(data.feed_id) : null);

    db.prepare(`
      UPDATE animal_groups
      SET category = ?, species = ?, name = ?, location_area = ?, quantity = ?,
          avg_weight_kg = ?, age_info = ?, feed_id = ?, feed_per_head_grams = ?,
          water_per_head_liters = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(
      category,
      species,
      data.name ?? current.name,
      data.location_area ?? current.location_area,
      Math.max(0, Math.round(Number(data.quantity ?? current.quantity))),
      Number(data.avg_weight_kg ?? current.avg_weight_kg),
      data.age_info ?? current.age_info,
      feedId,
      Number(data.feed_per_head_grams ?? current.feed_per_head_grams),
      Number(data.water_per_head_liters ?? current.water_per_head_liters),
      data.notes ?? current.notes,
      nowIso,
      groupId
    );
    return db.prepare('SELECT * FROM animal_groups WHERE id = ?').get(groupId);
  }

  function deleteAnimalGroup(groupId) {
    const res = db.prepare('DELETE FROM animal_groups WHERE id = ?').run(groupId);
    if (res.changes === 0) throw new Error('Lote de animais não encontrado');
  }

  function recordAnimalMovement(groupId, data) {
    const group = db.prepare('SELECT * FROM animal_groups WHERE id = ?').get(groupId);
    if (!group) throw new Error('Lote de animais não encontrado');

    const type = data.type || 'nascimento';
    const qty = Math.max(1, Math.round(Number(data.quantity_change || 0)));
    const nowIso = new Date().toISOString();
    const todayStr = toLocalDateStr();
    const performedBy = data.performed_by || 'Produtor';

    let nextQty = group.quantity;
    if (type === 'nascimento' || type === 'compra') {
      nextQty = group.quantity + qty;
    } else if (type === 'venda' || type === 'baixa' || type === 'evolucao') {
      if (qty > group.quantity) {
        throw new Error(`Quantidade (${qty}) maior que o total atual do lote (${group.quantity})`);
      }
      nextQty = group.quantity - qty;
    } else {
      throw new Error('Tipo de movimentação inválido');
    }

    db.exec('BEGIN');
    try {
      db.prepare('UPDATE animal_groups SET quantity = ?, updated_at = ? WHERE id = ?')
        .run(nextQty, nowIso, groupId);

      const signedChange = (type === 'venda' || type === 'baixa' || type === 'evolucao') ? -qty : qty;
      const desc = data.description || `Movimentação (${type})`;

      db.prepare(`
        INSERT INTO animal_movements (farm_id, group_id, type, quantity_change, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(group.farm_id, groupId, type, signedChange, desc, nowIso);

      if (type === 'evolucao' && data.target_group_id) {
        const targetGroup = db.prepare('SELECT * FROM animal_groups WHERE id = ?').get(Number(data.target_group_id));
        if (!targetGroup) throw new Error('Lote de destino não encontrado para evolução');
        db.prepare('UPDATE animal_groups SET quantity = ?, updated_at = ? WHERE id = ?')
          .run(targetGroup.quantity + qty, nowIso, targetGroup.id);

        db.prepare(`
          INSERT INTO animal_movements (farm_id, group_id, type, quantity_change, description, created_at)
          VALUES (?, ?, 'evolucao', ?, ?, ?)
        `).run(group.farm_id, targetGroup.id, qty, `Recebidos de ${group.name}: ${desc}`, nowIso);
      }

      db.prepare(`
        INSERT INTO daily_logs (farm_id, log_date, log_type, reference_id, title, details, performed_by, created_at)
        VALUES (?, ?, 'manejo', ?, ?, ?, ?, ?)
      `).run(
        group.farm_id,
        todayStr,
        groupId,
        `Movimentação: ${group.name} (${signedChange > 0 ? '+' : ''}${signedChange})`,
        desc,
        performedBy,
        nowIso
      );

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    return db.prepare('SELECT * FROM animal_groups WHERE id = ?').get(groupId);
  }

  function createFeed(farmId, data) {
    const nowIso = new Date().toISOString();
    const info = db.prepare(`
      INSERT INTO feeds (farm_id, name, target_category, stock_kg, min_stock_alert_kg, bag_weight_kg, cost_per_kg, notes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      farmId,
      data.name || 'Nova Ração',
      data.target_category || 'Geral',
      Math.max(0, Number(data.stock_kg || 0)),
      Math.max(0, Number(data.min_stock_alert_kg ?? 20)),
      Math.max(1, Number(data.bag_weight_kg ?? 25)),
      Math.max(0, Number(data.cost_per_kg || 0)),
      data.notes || '',
      nowIso
    );
    return info.lastInsertRowid;
  }

  function updateFeed(feedId, data) {
    const current = db.prepare('SELECT * FROM feeds WHERE id = ?').get(feedId);
    if (!current) throw new Error('Ração não encontrada');
    const nowIso = new Date().toISOString();
    db.prepare(`
      UPDATE feeds
      SET name = ?, target_category = ?, stock_kg = ?, min_stock_alert_kg = ?, bag_weight_kg = ?, cost_per_kg = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(
      data.name ?? current.name,
      data.target_category ?? current.target_category,
      Math.max(0, Number(data.stock_kg ?? current.stock_kg)),
      Math.max(0, Number(data.min_stock_alert_kg ?? current.min_stock_alert_kg)),
      Math.max(1, Number(data.bag_weight_kg ?? current.bag_weight_kg)),
      Math.max(0, Number(data.cost_per_kg ?? current.cost_per_kg)),
      data.notes ?? current.notes,
      nowIso,
      feedId
    );
    return db.prepare('SELECT * FROM feeds WHERE id = ?').get(feedId);
  }

  function deleteFeed(feedId) {
    const res = db.prepare('DELETE FROM feeds WHERE id = ?').run(feedId);
    if (res.changes === 0) throw new Error('Ração não encontrada');
  }

  function adjustFeedStock(feedId, data) {
    const feed = db.prepare('SELECT * FROM feeds WHERE id = ?').get(feedId);
    if (!feed) throw new Error('Ração não encontrada');

    const mode = data.mode || 'serve'; // 'restock' | 'serve'
    const amountKg = Math.max(0, Number(data.amount_kg || 0));
    const bags = Number(data.bags || 0);
    const totalDeltaKg = bags > 0 ? bags * Number(feed.bag_weight_kg || 25) : amountKg;

    if (totalDeltaKg <= 0) {
      throw new Error('Informe uma quantidade válida em kg ou sacos');
    }

    const nowIso = new Date().toISOString();
    const todayStr = toLocalDateStr();
    const performedBy = data.performed_by || 'Produtor';
    const nextStock = mode === 'restock'
      ? Number((feed.stock_kg + totalDeltaKg).toFixed(2))
      : Number(Math.max(0, feed.stock_kg - totalDeltaKg).toFixed(2));

    db.prepare('UPDATE feeds SET stock_kg = ?, updated_at = ? WHERE id = ?')
      .run(nextStock, nowIso, feedId);

    const logTitle = mode === 'restock'
      ? `Compra / Entrada: +${totalDeltaKg} kg de ${feed.name}`
      : `Trato servido: -${totalDeltaKg} kg de ${feed.name}`;

    db.prepare(`
      INSERT INTO daily_logs (farm_id, log_date, log_type, reference_id, title, details, performed_by, created_at)
      VALUES (?, ?, 'racao', ?, ?, ?, ?, ?)
    `).run(
      feed.farm_id,
      todayStr,
      feedId,
      logTitle,
      data.details || `Estoque atualizado para ${nextStock} kg`,
      performedBy,
      nowIso
    );

    return db.prepare('SELECT * FROM feeds WHERE id = ?').get(feedId);
  }

  function serveAllDailyFeeds(farmId, data = {}) {
    const fraction = Number(data.fraction || 1); // 1 = dia inteiro, 0.5 = 1 trato (manhã ou tarde)
    const performedBy = data.performed_by || 'Produtor';
    const summary = calculateFarmSummary(farmId);
    const served = [];

    for (const feed of summary.feeds) {
      if (feed.daily_consumption_kg > 0) {
        const amount = Number((feed.daily_consumption_kg * fraction).toFixed(2));
        if (amount > 0) {
          adjustFeedStock(feed.id, {
            mode: 'serve',
            amount_kg: amount,
            performed_by: performedBy,
            details: fraction === 0.5 ? 'Baixa automática (meio trato - Manhã/Tarde)' : 'Baixa automática do trato diário completo'
          });
          served.push({ feedId: feed.id, name: feed.name, amountKg: amount });
        }
      }
    }
    return served;
  }

  function createWaterStation(farmId, data) {
    const nowIso = new Date().toISOString();
    const info = db.prepare(`
      INSERT INTO water_stations (
        farm_id, name, location_area, animal_category, capacity_liters,
        frequency_hours, last_changed_at, last_changed_by, water_quality_note, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'em_dia')
    `).run(
      farmId,
      data.name || 'Novo Bebedouro',
      data.location_area || 'Área Rural',
      data.animal_category || 'Geral',
      Number(data.capacity_liters || 50),
      Math.max(1, Number(data.frequency_hours || 24)),
      data.last_changed_at || nowIso,
      data.last_changed_by || 'Cadastro Inicial',
      data.water_quality_note || ''
    );
    return info.lastInsertRowid;
  }

  function updateWaterStation(stationId, data) {
    const current = db.prepare('SELECT * FROM water_stations WHERE id = ?').get(stationId);
    if (!current) throw new Error('Ponto de água não encontrado');
    db.prepare(`
      UPDATE water_stations
      SET name = ?, location_area = ?, animal_category = ?, capacity_liters = ?,
          frequency_hours = ?, water_quality_note = ?
      WHERE id = ?
    `).run(
      data.name ?? current.name,
      data.location_area ?? current.location_area,
      data.animal_category ?? current.animal_category,
      Number(data.capacity_liters ?? current.capacity_liters),
      Math.max(1, Number(data.frequency_hours ?? current.frequency_hours)),
      data.water_quality_note ?? current.water_quality_note,
      stationId
    );
    return db.prepare('SELECT * FROM water_stations WHERE id = ?').get(stationId);
  }

  function deleteWaterStation(stationId) {
    const res = db.prepare('DELETE FROM water_stations WHERE id = ?').run(stationId);
    if (res.changes === 0) throw new Error('Ponto de água não encontrado');
  }

  function changeWaterStation(stationId, data = {}) {
    const station = db.prepare('SELECT * FROM water_stations WHERE id = ?').get(stationId);
    if (!station) throw new Error('Ponto de água não encontrado');
    const nowIso = new Date().toISOString();
    const todayStr = toLocalDateStr();
    const performedBy = data.performed_by || 'Produtor';
    const note = data.water_quality_note !== undefined ? data.water_quality_note : 'Água limpa e bebedouro higienizado';

    db.prepare(`
      UPDATE water_stations
      SET last_changed_at = ?, last_changed_by = ?, water_quality_note = ?, status = 'em_dia'
      WHERE id = ?
    `).run(nowIso, performedBy, note, stationId);

    db.prepare(`
      INSERT INTO daily_logs (farm_id, log_date, log_type, reference_id, title, details, performed_by, created_at)
      VALUES (?, ?, 'agua', ?, ?, ?, ?, ?)
    `).run(
      station.farm_id,
      todayStr,
      stationId,
      `Água trocada: ${station.name}`,
      `${station.location_area} (${station.animal_category}) - ${note}`,
      performedBy,
      nowIso
    );

    return db.prepare('SELECT * FROM water_stations WHERE id = ?').get(stationId);
  }

  function createVitaminSchedule(farmId, data) {
    const todayStr = toLocalDateStr();
    const info = db.prepare(`
      INSERT INTO vitamin_schedules (
        farm_id, title, product_name, target_group_id, target_category,
        application_method, dosage_instructions, frequency_days, next_due_date,
        stock_doses, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      farmId,
      data.title || 'Nova Vitamina / Suplemento',
      data.product_name || 'Suplemento Agro',
      data.target_group_id ? Number(data.target_group_id) : null,
      data.target_category || 'Geral',
      data.application_method || 'Na Água',
      data.dosage_instructions || 'Conforme orientação técnica',
      Math.max(1, Number(data.frequency_days || 7)),
      data.next_due_date || todayStr,
      Math.max(0, Number(data.stock_doses || 0)),
      data.notes || ''
    );
    return info.lastInsertRowid;
  }

  function updateVitaminSchedule(vitId, data) {
    const current = db.prepare('SELECT * FROM vitamin_schedules WHERE id = ?').get(vitId);
    if (!current) throw new Error('Protocolo de vitamina não encontrado');
    db.prepare(`
      UPDATE vitamin_schedules
      SET title = ?, product_name = ?, target_group_id = ?, target_category = ?,
          application_method = ?, dosage_instructions = ?, frequency_days = ?,
          next_due_date = ?, stock_doses = ?, notes = ?
      WHERE id = ?
    `).run(
      data.title ?? current.title,
      data.product_name ?? current.product_name,
      data.target_group_id === undefined ? current.target_group_id : (data.target_group_id ? Number(data.target_group_id) : null),
      data.target_category ?? current.target_category,
      data.application_method ?? current.application_method,
      data.dosage_instructions ?? current.dosage_instructions,
      Math.max(1, Number(data.frequency_days ?? current.frequency_days)),
      data.next_due_date ?? current.next_due_date,
      Math.max(0, Number(data.stock_doses ?? current.stock_doses)),
      data.notes ?? current.notes,
      vitId
    );
    return db.prepare('SELECT * FROM vitamin_schedules WHERE id = ?').get(vitId);
  }

  function deleteVitaminSchedule(vitId) {
    const res = db.prepare('DELETE FROM vitamin_schedules WHERE id = ?').run(vitId);
    if (res.changes === 0) throw new Error('Protocolo de vitamina não encontrado');
  }

  function applyVitaminSchedule(vitId, data = {}) {
    const vit = db.prepare('SELECT * FROM vitamin_schedules WHERE id = ?').get(vitId);
    if (!vit) throw new Error('Protocolo de vitamina não encontrado');

    const nowIso = new Date().toISOString();
    const todayStr = toLocalDateStr();
    const performedBy = data.performed_by || 'Produtor';
    const nextDue = addDaysToDateStr(todayStr, vit.frequency_days);
    const nextStockDoses = Math.max(0, Number(vit.stock_doses || 0) - 1);

    db.prepare(`
      UPDATE vitamin_schedules
      SET last_applied_at = ?, last_applied_by = ?, next_due_date = ?, stock_doses = ?
      WHERE id = ?
    `).run(nowIso, performedBy, nextDue, nextStockDoses, vitId);

    db.prepare(`
      INSERT INTO daily_logs (farm_id, log_date, log_type, reference_id, title, details, performed_by, created_at)
      VALUES (?, ?, 'vitamina', ?, ?, ?, ?, ?)
    `).run(
      vit.farm_id,
      todayStr,
      vitId,
      `Vitamina aplicada: ${vit.title}`,
      `${vit.product_name} (${vit.target_category} · ${vit.application_method}) — próxima em ${nextDue}`,
      performedBy,
      nowIso
    );

    return db.prepare('SELECT * FROM vitamin_schedules WHERE id = ?').get(vitId);
  }

  function processSyncBatch(farmId, actions = []) {
    const results = [];
    for (const action of actions) {
      try {
        if (action.type === 'water_change') {
          changeWaterStation(Number(action.id), action.payload || {});
          results.push({ clientId: action.clientId, ok: true });
        } else if (action.type === 'vitamin_apply') {
          applyVitaminSchedule(Number(action.id), action.payload || {});
          results.push({ clientId: action.clientId, ok: true });
        } else if (action.type === 'feed_adjust') {
          adjustFeedStock(Number(action.id), action.payload || {});
          results.push({ clientId: action.clientId, ok: true });
        } else if (action.type === 'animal_movement') {
          recordAnimalMovement(Number(action.id), action.payload || {});
          results.push({ clientId: action.clientId, ok: true });
        } else {
          results.push({ clientId: action.clientId, ok: false, error: 'Ação desconhecida' });
        }
      } catch (err) {
        results.push({ clientId: action.clientId, ok: false, error: err.message });
      }
    }
    return results;
  }

  return {
    db,
    getActiveFarmId,
    calculateFarmSummary,
    updateFarm,
    resetFarmData,
    createAnimalGroup,
    updateAnimalGroup,
    deleteAnimalGroup,
    recordAnimalMovement,
    createFeed,
    updateFeed,
    deleteFeed,
    adjustFeedStock,
    serveAllDailyFeeds,
    createWaterStation,
    updateWaterStation,
    deleteWaterStation,
    changeWaterStation,
    createVitaminSchedule,
    updateVitaminSchedule,
    deleteVitaminSchedule,
    applyVitaminSchedule,
    processSyncBatch
  };
}

function seedInitialData(db) {
  const countRow = db.prepare('SELECT COUNT(*) AS total FROM farms').get();
  if (countRow && countRow.total > 0) return;

  const nowIso = new Date().toISOString();

  db.exec('BEGIN');
  try {
    const farmRes = db.prepare(`
      INSERT INTO farms (name, owner_name, location, total_area_ha, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('Minha Fazenda / Rancho', 'Fazendeiro', '', 0, nowIso);
    const farmId = farmRes.lastInsertRowid;

    db.prepare('INSERT INTO users (farm_id, name, role, pin) VALUES (?, ?, ?, ?)')
      .run(farmId, 'Fazendeiro', 'owner', '1234');
    db.prepare('INSERT INTO users (farm_id, name, role, pin) VALUES (?, ?, ?, ?)')
      .run(farmId, 'Funcionário (Campo)', 'worker', '0000');

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = {
  createDatabase,
  toLocalDateStr
};
