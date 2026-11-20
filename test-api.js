const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createAppServer } = require('./server');

async function runTests() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agrorancho-test-'));
  const testDbPath = path.join(tempDir, 'test-fazenda.db');
  const { server } = createAppServer({ dbPath: testDbPath, port: 0 });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const api = async (endpoint, options = {}) => {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const json = await res.json();
    return { status: res.status, json };
  };

  try {
    console.log('1. Verificando que o sistema inicia 100% zerado para o fazendeiro cadastrar...');
    const boot = await api('/api/bootstrap');
    assert.equal(boot.status, 200);
    assert.equal(boot.json.ok, true);
    assert.equal(boot.json.totals.totalAnimals, 0);
    assert.equal(boot.json.totals.nelores, 0);
    assert.equal(boot.json.totals.vacas, 0);
    assert.equal(boot.json.totals.galinhas, 0);
    assert.equal(boot.json.totals.pintinhos, 0);
    assert.equal(boot.json.totals.dailyFeedTotalKg, 0);
    assert.equal(boot.json.groups.length, 0);
    assert.equal(boot.json.feeds.length, 0);
    assert.equal(boot.json.waterStations.length, 0);
    assert.equal(boot.json.vitamins.length, 0);

    console.log('2. Fazendeiro cadastra rações do zero...');
    const feedNeloreRes = await api('/api/feeds', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Ração Engorda Nelore',
        target_category: 'Nelores',
        stock_kg: 300,
        min_stock_alert_kg: 60,
        bag_weight_kg: 30,
        cost_per_kg: 2.2
      })
    });
    assert.equal(feedNeloreRes.status, 201);

    const feedPintinhoRes = await api('/api/feeds', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Ração Inicial Pintinhos',
        target_category: 'Pintinhos',
        stock_kg: 50,
        min_stock_alert_kg: 15,
        bag_weight_kg: 25,
        cost_per_kg: 3.5
      })
    });
    assert.equal(feedPintinhoRes.status, 201);

    console.log('3. Fazendeiro cadastra lotes de Nelores, Vacas, Galinhas e Pintinhos...');
    await api('/api/animals', {
      method: 'POST',
      body: JSON.stringify({
        category: 'Nelores',
        name: 'Nelores Pasto 01',
        location_area: 'Pasto 01',
        quantity: 20,
        feed_id: feedNeloreRes.json.id,
        feed_per_head_grams: 2000,
        water_per_head_liters: 45
      })
    });
    await api('/api/animals', {
      method: 'POST',
      body: JSON.stringify({
        category: 'Vacas',
        name: 'Vacas Leiteiras',
        location_area: 'Curral',
        quantity: 10,
        feed_per_head_grams: 2500,
        water_per_head_liters: 60
      })
    });
    const galRes = await api('/api/animals', {
      method: 'POST',
      body: JSON.stringify({
        category: 'Galinhas',
        name: 'Galinhas Poedeiras',
        location_area: 'Galinheiro',
        quantity: 50,
        feed_per_head_grams: 120,
        water_per_head_liters: 0.3
      })
    });
    const pinRes = await api('/api/animals', {
      method: 'POST',
      body: JSON.stringify({
        category: 'Pintinhos',
        name: 'Pintinhos Berçário',
        location_area: 'Berçário',
        quantity: 40,
        feed_id: feedPintinhoRes.json.id,
        feed_per_head_grams: 40,
        water_per_head_liters: 0.1
      })
    });

    assert.equal(pinRes.json.data.totals.nelores, 20);
    assert.equal(pinRes.json.data.totals.vacas, 10);
    assert.equal(pinRes.json.data.totals.galinhas, 50);
    assert.equal(pinRes.json.data.totals.pintinhos, 40);
    assert.equal(pinRes.json.data.totals.totalAnimals, 120);
    // 20*2kg + 10*2.5kg + 50*0.12kg + 40*0.04kg = 40 + 25 + 6 + 1.6 = 72.6 kg/dia
    assert.equal(pinRes.json.data.totals.dailyFeedTotalKg, 72.6);

    console.log('4. Testando evolução de Pintinhos para Galinhas...');
    const evolveRes = await api(`/api/animals/${pinRes.json.id}/movement`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'evolucao',
        quantity_change: 10,
        target_group_id: galRes.json.id,
        description: 'Cresceram',
        performed_by: 'Fazendeiro'
      })
    });
    assert.equal(evolveRes.status, 200);
    assert.equal(evolveRes.json.data.totals.pintinhos, 30);
    assert.equal(evolveRes.json.data.totals.galinhas, 60);

    console.log('5. Fazendeiro cadastra bebedouro e vitamina e registra uso...');
    const waterCreate = await api('/api/water', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Bebedouro Galinheiro',
        location_area: 'Galinheiro',
        animal_category: 'Galinhas',
        capacity_liters: 40,
        frequency_hours: 24
      })
    });
    assert.equal(waterCreate.status, 201);

    const waterChange = await api(`/api/water/${waterCreate.json.id}/change`, {
      method: 'POST',
      body: JSON.stringify({ performed_by: 'Fazendeiro' })
    });
    assert.equal(waterChange.status, 200);
    assert.equal(waterChange.json.data.waterStations[0].computed_status, 'em_dia');

    const vitCreate = await api('/api/vitamins', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Vitamina A-D-E',
        product_name: 'VitaGold',
        target_category: 'Pintinhos',
        application_method: 'Na Água',
        dosage_instructions: '2 ml por litro',
        frequency_days: 7,
        stock_doses: 10
      })
    });
    assert.equal(vitCreate.status, 201);

    const vitApply = await api(`/api/vitamins/${vitCreate.json.id}/apply`, {
      method: 'POST',
      body: JSON.stringify({ performed_by: 'Fazendeiro' })
    });
    assert.equal(vitApply.status, 200);
    assert.equal(vitApply.json.data.vitamins[0].stock_doses, 9);

    console.log('6. Testando sincronização offline em lote e reset geral (/api/reset)...');
    const syncRes = await api('/api/sync-batch', {
      method: 'POST',
      body: JSON.stringify({
        actions: [
          {
            clientId: 'off-1',
            type: 'water_change',
            id: waterCreate.json.id,
            payload: { performed_by: 'iPhone Offline' }
          }
        ]
      })
    });
    assert.equal(syncRes.status, 200);
    assert.equal(syncRes.json.results[0].ok, true);

    const resetRes = await api('/api/reset', { method: 'POST', body: JSON.stringify({}) });
    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.json.data.totals.totalAnimals, 0);
    assert.equal(resetRes.json.data.groups.length, 0);
    assert.equal(resetRes.json.data.feeds.length, 0);
    assert.equal(resetRes.json.data.waterStations.length, 0);
    assert.equal(resetRes.json.data.vitamins.length, 0);

    console.log('\nTodos os 6 cenários de teste (sistema vazio -> cadastro do zero -> manejo -> reset) passaram!');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup error on windows
    }
  }
}

runTests().catch((err) => {
  console.error('FALHA NO TESTE:', err);
  process.exit(1);
});
