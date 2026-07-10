// ---------------------------------------------------------------
// SAMPLE DATA — replace with a real NAV feed before publishing.
// Each fund: 12 monthly NAV points (per unit, in RM).
// ---------------------------------------------------------------
const months = ['Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul'];

const fundData = [
  {
    code: 'ASM',
    name: 'Amanah Saham Malaysia',
    manager: 'PNB',
    color: '#C9A227',
    nav: [1.0000,1.0012,1.0025,1.0018,1.0031,1.0040,1.0052,1.0048,1.0061,1.0075,1.0082,1.0090]
  },
  {
    code: 'ASB',
    name: 'Amanah Saham Bumiputera',
    manager: 'PNB',
    color: '#E8C765',
    nav: [1.0000,1.0009,1.0016,1.0021,1.0028,1.0033,1.0039,1.0044,1.0051,1.0058,1.0063,1.0070]
  },
  {
    code: 'PBGROWTH',
    name: 'Public Growth Fund',
    manager: 'Public Mutual',
    color: '#4C9F70',
    nav: [0.8200,0.8305,0.8190,0.8410,0.8520,0.8380,0.8600,0.8710,0.8590,0.8750,0.8830,0.8920]
  },
  {
    code: 'MAYB-EQ',
    name: 'Maybank Equity Trust',
    manager: 'Maybank AM',
    color: '#6FA8DC',
    nav: [0.6100,0.6180,0.6050,0.6220,0.6290,0.6170,0.6350,0.6410,0.6280,0.6440,0.6520,0.6600]
  },
  {
    code: 'CIMB-DIV',
    name: 'CIMB Principal Dividend',
    manager: 'CIMB Principal',
    color: '#C15B4A',
    nav: [0.4500,0.4460,0.4520,0.4480,0.4550,0.4610,0.4570,0.4630,0.4690,0.4650,0.4710,0.4770]
  },
  {
    code: 'RHB-GR',
    name: 'RHB Growth Fund',
    manager: 'RHB Asset Mgmt',
    color: '#9B7FD4',
    nav: [0.7200,0.7150,0.7280,0.7340,0.7260,0.7410,0.7470,0.7390,0.7520,0.7580,0.7500,0.7640]
  }
];

// ---------------------------------------------------------------
// Ticker board
// ---------------------------------------------------------------
function pctChange(nav){
  const first = nav[nav.length-2], last = nav[nav.length-1];
  return ((last-first)/first*100);
}

function renderTicker(){
  const track = document.getElementById('tickerTrack');
  const items = [...fundData, ...fundData]; // loop content twice for seamless scroll
  track.innerHTML = items.map(f => {
    const chg = pctChange(f.nav);
    const dir = chg >= 0 ? 'up' : 'down';
    const sign = chg >= 0 ? '+' : '';
    return `<span class="ticker-item">
      <span class="code">${f.code}</span>
      <span class="nav">RM ${f.nav[f.nav.length-1].toFixed(4)}</span>
      <span class="chg ${dir}">${sign}${chg.toFixed(2)}%</span>
    </span>`;
  }).join('');
}

// ---------------------------------------------------------------
// Fund cards with sparklines
// ---------------------------------------------------------------
function renderFundCards(){
  const grid = document.getElementById('fundGrid');
  grid.innerHTML = fundData.map(f => `
    <div class="fund-card">
      <div class="fund-card-top">
        <div>
          <div class="fund-name">${f.name}</div>
          <div class="fund-manager">${f.manager}</div>
        </div>
        <span class="fund-code">${f.code}</span>
      </div>
      <div class="fund-nav-row">
        <span class="fund-nav">RM ${f.nav[f.nav.length-1].toFixed(4)}</span>
        <span class="fund-chg ${pctChange(f.nav)>=0?'up':'down'}">
          ${pctChange(f.nav)>=0?'+':''}${pctChange(f.nav).toFixed(2)}%
        </span>
      </div>
      <canvas class="spark" id="spark-${f.code}"></canvas>
    </div>
  `).join('');

  fundData.forEach(f => {
    const ctx = document.getElementById(`spark-${f.code}`);
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          data: f.nav,
          borderColor: f.color,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.35,
          fill: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display:false }, tooltip: { enabled:false } },
        scales: { x: { display:false }, y: { display:false } },
        elements: { line: { borderJoinStyle:'round' } }
      }
    });
  });
}

// ---------------------------------------------------------------
// Compare chart with toggles
// ---------------------------------------------------------------
let compareChart;
const activeFunds = new Set(fundData.map(f => f.code));

function renderToggles(){
  const wrap = document.getElementById('compareToggles');
  wrap.innerHTML = fundData.map(f => `
    <div class="toggle-pill" data-code="${f.code}">
      <span class="swatch" style="background:${f.color}"></span>
      <span>${f.code}</span>
    </div>
  `).join('');

  wrap.querySelectorAll('.toggle-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const code = pill.dataset.code;
      if (activeFunds.has(code)) {
        activeFunds.delete(code);
        pill.classList.add('off');
      } else {
        activeFunds.add(code);
        pill.classList.remove('off');
      }
      updateCompareChart();
    });
  });
}

function updateCompareChart(){
  compareChart.data.datasets = fundData
    .filter(f => activeFunds.has(f.code))
    .map(f => ({
      label: f.code,
      data: f.nav,
      borderColor: f.color,
      backgroundColor: f.color,
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.3
    }));
  compareChart.update();
}

function renderCompareChart(){
  const ctx = document.getElementById('compareChart');
  compareChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: fundData.map(f => ({
        label: f.code,
        data: f.nav,
        borderColor: f.color,
        backgroundColor: f.color,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3
      }))
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color:'#AAB6C2', font:{ family:'IBM Plex Mono', size:11 } } }
      },
      scales: {
        x: { ticks:{ color:'#AAB6C2' }, grid:{ color:'rgba(243,239,232,0.06)' } },
        y: { ticks:{ color:'#AAB6C2' }, grid:{ color:'rgba(243,239,232,0.06)' } }
      }
    }
  });
}

renderTicker();
renderFundCards();
renderToggles();
renderCompareChart();
