#!/usr/bin/env node
/**
 * csvlens-pro — Browser-based CSV explorer and visualizer
 * Usage: node src/csvlens.js <command> <file> [options]
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

function parseCSV(content) {
  const lines = content.trim().split('\n');
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue; }
      current += char;
    }
    values.push(current.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] !== undefined ? values[i] : ''; });
    return row;
  });
  return { headers, rows };
}

function statsCommand(filePath) {
  if (!fs.existsSync(filePath)) { console.error(`❌ File not found: ${filePath}`); process.exit(1); }
  const content = fs.readFileSync(filePath, 'utf8');
  const { headers, rows } = parseCSV(content);
  
  console.log(`\n📊 CSV Stats — ${path.basename(filePath)}`);
  console.log(`${'─'.repeat(50)}`);
  console.log(`Rows: ${rows.length} | Columns: ${headers.length}`);
  console.log('');
  
  headers.forEach(col => {
    const values = rows.map(r => r[col]).filter(v => v !== '');
    const nums = values.map(Number).filter(v => !isNaN(v));
    const unique = new Set(values).size;
    
    console.log(`  📌 ${col}`);
    console.log(`     Non-empty: ${values.length} | Unique: ${unique}`);
    if (nums.length > 0) {
      const min = Math.min(...nums).toFixed(2);
      const max = Math.max(...nums).toFixed(2);
      const avg = (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
      console.log(`     Min: ${min} | Max: ${max} | Avg: ${avg} (${nums.length} numeric)`);
    }
  });
}

function filterCommand(filePath, col, val, outPath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const { headers, rows } = parseCSV(content);
  const filtered = rows.filter(r => String(r[col] || '').toLowerCase().includes(val.toLowerCase()));
  const csv = [headers.join(','), ...filtered.map(r => headers.map(h => r[h]).join(','))].join('\n');
  const out = outPath || filePath.replace('.csv', '-filtered.csv');
  fs.writeFileSync(out, csv);
  console.log(`✅ Filtered ${filtered.length}/${rows.length} rows → ${out}`);
}

function serveCommand(filePath, port = 3000) {
  if (!fs.existsSync(filePath)) { console.error(`❌ File not found: ${filePath}`); process.exit(1); }
  const content = fs.readFileSync(filePath, 'utf8');
  const { headers, rows } = parseCSV(content);
  const data = JSON.stringify({ headers, rows });
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>csvlens-pro — ${path.basename(filePath)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0f1117; color: #e2e8f0; min-height: 100vh; }
  header { background: #1a1d2e; border-bottom: 1px solid #2d3748; padding: 16px 24px; display: flex; align-items: center; gap: 16px; }
  header h1 { font-size: 1.25rem; font-weight: 700; color: #63b3ed; }
  header .meta { font-size: 0.8rem; color: #718096; }
  .controls { padding: 16px 24px; background: #141622; border-bottom: 1px solid #2d3748; display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
  input { background: #2d3748; border: 1px solid #4a5568; color: #e2e8f0; padding: 8px 12px; border-radius: 6px; font-size: 0.875rem; width: 280px; }
  input:focus { outline: none; border-color: #63b3ed; }
  select { background: #2d3748; border: 1px solid #4a5568; color: #e2e8f0; padding: 8px 12px; border-radius: 6px; font-size: 0.875rem; }
  button { background: #3182ce; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 600; }
  button:hover { background: #2b6cb0; }
  .stats-bar { padding: 8px 24px; background: #1a1d2e; font-size: 0.8rem; color: #718096; }
  .table-wrap { overflow: auto; padding: 0 24px 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 16px; }
  th { background: #1a1d2e; padding: 10px 12px; text-align: left; font-weight: 600; color: #63b3ed; border-bottom: 2px solid #2d3748; cursor: pointer; white-space: nowrap; user-select: none; }
  th:hover { background: #2d3748; }
  td { padding: 8px 12px; border-bottom: 1px solid #1a1d2e; color: #cbd5e0; }
  tr:hover td { background: #1a1d2e; }
  .sort-arrow { margin-left: 4px; opacity: 0.5; }
  .sort-arrow.active { opacity: 1; color: #f6ad55; }
</style>
</head>
<body>
<header>
  <h1>📊 csvlens-pro</h1>
  <span class="meta" id="filename">${path.basename(filePath)}</span>
</header>
<div class="controls">
  <input type="text" id="search" placeholder="🔍 Search all columns...">
  <select id="filterCol"><option value="">Filter column...</option></select>
  <input type="text" id="filterVal" placeholder="Filter value..." style="width:180px">
  <button onclick="exportFiltered()">💾 Export CSV</button>
  <button onclick="resetFilters()">🔄 Reset</button>
</div>
<div class="stats-bar" id="statsBar"></div>
<div class="table-wrap">
  <table id="dataTable"><thead id="tableHead"></thead><tbody id="tableBody"></tbody></table>
</div>
<script>
const RAW = ${data};
let sortCol = null, sortDir = 1, filtered = [...RAW.rows];

function init() {
  const sel = document.getElementById('filterCol');
  RAW.headers.forEach(h => { const o = document.createElement('option'); o.value = h; o.textContent = h; sel.appendChild(o); });
  buildHead();
  render();
}

function buildHead() {
  const tr = document.createElement('tr');
  RAW.headers.forEach(h => {
    const th = document.createElement('th');
    th.innerHTML = h + '<span class="sort-arrow" id="arr-'+h+'">▲</span>';
    th.onclick = () => sort(h);
    tr.appendChild(th);
  });
  document.getElementById('tableHead').appendChild(tr);
}

function sort(col) {
  if (sortCol === col) sortDir *= -1; else { sortCol = col; sortDir = 1; }
  document.querySelectorAll('.sort-arrow').forEach(el => el.classList.remove('active'));
  const arr = document.getElementById('arr-'+col);
  if (arr) { arr.textContent = sortDir > 0 ? '▲' : '▼'; arr.classList.add('active'); }
  filtered.sort((a, b) => {
    const av = isNaN(Number(a[col])) ? a[col] : Number(a[col]);
    const bv = isNaN(Number(b[col])) ? b[col] : Number(b[col]);
    return av < bv ? -sortDir : av > bv ? sortDir : 0;
  });
  renderBody();
}

function filter() {
  const search = document.getElementById('search').value.toLowerCase();
  const fcol = document.getElementById('filterCol').value;
  const fval = document.getElementById('filterVal').value.toLowerCase();
  filtered = RAW.rows.filter(row => {
    const matchSearch = !search || Object.values(row).some(v => String(v).toLowerCase().includes(search));
    const matchFilter = !fcol || !fval || String(row[fcol]||'').toLowerCase().includes(fval);
    return matchSearch && matchFilter;
  });
  if (sortCol) sort(sortCol);
  else renderBody();
}

function render() { renderBody(); updateStats(); }

function renderBody() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';
  const slice = filtered.slice(0, 500);
  slice.forEach(row => {
    const tr = document.createElement('tr');
    RAW.headers.forEach(h => { const td = document.createElement('td'); td.textContent = row[h] || ''; tr.appendChild(td); });
    tbody.appendChild(tr);
  });
  updateStats();
}

function updateStats() {
  document.getElementById('statsBar').textContent =
    'Showing ' + Math.min(filtered.length, 500) + ' of ' + filtered.length + ' rows (total: ' + RAW.rows.length + ') | ' + RAW.headers.length + ' columns';
}

function exportFiltered() {
  const csv = [RAW.headers.join(','), ...filtered.map(r => RAW.headers.map(h => JSON.stringify(r[h]||'')).join(','))].join('\\n');
  const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = 'filtered.csv'; a.click();
}

function resetFilters() {
  document.getElementById('search').value = '';
  document.getElementById('filterVal').value = '';
  filtered = [...RAW.rows];
  renderBody();
}

document.getElementById('search').addEventListener('input', filter);
document.getElementById('filterCol').addEventListener('change', filter);
document.getElementById('filterVal').addEventListener('input', filter);
init();
</script>
</body>
</html>`;

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  });
  server.listen(port, () => {
    console.log(`\n🌐 csvlens-pro running at http://localhost:${port}`);
    console.log(`📂 Exploring: ${path.resolve(filePath)}`);
    console.log(`   ${rows.length} rows | ${headers.length} columns`);
    console.log('\nPress Ctrl+C to stop.\n');
  });
}

const [,, cmd, file, ...args] = process.argv;
if (!cmd || cmd === 'help') {
  console.log('csvlens-pro — CSV Explorer & Visualizer\n');
  console.log('Commands:');
  console.log('  explore <file>                      Open browser UI');
  console.log('  serve <file> [--port N]             Serve browser UI');
  console.log('  stats <file>                        Show column statistics');
  console.log('  filter <file> --col C --val V       Filter and export');
  process.exit(0);
}

if (cmd === 'stats') { statsCommand(file); }
else if (cmd === 'explore' || cmd === 'serve') {
  const portArg = args.indexOf('--port');
  const port = portArg !== -1 ? parseInt(args[portArg + 1]) : 3000;
  serveCommand(file, port);
}
else if (cmd === 'filter') {
  const colIdx = args.indexOf('--col');
  const valIdx = args.indexOf('--val');
  const outIdx = args.indexOf('--out');
  const col = colIdx !== -1 ? args[colIdx + 1] : null;
  const val = valIdx !== -1 ? args[valIdx + 1] : null;
  const out = outIdx !== -1 ? args[outIdx + 1] : null;
  if (!col || !val) { console.error('Usage: filter <file> --col <column> --val <value>'); process.exit(1); }
  filterCommand(file, col, val, out);
}
else { console.error(`Unknown command: ${cmd}`); process.exit(1); }
