// ======== State & Storage ========
const LS_KEY = 'optidesk_tickets_v1';

function nowLocalISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0,16);
}

function loadTickets(){ try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch(e){ return []; } }
function saveTickets(arr){ localStorage.setItem(LS_KEY, JSON.stringify(arr)); }

let state = { view: 'dashboard', tickets: loadTickets() };

// ======== Routing (views) ========
const views = ['dashboard','novo','lista','relatorios'];
function show(view){
  views.forEach(v => document.getElementById('view-'+v).classList.add('hidden'));
  document.getElementById('view-'+view).classList.remove('hidden');
  state.view = view;
  if(view==='dashboard') refreshDashboard();
  if(view==='lista') renderTable();
  if(view==='relatorios') refreshRelatorios();
}

document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', e => show(e.currentTarget.dataset.view)));

// ======== KPI helpers ========
function minutesBetween(a,b){
  if(!a || !b) return null;
  let A = new Date(a);
  let B = new Date(b);
  let ms = (B - A) / 60000;
  return ms >= 0 ? Math.floor(ms) : null;
}
function hhmm(min){
  if(min==null) return '--:--';
  const sign = min<0?'-':'';
  min = Math.abs(min);
  const h = Math.floor(min/60);
  const m = min%60;
  return sign + String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
}

function refreshDashboard(){
  const t = state.tickets;
  const total = t.length;
  const abertos = t.filter(x=>x.status==='Aberto' || x.status==='Em andamento').length;
  const resolvidos = t.filter(x=>x.status==='Resolvido').length;
  const tempos = t.map(x=>minutesBetween(x.abertura, x.fechamento)).filter(x=>x!=null);
  const media = tempos.length ? Math.floor(tempos.reduce((a,b)=>a+b,0)/tempos.length) : null;
  document.getElementById('kpi-total').textContent = total;
  document.getElementById('kpi-abertos').textContent = abertos;
  document.getElementById('kpi-resolvidos').textContent = resolvidos;
  document.getElementById('kpi-tmedio').textContent = hhmm(media);
}

function refreshRelatorios(){
  // Simple KPIs reuse same logic but filter by date/status/priority
  const de = document.getElementById('r-de').value;
  const ate = document.getElementById('r-ate').value;
  const st = document.getElementById('r-status').value;
  const pr = document.getElementById('r-prioridade').value;

  let t = [...state.tickets];
  if(de) t = t.filter(x => x.abertura && x.abertura.slice(0,10) >= de);
  if(ate) t = t.filter(x => x.abertura && x.abertura.slice(0,10) <= ate);
  if(st)  t = t.filter(x => x.status === st);
  if(pr)  t = t.filter(x => x.prioridade === pr);

  const total = t.length;
  const resolvidos = t.filter(x=>x.status==='Resolvido').length;
  const tempos = t.map(x=>minutesBetween(x.abertura, x.fechamento)).filter(x=>x!=null);
  const media = tempos.length ? Math.floor(tempos.reduce((a,b)=>a+b,0)/tempos.length) : null;

  const box = document.getElementById('rel-kpis');
  box.innerHTML = `
    <div class="kpi"><div class="kpi-title">Total</div><div class="kpi-value">${total}</div></div>
    <div class="kpi"><div class="kpi-title">Resolvidos</div><div class="kpi-value">${resolvidos}</div></div>
    <div class="kpi"><div class="kpi-title">Tempo médio</div><div class="kpi-value">${hhmm(media)}</div></div>
  `;
}

// ======== Novo Ticket ========
const formNovo = document.getElementById('form-novo');
formNovo.abertura.value = nowLocalISO();

formNovo.addEventListener('submit', (e)=>{
  e.preventDefault();
  const f = e.target;
  const novo = {
    id: Date.now(),
    titulo: f.titulo.value.trim(),
    descricao: f.descricao.value.trim(),
    prioridade: f.prioridade.value,
    status: f.status.value,
    abertura: f.abertura.value || nowLocalISO(),
    fechamento: f.fechamento.value || "",
    responsavel: f.responsavel.value.trim(),
    grupo: f.grupo.value,
    comentarios: [] // {autor, texto, data}
  };
  state.tickets.unshift(novo);
  saveTickets(state.tickets);
  f.reset();
  formNovo.abertura.value = nowLocalISO();
  alert('Ticket salvo!');
  show('lista');
});

// ======== Lista ========
const tbody = document.querySelector('#table-tickets tbody');
function renderTable(){
  const q = document.getElementById('f-texto').value.toLowerCase();
  const fs = document.getElementById('f-status').value;
  const fp = document.getElementById('f-prioridade').value;
  const fr = document.getElementById('f-responsavel').value.toLowerCase();
  const fg = document.getElementById('f-grupo').value;
  const de = document.getElementById('f-de').value;
  const ate = document.getElementById('f-ate').value;

  let t = [...state.tickets];
  if(q) t = t.filter(x => (x.titulo+x.descricao).toLowerCase().includes(q));
  if(fs) t = t.filter(x => x.status===fs);
  if(fp) t = t.filter(x => x.prioridade===fp);
  if(fr) t = t.filter(x => (x.responsavel||'').toLowerCase().includes(fr));
  if(fg) t = t.filter(x => x.grupo===fg);
  if(de) t = t.filter(x => x.abertura && x.abertura.slice(0,10) >= de);
  if(ate) t = t.filter(x => x.abertura && x.abertura.slice(0,10) <= ate);

  tbody.innerHTML = t.map(x => {
    const dur = hhmm(minutesBetween(x.abertura, x.fechamento));
    return `<tr>
      <td>${x.id}</td>
      <td>${x.titulo}</td>
      <td>${x.prioridade}</td>
      <td><span class="badge ${x.status.replace(' ','\ ')}">${x.status}</span></td>
      <td>${x.abertura ? x.abertura.replace('T',' ') : ''}</td>
      <td>${x.fechamento ? x.fechamento.replace('T',' ') : ''}</td>
      <td>${dur}</td>
      <td>${x.responsavel||''}</td>
      <td>${x.grupo||''}</td>
      <td><button data-id="${x.id}" class="row-open">Detalhes</button></td>
    </tr>`
  }).join('');
}

// filter events
document.querySelectorAll('#view-lista .filters input, #view-lista .filters select')
  .forEach(el => el.addEventListener('input', renderTable));

// open row modal
tbody.addEventListener('click', (e)=>{
  const btn = e.target.closest('.row-open');
  if(!btn) return;
  const id = Number(btn.dataset.id);
  const t = state.tickets.find(x=>x.id===id);
  openModal(t);
});

// export CSV
document.getElementById('btn-export').addEventListener('click', ()=>{
  const header = ['id','titulo','descricao','prioridade','status','abertura','fechamento','responsavel','grupo','tempo_min'];
  const rows = state.tickets.map(t => {
    const mins = minutesBetween(t.abertura, t.fechamento);
    return [t.id,t.titulo,t.descricao,t.prioridade,t.status,t.abertura,t.fechamento,t.responsavel,t.grupo, mins??''];
  });
  const csv = [header.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='optidesk_tickets.csv'; a.click();
  URL.revokeObjectURL(url);
});

// ======== Modal Detalhe + Comentários ========
const modal = document.getElementById('modal');
const mBody = document.getElementById('m-body');
const mTitle = document.getElementById('m-title');

function openModal(t){
  mTitle.textContent = `[${t.id}] ${t.titulo}`;
  const dur = hhmm(minutesBetween(t.abertura, t.fechamento));
  mBody.innerHTML = `
    <div class="grid">
      <label>Título <input id="m-titulo" value="${t.titulo}"></label>
      <label>Responsável <input id="m-resp" value="${t.responsavel||''}"></label>
      <label>Grupo
        <select id="m-grupo">
          <option ${t.grupo==='TI - Protheus'?'selected':''}>TI - Protheus</option>
          <option ${t.grupo==='Infraestrutura'?'selected':''}>Infraestrutura</option>
          <option ${t.grupo==='Suporte Geral'?'selected':''}>Suporte Geral</option>
          <option ${t.grupo==='Outros'?'selected':''}>Outros</option>
        </select>
      </label>
      <label>Prioridade
        <select id="m-prio">
          ${['Baixa','Média','Alta','Urgente'].map(p=>`<option ${t.prioridade===p?'selected':''}>${p}</option>`).join('')}
        </select>
      </label>
      <label>Status
        <select id="m-status">
          ${['Aberto','Em andamento','Resolvido'].map(s=>`<option ${t.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </label>
      <label>Abertura <input id="m-abertura" type="datetime-local" value="${t.abertura||''}"></label>
      <label>Fechamento <input id="m-fechamento" type="datetime-local" value="${t.fechamento||''}"></label>
    </div>
    <label>Descrição <textarea id="m-desc" rows="3">${t.descricao||''}</textarea></label>
    <div class="kpis">
      <div class="kpi"><div class="kpi-title">Tempo</div><div class="kpi-value">${dur}</div></div>
      <div class="kpi"><div class="kpi-title">Comentários</div><div class="kpi-value">${t.comentarios.length}</div></div>
    </div>
    <div class="right">
      <button id="m-close-tick">Marcar Resolvido agora</button>
      <button id="m-save" class="primary">Salvar</button>
      <button id="m-del" style="background:#2b3652">Excluir</button>
    </div>
    <h4>Comentários</h4>
    <div id="m-comments"></div>
    <div class="grid">
      <label>Autor <input id="c-autor" value="Ana Carolina"></label>
      <label style="grid-column: span 2;">Comentário <input id="c-texto" placeholder="Escreva um comentário..."></label>
    </div>
    <div class="right"><button id="c-add">Adicionar comentário</button></div>
  `;

  // render comments
  const box = mBody.querySelector('#m-comments');
  box.innerHTML = t.comentarios.map(c=>`
    <div class="comment"><small>${c.data} — ${c.autor}</small><br>${c.texto}</div>
  `).join('') || '<div class="comment"><small>Sem comentários</small></div>';

  // handlers
  mBody.querySelector('#m-save').onclick = () => {
    t.titulo = mBody.querySelector('#m-titulo').value.trim();
    t.responsavel = mBody.querySelector('#m-resp').value.trim();
    t.grupo = mBody.querySelector('#m-grupo').value;
    t.prioridade = mBody.querySelector('#m-prio').value;
    t.status = mBody.querySelector('#m-status').value;
    t.abertura = mBody.querySelector('#m-abertura').value;
    t.fechamento = mBody.querySelector('#m-fechamento').value;
    saveTickets(state.tickets);
    renderTable(); refreshDashboard();
    alert('Salvo!');
  };
  mBody.querySelector('#m-close-tick').onclick = () => {
    t.status = 'Resolvido';
    t.fechamento = nowLocalISO();
    saveTickets(state.tickets);
    renderTable(); refreshDashboard();
  };
  mBody.querySelector('#m-del').onclick = () => {
    if(confirm('Excluir este ticket?')){
      state.tickets = state.tickets.filter(x=>x.id!==t.id);
      saveTickets(state.tickets);
      modal.close();
      renderTable(); refreshDashboard();
    }
  };
  mBody.querySelector('#c-add').onclick = () => {
    const autor = mBody.querySelector('#c-autor').value.trim() || 'Anônimo';
    const texto = mBody.querySelector('#c-texto').value.trim();
    if(!texto) return;
    t.comentarios.unshift({autor,texto,data: new Date().toLocaleString()});
    saveTickets(state.tickets);
    openModal(t); // re-render
  };

  modal.showModal();
}

// ======== Print ========
document.getElementById('btn-print').addEventListener('click', ()=>window.print());
document.getElementById('btn-print2').addEventListener('click', ()=>window.print());

// Initial
show('dashboard');
refreshDashboard();
