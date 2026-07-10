// ---------------------------------------------------------------
// Reads real NAV data from data/funds.json (populated by manual
// entry and/or the permitted-source scraper). Charts only render
// once a fund has enough data points; otherwise a friendly
// "collecting data" state shows instead.
// ---------------------------------------------------------------

const MIN_POINTS_FOR_CHART = 3;

async function loadData() {
  const res = await fetch('data/funds.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Could not load funds.json (${res.status})`);
  return res.json();
}

function pctChange(history) {
  if (history.length < 2) return null;
  const prev = history[history.length - 2].nav;
  const last = history[history.length - 1].nav;
  return ((last - prev) / prev) * 100;
}

function fmtPct(p) {
  if (p === null) return '—';
  return `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`;
}

// ---- Ticker ----
function renderTicker(funds) {
  const track = document.getElementById('tickerTrack');
  const priced = funds.filter(f => f.history.length || f.fixedPrice);
  if (!priced.length) { track.innerHTML = ''; return; }
  const items = [...priced, ...priced];
  track.innerHTML = items.map(f => {
    const nav = f.fixedPrice ?? (f.history.length ? f.history[f.history.length - 1].nav : null);
    const chg = pctChange(f.history);
    const dir = chg === null ? '' : (chg >= 0 ? 'up' : 'down');
    return `<span class="ticker-item">
      <span class="code">${f.code}</span>
      <span class="nav">RM ${nav !== null ? nav.toFixed(4) : '—'}</span>
      <span class="chg ${dir}">${fmtPct(chg)}</span>
    </span>`;
  }).join('');
}

// ---- Fund cards ----
function renderFundCards(funds) {
  const grid = document.getElementById('fundGrid');
  grid.innerHTML = funds.map(f => {
    const isFixed = f.type === 'fixed';
    const nav = f.fixedPrice ?? (f.history.length ? f.history[f.history.length - 1].nav : null);
    const chg = pctChange(f.history);
    const enough = f.history.length >= MIN_POINTS_FOR_CHART;

    let visual;
    if (isFixed) {
      visual = `<div class="fixed-note">Fixed price · tracks annual distribution</div>`;
    } else if (enough) {
      visual = `<canvas class="spark" id="spark-${f.code}"></canvas>`;
    } else {
      const need = MIN_POINTS_FOR_CHART - f.history.length;
      visual = `<div class="collecting">Collecting data — ${need} more point${need === 1 ? '' : 's'} until chart</div>`;
    }

    return `
      <div class="fund-card">
        <div class="fund-card-top">
          <div>
            <div class="fund-name">${f.name}</div>
            <div class="fund-manager">${f.manager}</div>
          </div>
          <span class="fund-code">${f.code}</span>
        </div>
        <div class="fund-nav-row">
          <span class="fund-nav">RM ${nav !== null ? nav.toFixed(4) : '—'}</span>
          <span class="fund-chg ${chg === null ? '' : (chg >= 0 ? 'up' : 'down')}">${fmtPct(chg)}</span>
        </div>
        ${visual}
      </div>`;
  }).join('');

  funds.filter(f => f.type !== 'fixed' && f.history.length >= MIN_POINTS_FOR_CHART).forEach(f => {
    const ctx = document.getElementById(`spark-${f.code}`);
    if (!ctx) return;
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: f.history.map(h => h.date),
        datasets: [{
          data: f.history.map(h => h.nav),
          borderColor: f.color, borderWidth: 2, pointRadius: 0, tension: 0.35, fill: false
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } }
      }
    });
  });
}

// ---- Compare chart ----
let compareChart;
function renderCompare(funds) {
  const chartable = funds.filter(f => f.type !== 'fixed' && f.history.length >= MIN_POINTS_FOR_CHART);
  const panel = document.getElementById('comparePanel');
  const emptyMsg = document.getElementById('compareEmpty');

  if (!chartable.length) {
    if (panel) panel.style.display = 'none';
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }
  if (panel) panel.style.display = 'grid';
  if (emptyMsg) emptyMsg.style.display = 'none';

  const active = new Set(chartable.map(f => f.code));
  const allDates = [...new Set(chartable.flatMap(f => f.history.map(h => h.date)))].sort();

  const toggles = document.getElementById('compareToggles');
  toggles.innerHTML = chartable.map(f => `
    <div class="toggle-pill" data-code="${f.code}">
      <span class="swatch" style="background:${f.color}"></span>
      <span>${f.code}</span>
    </div>`).join('');

  function datasets() {
    return chartable.filter(f => active.has(f.code)).map(f => {
      const byDate = Object.fromEntries(f.history.map(h => [h.date, h.nav]));
      return {
        label: f.code,
        data: allDates.map(d => byDate[d] ?? null),
        borderColor: f.color, backgroundColor: f.color,
        borderWidth: 2, pointRadius: 0, tension: 0.3, spanGaps: true
      };
    });
  }

  const ctx = document.getElementById('compareChart');
  compareChart = new Chart(ctx, {
    type: 'line',
    data: { labels: allDates, datasets: datasets() },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#AAB6C2', font: { family: 'IBM Plex Mono', size: 11 } } } },
      scales: {
        x: { ticks: { color: '#AAB6C2', maxTicksLimit: 8 }, grid: { color: 'rgba(243,239,232,0.06)' } },
        y: { ticks: { color: '#AAB6C2' }, grid: { color: 'rgba(243,239,232,0.06)' } }
      }
    }
  });

  toggles.querySelectorAll('.toggle-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const code = pill.dataset.code;
      if (active.has(code)) { active.delete(code); pill.classList.add('off'); }
      else { active.add(code); pill.classList.remove('off'); }
      compareChart.data.datasets = datasets();
      compareChart.update();
    });
  });
}

(async function init() {
  try {
    const data = await loadData();
    const funds = data.funds;
    renderTicker(funds);
    renderFundCards(funds);
    renderCompare(funds);
    const stamp = document.getElementById('updatedStamp');
    if (stamp && data.updated) stamp.textContent = `Data last updated: ${data.updated}`;
  } catch (e) {
    console.error(e);
    const grid = document.getElementById('fundGrid');
    if (grid) grid.innerHTML = `<div class="collecting">Couldn't load fund data. Check that data/funds.json exists.</div>`;
  }
})();
