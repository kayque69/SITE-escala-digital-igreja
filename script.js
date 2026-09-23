const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const DOW = ['dom','seg','ter','qua','qui','sex','sáb'];
const KEY = 'iasdRC_escala_v2';

const DAYTYPES = {
  domingo:      { label:'Domingo',                 roles:[ ['sermao','Sermão'], ['musica','Música'], ['som','Som'], ['diaconos','Diáconos'], ['recepcao','Recepção'] ] },
  quarta:       { label:'Quarta-feira',             roles:[ ['sermao','Sermão'], ['musica','Música'], ['som','Som'], ['diaconos','Diáconos'], ['recepcao','Recepção'] ] },
  sabadoEscola: { label:'Sábado — Escola Sabatina',  roles:[ ['direcao','Direção'], ['musica','Música'], ['som','Som'], ['live','Live'], ['adoracaoInfantil','Adoração Infantil'] ] },
  sabadoCulto:  { label:'Sábado — Culto Divino',     roles:[ ['sermao','Sermão'], ['musica','Música'], ['som','Som'], ['diaconos','Diáconos'], ['diaconisa','Diaconisa'], ['recepcao','Recepção'] ] },
};

function pad(n){ return n<10 ? '0'+n : ''+n; }
function dateKey(y,m,d){ return `${y}-${pad(m+1)}-${pad(d)}`; }
function dateKeyOf(d){ return dateKey(d.getFullYear(), d.getMonth(), d.getDate()); }
function dayTypesFor(dow){ if(dow===0) return ['domingo']; if(dow===3) return ['quarta']; if(dow===6) return ['sabadoEscola','sabadoCulto']; return []; }

function emptyData(){
  const d = { anciao:{} };
  Object.keys(DAYTYPES).forEach(k => d[k] = {});
  return d;
}
function loadData(){
  try{ const raw = localStorage.getItem(KEY); if(raw) return Object.assign(emptyData(), JSON.parse(raw)); }catch(e){}
  return emptyData();
}
function saveData(){ try{ localStorage.setItem(KEY, JSON.stringify(data)); }catch(e){ console.error('Falha ao salvar', e); } }
let data = loadData();

function getEntry(daytype, key, role){
  if(!data[daytype][key]) data[daytype][key] = {};
  if(!data[daytype][key][role]) data[daytype][key][role] = [];
  return data[daytype][key][role];
}
function getNames(daytype, key, role){
  return (data[daytype][key] && data[daytype][key][role]) || [];
}

let today = new Date();
let viewYear = today.getFullYear(), viewMonth = today.getMonth();
let selectedKey = null;

function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeCsv(v){ v = (v===undefined||v===null) ? '' : String(v); if(/[;"\n]/.test(v)) v = '"' + v.replace(/"/g,'""') + '"'; return v; }

function renderAnciaoBox(){
  const key = `${viewYear}-${pad(viewMonth+1)}`;
  const val = data.anciao[key] || '';
  return `
  <div class="anciao-box">
    <label>Ancião do mês</label>
    <input type="text" placeholder="Nome do ancião responsável" value="${escapeHtml(val)}" onchange="setAnciao('${key}', this.value)">
  </div>`;
}

function renderCalendar(){
  const first = new Date(viewYear, viewMonth, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  let html = `
  <div class="month-nav">
    <button aria-label="Mês anterior" onclick="changeMonth(-1)">‹</button>
    <div class="label">${MESES[viewMonth]} de ${viewYear}</div>
    <button aria-label="Próximo mês" onclick="changeMonth(1)">›</button>
  </div>
  <div class="grid">`;
  DOW.forEach(d=> html += `<div class="dow">${d}</div>`);
  for(let i=0;i<startDow;i++) html += `<div class="day empty"></div>`;
  for(let d=1; d<=daysInMonth; d++){
    const dow = new Date(viewYear, viewMonth, d).getDay();
    const types = dayTypesFor(dow);
    const valid = types.length>0;
    const key = dateKey(viewYear, viewMonth, d);
    let filled = false, firstName = '';
    types.forEach(t=>{
      Object.entries(data[t][key] || {}).forEach(([role, names])=>{
        if(names.length){ filled = true; if(!firstName) firstName = names[0]; }
      });
    });
    const cls = 'day' + (valid?' active':'') + (filled?' filled':'') + (key===selectedKey?' selected':'');
    const onclick = valid ? `onclick="openDay('${key}')"` : '';
    const who = firstName ? `<div class="who">${escapeHtml(firstName)}</div>` : '';
    html += `<div class="${cls}" ${onclick}><div class="num">${d}</div>${who}</div>`;
  }
  html += `</div>
  <div class="legend"><span><i class="dot dom"></i>Domingo / Quarta</span><span><i class="dot sab"></i>Sábado (2 cultos)</span></div>`;
  return html;
}

function renderRole(daytype, key, roleId, roleLabel){
  const names = getNames(daytype, key, roleId);
  const chips = names.length
    ? names.map((n,i)=>`<span class="chip">${escapeHtml(n)}<button onclick="removeName('${daytype}','${key}','${roleId}',${i})" aria-label="Remover">✕</button></span>`).join('')
    : `<span class="chip empty">Ninguém escalado</span>`;
  const inputId = `in_${daytype}_${roleId}`;
  return `
  <div class="role">
    <div class="rlabel">${roleLabel}</div>
    <div class="chips">${chips}</div>
    <div class="add-row">
      <input id="${inputId}" type="text" placeholder="Adicionar nome" onkeydown="if(event.key==='Enter')addName('${daytype}','${key}','${roleId}','${inputId}')">
      <button onclick="addName('${daytype}','${key}','${roleId}','${inputId}')">Add</button>
    </div>
  </div>`;
}

function renderDayPanels(){
  if(!selectedKey) return '';
  const [y,m,dd] = selectedKey.split('-').map(Number);
  const dow = new Date(y,m-1,dd).getDay();
  const types = dayTypesFor(dow);
  const dowName = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'][dow];
  let html = `<div class="panels">`;
  types.forEach(t=>{
    const def = DAYTYPES[t];
    html += `<div class="panel"><h3>${def.label}</h3><p class="sub">${dowName}, ${dd} de ${MESES[m-1]} de ${y}</p>`;
    def.roles.forEach(([id,label]) => html += renderRole(t, selectedKey, id, label));
    html += `</div>`;
  });
  html += `</div>`;
  return html;
}

function render(){
  let html = `<div class="toolbar">${renderAnciaoBox()}<button class="download-btn" id="downloadBtn" onclick="baixarPlanilha()">⬇ Baixar planilha do mês</button></div>`;
  html += renderCalendar();
  html += renderDayPanels();
  document.getElementById('main').innerHTML = html;
}

function changeMonth(delta){
  viewMonth += delta;
  if(viewMonth<0){ viewMonth=11; viewYear--; }
  if(viewMonth>11){ viewMonth=0; viewYear++; }
  selectedKey = null;
  render();
}
function openDay(key){ selectedKey = (selectedKey===key) ? null : key; render(); }
function addName(daytype, key, role, inputId){
  const input = document.getElementById(inputId);
  const val = input.value.trim();
  if(!val) return;
  getEntry(daytype, key, role).push(val);
  saveData();
  render();
}
function removeName(daytype, key, role, idx){
  data[daytype][key][role].splice(idx,1);
  saveData();
  render();
}
function setAnciao(key, val){
  val = val.trim();
  if(val) data.anciao[key] = val; else delete data.anciao[key];
  saveData();
}

function namesStr(daytype, key, role){ return getNames(daytype, key, role).join(', '); }

function buildMonthCSV(year, month){
  const anciaoKey = `${year}-${pad(month+1)}`;
  const anciaoVal = data.anciao[anciaoKey] || '';
  const rows = [];
  rows.push([`${MESES[month].toUpperCase()} ${year}`]);
  rows.push([`ANCIÃO DO MÊS - ${anciaoVal.toUpperCase()}`]);
  rows.push([]);

  const daysInMonth = new Date(year, month+1, 0).getDate();
  for(let d=1; d<=daysInMonth; d++){
    const dow = new Date(year, month, d).getDay();
    if(dow !== 6) continue; // um bloco por sábado
    const sat = new Date(year, month, d);
    const sun = new Date(sat); sun.setDate(sat.getDate()+1);
    const wed = new Date(sat); wed.setDate(sat.getDate()+4);
    const kSat = dateKeyOf(sat), kSun = dateKeyOf(sun), kWed = dateKeyOf(wed);

    rows.push(['Domingo','','Quarta','','Sábado - Escola Sabatina','','Sábado - Culto Divino','']);
    rows.push(['Dia', sun.getDate(), 'Dia', wed.getDate(), 'Dia', sat.getDate(), 'Dia', sat.getDate()]);
    rows.push(['Sermão', namesStr('domingo',kSun,'sermao'), 'Sermão', namesStr('quarta',kWed,'sermao'), 'Direção', namesStr('sabadoEscola',kSat,'direcao'), 'Sermão', namesStr('sabadoCulto',kSat,'sermao')]);
    rows.push(['Música', namesStr('domingo',kSun,'musica'), 'Música', namesStr('quarta',kWed,'musica'), 'Música', namesStr('sabadoEscola',kSat,'musica'), 'Música', namesStr('sabadoCulto',kSat,'musica')]);
    rows.push(['Som', namesStr('domingo',kSun,'som'), 'Som', namesStr('quarta',kWed,'som'), 'Som', namesStr('sabadoEscola',kSat,'som'), 'Som', namesStr('sabadoCulto',kSat,'som')]);
    rows.push(['Diáconos', namesStr('domingo',kSun,'diaconos'), 'Diáconos', namesStr('quarta',kWed,'diaconos'), 'Live', namesStr('sabadoEscola',kSat,'live'), 'Diáconos', namesStr('sabadoCulto',kSat,'diaconos')]);
    rows.push(['','','','','','','Diaconisa', namesStr('sabadoCulto',kSat,'diaconisa')]);
    rows.push(['Recepção', namesStr('domingo',kSun,'recepcao'), 'Recepção', namesStr('quarta',kWed,'recepcao'), 'Adoração Infantil', namesStr('sabadoEscola',kSat,'adoracaoInfantil'), 'Recepção', namesStr('sabadoCulto',kSat,'recepcao')]);
    rows.push([]);
  }
  return rows.map(r=>r.map(escapeCsv).join(';')).join('\r\n');
}

async function baixarPlanilha(){
  const btn = document.getElementById('downloadBtn');
  const csv = buildMonthCSV(viewYear, viewMonth);
  const filename = `escala-${MESES[viewMonth]}-${viewYear}.csv`;
  if(btn){ btn.disabled = true; btn.textContent = 'Preparando...'; }
  try{
    const downloads = window.claude ? await window.claude.use('downloads') : null;
    if(!downloads){ alert('O download não está disponível nesta visualização do site.'); return; }
    await downloads.save({ filename, data: '\uFEFF' + csv });
  }catch(e){
    if(!e || e.code !== 'declined'){ console.error('Falha ao baixar planilha', e); alert('Não foi possível baixar a planilha agora. Tente novamente.'); }
  }finally{
    if(btn){ btn.disabled = false; btn.textContent = '⬇ Baixar planilha do mês'; }
  }
}

render();