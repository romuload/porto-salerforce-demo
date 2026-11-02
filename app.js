(function () {
  const D = window.DEMO_DATA;
  const app = document.getElementById('app');
  const tip = document.getElementById('tooltip');
  const state = { period: 'mes-atual' };

  const NS = 'http://www.w3.org/2000/svg';
  const COLORS = { c1: '#3290ed', c2: '#77b5f2', c3: '#9d53f2', c5: '#26aba4' };

  // ---- Routes, keyed by the first hash segment (#/lista/encerrados -> 'lista').
  // To add a screen: register `nome: renderFn` here; it receives the remaining segments.
  const routes = {
    dashboard: renderDashboard,
    lista: renderList,
    caso: renderCase,
    analise: renderAnalise
  };

  function router() {
    const hash = location.hash || '#/dashboard';
    const [name, ...params] = hash.replace(/^#\//, '').split('/').map(decodeURIComponent);
    const render = routes[name];
    hideTip();
    document.body.dataset.page = render ? name : 'placeholder';
    if (render) render(...params);
    else renderPlaceholder(hash);
    app.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  // ---- Helpers
  function el(tag, attrs = {}, children = []) {
    const isSvg = ['svg', 'g', 'circle', 'path', 'line', 'rect', 'text', 'polygon'].includes(tag);
    const node = isSvg ? document.createElementNS(NS, tag) : document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    [].concat(children).forEach(c => c && node.append(c));
    return node;
  }

  function showTip(evt, html) {
    tip.innerHTML = html;
    tip.hidden = false;
    tip.style.left = evt.clientX + 'px';
    tip.style.top = evt.clientY + 'px';
  }
  function hideTip() { tip.hidden = true; }

  function withTip(node, html) {
    node.addEventListener('mousemove', e => showTip(e, html));
    node.addEventListener('mouseleave', hideTip);
    return node;
  }

  function card({ title, cls = '', report, href = '#/relatorio/' + report, body }) {
    return el('article', { class: 'card ' + cls }, [
      el('header', { class: 'card-header' }, [
        el('h2', { text: title }),
        el('a', { class: 'expand', href, 'aria-label': 'Expandir ' + title }, el('img', { src: 'assets/expand.svg', alt: '' }))
      ]),
      el('div', { class: 'card-body' }, body),
      el('footer', { class: 'card-footer' }, el('a', { href, text: 'Ver Relatório' }))
    ]);
  }

  // ---- Charts
  function polar(cx, cy, r, deg) {
    const a = (deg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }

  function arcPath(cx, cy, r, start, end) {
    const [x1, y1] = polar(cx, cy, r, start);
    const [x2, y2] = polar(cx, cy, r, end);
    const large = end - start > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  }

  // `order` sets the clockwise drawing order of segments; the legend keeps label order.
  function donut(values, labels, colors, order = values.map((_, i) => i)) {
    const total = values.reduce((a, b) => a + b, 0) || 1;
    const W = 300, H = 270, cx = W / 2, cy = 132, r = 96, sw = 30;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img',
      'aria-label': labels.map((l, i) => `${l}: ${values[i]}`).join(', ') });
    const g = el('g');
    let angle = 0;
    order.forEach(i => {
      const v = values[i];
      if (!v) return;
      const sweep = v / total * 360;
      const end = angle + sweep - (sweep >= 360 ? 0.01 : 0);
      const seg = el('path', { class: 'seg', d: arcPath(cx, cy, r, angle, end), fill: 'none',
        stroke: colors[i], 'stroke-width': sw });
      withTip(seg, `${labels[i]}: <strong>${v}</strong> (${Math.round(v / total * 100)}%)`);
      g.append(seg);
      const [tx, ty] = polar(cx, cy, r + sw / 2 + 14, angle + sweep / 2);
      g.append(el('text', { x: tx, y: ty, 'font-size': 14, 'text-anchor': 'middle',
        'dominant-baseline': 'middle', fill: '#000', text: v }));
      angle += sweep;
    });
    g.addEventListener('mouseenter', () => svg.classList.add('chart-dim'));
    g.addEventListener('mouseleave', () => svg.classList.remove('chart-dim'));
    svg.append(g);
    const legend = el('div', { class: 'legend' }, labels.map((l, i) =>
      el('span', {}, [el('i', { style: `background:${colors[i]}` }), l])));
    return [svg, legend];
  }

  function gauge(value, max = 30) {
    const W = 300, H = 200, cx = 150, cy = 150, r = 112, sw = 14;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img',
      'aria-label': `SAC: ${value} de ${max}` });
    const toDeg = v => -90 + (Math.min(v, max) / max) * 180;
    [[0, 8, '#2e844a'], [8, 20, '#dd7a01'], [20, 30, '#ba0517']].forEach(([a, b, c]) => {
      svg.append(withTip(el('path', { d: arcPath(cx, cy, r, toDeg(a) + (a ? 0.6 : 0), toDeg(b)),
        fill: 'none', stroke: c, 'stroke-width': sw }), `Faixa ${a}–${b}`));
    });
    for (let t = 0; t <= max; t += 5) {
      const d = toDeg(t);
      const [x1, y1] = polar(cx, cy, r - sw / 2 - 2, d);
      const [x2, y2] = polar(cx, cy, r - sw / 2 - 10, d);
      svg.append(el('line', { x1, y1, x2, y2, stroke: '#aeaeae', 'stroke-width': 1 }));
      const [lx, ly] = polar(cx, cy, r - sw / 2 - 22, d);
      svg.append(el('text', { x: lx, y: ly, 'font-size': 12, fill: '#444', 'text-anchor': 'middle',
        'dominant-baseline': 'middle', text: t }));
    }
    const needle = el('g', { class: 'needle', style: `transform-origin:${cx}px ${cy}px; transform: rotate(${toDeg(0)}deg); transition: transform .8s cubic-bezier(.2,.8,.2,1)` }, [
      el('polygon', { points: `${cx - 6},${cy} ${cx + 6},${cy} ${cx},${cy - 78}`, fill: '#181818' }),
      el('circle', { cx, cy, r: 9, fill: '#181818' })
    ]);
    svg.append(needle);
    svg.append(el('text', { x: cx, y: cy + 36, 'font-size': 16, fill: '#181818', 'text-anchor': 'middle', text: value }));
    requestAnimationFrame(() => requestAnimationFrame(() => {
      needle.style.transform = `rotate(${toDeg(value)}deg)`;
    }));
    return svg;
  }

  function columns(values, labels) {
    const W = 1200, H = 640, left = 36, right = 8, top = 12, bottom = 70;
    const plotW = W - left - right, plotH = H - top - bottom;
    const maxV = Math.max(14, Math.ceil(Math.max(...values) / 2) * 2);
    const step = maxV <= 14 ? 2 : Math.ceil(maxV / 7 / 2) * 2;
    const yMax = step * 7;
    const y = v => top + plotH - v / yMax * plotH;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img',
      'aria-label': labels.map((l, i) => `${l}: ${values[i]}`).join(', ') });
    for (let t = 0; t <= yMax; t += step) {
      svg.append(el('line', { x1: left + 8, x2: W - right, y1: y(t), y2: y(t), stroke: '#aeaeae' }));
      svg.append(el('text', { x: left, y: y(t), 'font-size': 12, fill: '#444', 'text-anchor': 'end',
        'dominant-baseline': 'middle', text: t }));
    }
    const slot = plotW / values.length, bw = Math.min(100, slot * 0.76);
    const g = el('g');
    values.forEach((v, i) => {
      const x = left + 16 + i * slot + (slot - bw) / 2;
      const bar = el('rect', { class: 'bar', x, y: y(v), width: bw, height: y(0) - y(v), fill: '#3290ed' });
      withTip(bar, `${labels[i]}: <strong>${v}</strong>`);
      bar.addEventListener('click', () => { location.hash = '#/relatorio/casos'; });
      g.append(bar);
      g.append(el('text', { x: x + bw / 2, y: y(v) - 8, 'font-size': 12, fill: '#000', 'text-anchor': 'middle', text: v }));
      const words = labels[i].split(' ');
      const lines = labels[i].length > 20 && words.length > 1
        ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')]
        : [labels[i]];
      lines.forEach((ln, k) => g.append(el('text', { x: x + bw / 2, y: y(0) + 22 + k * 16, 'font-size': 12,
        fill: '#444', 'text-anchor': 'middle', text: ln })));
    });
    g.addEventListener('mouseenter', () => svg.classList.add('chart-dim'));
    g.addEventListener('mouseleave', () => svg.classList.remove('chart-dim'));
    svg.append(g);
    return svg;
  }

  // ---- Combobox (Período)
  function periodCombobox(onChange) {
    const id = 'periodo';
    const current = D.periods.find(p => p.id === state.period);
    const field = el('button', { type: 'button', class: 'combobox-field', id, 'aria-haspopup': 'listbox',
      'aria-expanded': 'false', 'aria-labelledby': id + '-label ' + id }, [
      el('span', { text: current.label }), el('img', { src: 'assets/down-field.svg', alt: '' })
    ]);
    const list = el('ul', { class: 'listbox', role: 'listbox', hidden: '' });
    let focus = D.periods.indexOf(current);

    D.periods.forEach((p, i) => {
      list.append(el('li', { role: 'option', 'aria-selected': String(p.id === state.period), text: p.label,
        onclick: () => choose(i) }));
    });

    function open(v) {
      list.hidden = !v;
      field.setAttribute('aria-expanded', String(v));
      paint();
    }
    function paint() { [...list.children].forEach((li, i) => li.classList.toggle('is-focus', i === focus)); }
    function choose(i) { open(false); field.focus(); onChange(D.periods[i].id); }

    field.addEventListener('click', () => open(list.hidden));
    field.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (list.hidden) return open(true);
        focus = (focus + (e.key === 'ArrowDown' ? 1 : -1) + D.periods.length) % D.periods.length;
        paint();
      } else if ((e.key === 'Enter' || e.key === ' ') && !list.hidden) {
        e.preventDefault();
        choose(focus);
      } else if (e.key === 'Escape') open(false);
    });
    document.addEventListener('click', e => { if (!wrap.contains(e.target)) open(false); });

    const wrap = el('div', { class: 'combobox' }, [
      el('label', { id: id + '-label', for: id, text: 'Período' }), field, list
    ]);
    return wrap;
  }

  // ---- Screens
  function renderDashboard() {
    const d = D.byPeriod[state.period];
    const k = d.kpis;
    const kpi = (title, value, tone, view) => card({ title, cls: 'kpi', href: '#/lista/' + view,
      body: el('div', { class: 'kpi-value ' + tone, text: value }) });

    app.replaceChildren(el('div', { class: 'stack' }, [
      el('section', { class: 'page-header' }, [
        el('div', { class: 'page-title' }, [
          el('img', { class: 'obj-icon', src: 'assets/dashboard.svg', alt: '' }),
          el('div', {}, [
            el('small', { text: 'Dash' }),
            el('h1', {}, ['Acompanhamento de Sinistros',
              el('button', { type: 'button', class: 'icon-btn-xs', 'aria-label': 'Compartilhar' },
                el('img', { src: 'assets/share.svg', alt: '' }))])
          ])
        ]),
        el('div', { class: 'btn-group' }, [
          el('button', { type: 'button', class: 'btn', text: 'Edit' }),
          el('button', { type: 'button', class: 'btn-icon', 'aria-label': 'Mais ações' },
            el('img', { src: 'assets/caret.svg', alt: '' }))
        ])
      ]),
      periodCombobox(id => { state.period = id; renderDashboard(); document.getElementById('periodo').focus(); }),
      el('div', { class: 'row row-kpi' }, [
        kpi('Aguardando Análise', k.aguardando, 'warning', 'aguardando-analise'),
        kpi('Documentação Recebida', k.documentacao, 'error', 'documentacao-recebida'),
        kpi('Análise em execução', k.execucao, 'success', 'analise-em-execucao'),
        kpi('Encerrados', k.encerrados, 'neutral', 'encerrados')
      ]),
      el('div', { class: 'row row-charts' }, [
        card({ title: 'Por Tipo de Lesão', cls: 'chart-card', report: 'tipo-de-lesao',
          body: donut(d.lesao, D.lesaoLabels, [COLORS.c1, COLORS.c3, COLORS.c5]) }),
        card({ title: 'Por Empresa', cls: 'chart-card', report: 'por-empresa',
          body: donut(d.empresa, D.empresaLabels, [COLORS.c1, COLORS.c2, COLORS.c3, COLORS.c5], [0, 2, 1, 3]) }),
        card({ title: 'SAC', cls: 'chart-card', report: 'sac', body: el('div', { class: 'gauge-wrap' }, gauge(d.sac)) })
      ]),
      card({ title: 'Casos', cls: 'cases-card', report: 'casos', body: el('div', { class: 'chart-scroll' }, columns(d.casos, D.casosLabels)) })
    ]));
  }

  // ---- List of cases (opened from the KPI cards). Only the status filter and rows change.
  const COLUMNS = [
    { key: 'prioridade', label: 'Prioridade', width: 95 },
    { key: 'status', label: 'Status', width: 160 },
    { key: 'empresa', label: 'Empresa', width: 124 },
    { key: 'produto', label: 'Produto', width: 96 },
    { key: 'segmento', label: 'Segmento', width: 90 },
    { key: 'aviso', label: 'Data/hora do Aviso', width: 154, sortBy: 'avisoTs' },
    { key: 'sinistroData', label: 'Data/hora do Sinistro', width: 166, sortBy: 'sinistroTs' },
    { key: 'numero', label: 'Num. Sinistro', width: 165 },
    { key: 'natureza', label: 'Natureza', width: 127 },
    { key: 'nome', label: 'Nome', width: 148 }
  ];
  const listState = { sort: { key: 'empresa', dir: 0 }, query: '', selected: new Set() };

  // Small deterministic PRNG so each (view, period) always shows the same rows.
  function seeded(str) {
    let h = 2166136261;
    for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % 10000) / 10000;
  }

  function fmt(d) {
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:00`;
  }

  function buildRows(view, period) {
    const count = D.byPeriod[period].kpis[view.kpi];
    const rnd = seeded(view.id + period);
    const pick = arr => arr[Math.floor(rnd() * arr.length)];
    const viewIndex = D.listViews.indexOf(view);
    return Array.from({ length: count }, (_, i) => {
      const fromFigma = view.id === 'aguardando-analise' && period === 'mes-atual' ? D.figmaRows[i] : null;
      const aviso = fromFigma ? new Date(2024, 1, 14, 21) : new Date(2024, 1, 14 - Math.floor(rnd() * 12), 8 + Math.floor(rnd() * 14));
      const sinistro = fromFigma ? new Date(2024, 1, 14, 13) : new Date(aviso.getTime() - (2 + Math.floor(rnd() * 30)) * 3600e3);
      return {
        prioridade: fromFigma ? fromFigma.prioridade : pick(D.pools.prioridades),
        status: view.status,
        empresa: fromFigma ? fromFigma.empresa : pick(D.pools.empresas),
        produto: 'Individual',
        segmento: 'APP',
        aviso: fmt(aviso), avisoTs: aviso.getTime(),
        sinistroData: fmt(sinistro), sinistroTs: sinistro.getTime(),
        numero: '2024.04.1.99.000' + (111222 + viewIndex * 100 + i),
        natureza: fromFigma ? 'Colisão' : pick(D.pools.naturezas),
        nome: fromFigma ? fromFigma.nome : pick(D.pools.nomes),
        // Fields used by the case screen.
        viewId: view.id,
        caso: String(viewIndex * 100 + i + 1).padStart(5, '0'),
        lesao: pick(D.lesaoLabels),
        apolice: '99-' + (520200 + Math.floor(rnd() * 99)) + '-' + (10 + Math.floor(rnd() * 89))
      };
    });
  }

  function toolbarBtn(icon, label, withCaret, onclick) {
    return el('button', { type: 'button', class: 'tb-btn', 'aria-label': label, title: label, onclick }, [
      el('img', { src: `assets/${icon}.svg`, alt: '', width: 14, height: 14 }),
      withCaret && el('img', { src: 'assets/caret-xs.svg', alt: '', width: 8, height: 8 })
    ]);
  }

  function listViewMenu(current) {
    const btn = el('button', { type: 'button', class: 'lv-toggle', 'aria-haspopup': 'menu', 'aria-expanded': 'false',
      'aria-label': 'Trocar lista' }, el('img', { src: 'assets/listview-down.svg', alt: '', width: 20, height: 20 }));
    const menu = el('div', { class: 'menu', role: 'menu', hidden: '' }, [
      el('div', { class: 'menu-title', text: 'Listas de casos' }),
      ...D.listViews.map(v => el('a', { role: 'menuitemradio', href: '#/lista/' + v.id,
        'aria-checked': String(v.id === current.id), text: v.label }))
    ]);
    const wrap = el('div', { class: 'lv-menu' }, [btn, menu]);
    btn.addEventListener('click', e => {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
      btn.setAttribute('aria-expanded', String(!menu.hidden));
    });
    return wrap;
  }

  function renderList(viewId) {
    const view = D.listViews.find(v => v.id === viewId) || D.listViews[0];
    const allRows = buildRows(view, state.period);
    if (listState.viewKey !== view.id + state.period) {
      listState.viewKey = view.id + state.period;
      listState.selected.clear();
      listState.query = '';
      listState.sort = { key: 'empresa', dir: 0 };
    }
    const periodLabel = D.periods.find(p => p.id === state.period).label;

    const count = el('span');
    const tbody = el('tbody');
    const head = el('thead');
    const selectAll = el('input', { type: 'checkbox', 'aria-label': 'Selecionar todos' });
    const search = el('input', { type: 'search', id: 'buscar', value: listState.query, autocomplete: 'off' });

    function visibleRows() {
      const q = listState.query.trim().toLowerCase();
      let rows = allRows.map((r, i) => ({ ...r, _i: i }));
      if (q) rows = rows.filter(r => COLUMNS.some(c => String(r[c.key]).toLowerCase().includes(q)));
      const { key, dir } = listState.sort;
      if (dir) {
        const col = COLUMNS.find(c => c.key === key);
        const k = col.sortBy || key;
        rows.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * dir);
      }
      return rows;
    }

    function paintHead() {
      head.replaceChildren(el('tr', {}, [
        el('th', { class: 'col-num', 'aria-label': 'Linha' }),
        el('th', { class: 'col-check' }, selectAll),
        ...COLUMNS.map(c => {
          const active = listState.sort.key === c.key;
          const sortAttr = !active || !listState.sort.dir ? 'none' : listState.sort.dir > 0 ? 'ascending' : 'descending';
          return el('th', { style: `width:${c.width}px`, 'aria-sort': sortAttr },
            el('button', { type: 'button', class: 'th-sort' + (active ? ' is-active' : ''),
              onclick: () => {
                const s = listState.sort;
                s.dir = s.key === c.key ? (s.dir === 1 ? -1 : 1) : 1;
                s.key = c.key;
                paint();
              } }, [c.label,
              el('img', { src: 'assets/arrowdown.svg', alt: '', width: 12, height: 12,
                class: 'sort-icon' + (active && listState.sort.dir < 0 ? ' up' : '') })]));
        }),
        el('th', { class: 'col-action', 'aria-label': 'Ações' })
      ]));
    }

    function paint() {
      paintHead();
      const rows = visibleRows();
      count.textContent = `${rows.length} ${rows.length === 1 ? 'Item' : 'Items'}`;
      tbody.replaceChildren(...rows.map((r, n) => {
        const check = el('input', { type: 'checkbox', 'aria-label': 'Selecionar ' + r.numero });
        check.checked = listState.selected.has(r._i);
        check.addEventListener('change', () => {
          check.checked ? listState.selected.add(r._i) : listState.selected.delete(r._i);
          tr.classList.toggle('is-selected', check.checked);
          syncAll();
        });
        const tr = el('tr', { class: 'is-clickable' + (listState.selected.has(r._i) ? ' is-selected' : ''),
          onclick: e => {
            if (e.target.closest('input, button, a, .menu')) return;
            location.hash = '#/caso/' + r.numero;
          } }, [
          el('td', { class: 'col-num', text: n + 1 }),
          el('td', { class: 'col-check' }, check),
          ...COLUMNS.map(c => el('td', { 'data-label': c.label, class: 'c-' + c.key }, c.key === 'numero'
            ? el('a', { class: 'cell-link', href: '#/caso/' + r.numero, text: r.numero })
            : String(r[c.key]))),
          el('td', { class: 'col-action' }, rowMenu(r))
        ]);
        return tr;
      }));
      if (!rows.length) {
        tbody.append(el('tr', {}, el('td', { class: 'empty', colspan: COLUMNS.length + 3,
          text: listState.query ? 'Nenhum caso encontrado para a busca.' : 'Nenhum caso neste status para o período.' })));
      }
      syncAll();
    }

    function syncAll() {
      const n = listState.selected.size;
      selectAll.checked = n > 0 && n === allRows.length;
      selectAll.indeterminate = n > 0 && n < allRows.length;
    }

    selectAll.addEventListener('change', () => {
      listState.selected = new Set(selectAll.checked ? allRows.map((_, i) => i) : []);
      paint();
    });
    search.addEventListener('input', () => { listState.query = search.value; paint(); });

    const updated = el('span', { text: 'Updated a few seconds ago' });

    app.replaceChildren(el('div', { class: 'list-page' }, [
      el('section', { class: 'list-header' }, [
        el('div', { class: 'list-title' }, [
          el('div', { class: 'list-title-row' }, [
            el('img', { src: 'assets/car.svg', alt: '', width: 36, height: 36 }),
            el('div', {}, [
              el('small', { text: 'Casos' }),
              el('h1', {}, ['APP', listViewMenu(view),
                el('button', { type: 'button', class: 'icon-btn-xs', 'aria-label': 'Fixar lista', title: 'Fixar lista' },
                  el('img', { src: 'assets/pin.svg', alt: '' }))])
            ])
          ]),
          el('p', { class: 'list-meta' }, [count, ' • ',
            el('span', { class: 'filter-pill' }, [
              'Status: ', el('strong', { text: view.label }), ' · ' + periodLabel,
              el('a', { href: '#/dashboard', class: 'pill-close', 'aria-label': 'Remover filtro e voltar ao dashboard', title: 'Voltar ao dashboard' },
                el('img', { src: 'assets/close.svg', alt: '', width: 10, height: 10 }))
            ]), ' • ', updated])
        ]),
        el('div', { class: 'list-actions' }, [
          el('div', { class: 'search-field' }, [
            el('label', { for: 'buscar', text: 'Buscar' }),
            el('div', { class: 'search-box' }, [search, el('img', { src: 'assets/search-field.svg', alt: '', width: 16, height: 16 })])
          ]),
          toolbarBtn('settings', 'Configurações da lista', true),
          toolbarBtn('table', 'Exibir como tabela', true),
          toolbarBtn('refresh', 'Atualizar', false, () => {
            updated.textContent = 'Updated just now';
            paint();
            tbody.classList.remove('flash');
            void tbody.offsetWidth;
            tbody.classList.add('flash');
          }),
          toolbarBtn('edit', 'Editar lista', false),
          el('div', { class: 'btn-group-icon' }, [
            el('button', { type: 'button', 'aria-label': 'Gráficos', title: 'Gráficos', disabled: '' }, el('img', { src: 'assets/chart.svg', alt: '' })),
            el('button', { type: 'button', 'aria-label': 'Filtros', title: 'Filtros', disabled: '' }, el('img', { src: 'assets/filter.svg', alt: '' }))
          ])
        ])
      ]),
      el('div', { class: 'table-wrap' }, el('table', { class: 'data-table' }, [head, tbody]))
    ]));
    paint();
  }

  function rowMenu(r) {
    const btn = el('button', { type: 'button', class: 'icon-btn-xs', 'aria-haspopup': 'menu', 'aria-label': 'Ações de ' + r.numero },
      el('img', { src: 'assets/row-menu.svg', alt: '' }));
    const menu = el('div', { class: 'menu menu-right', role: 'menu', hidden: '' }, [
      el('a', { role: 'menuitem', href: '#/caso/' + r.numero, text: 'Abrir caso' }),
      el('a', { role: 'menuitem', href: '#/caso/' + r.numero + '/editar', text: 'Editar' })
    ]);
    btn.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.menu').forEach(m => m !== menu && (m.hidden = true));
      menu.hidden = !menu.hidden;
    });
    return el('div', { class: 'row-menu' }, [btn, menu]);
  }

  document.addEventListener('click', () => {
    document.querySelectorAll('.menu').forEach(m => (m.hidden = true));
    document.querySelectorAll('[aria-haspopup="menu"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
  });

  // ---- Case record (opened from a list row)
  const STAGES = ['Aguardando Análise', 'Análise em Execução', 'Liberado Regulação', 'Solicitado Documentação',
    'Documentação Recebida', 'Sindicância', 'Pagamento', 'Encerrado'];
  const STAGE_STATUS = ['Aguardando análise', 'Em análise', 'Liberado p/ regulação', 'Aguardando documentos',
    'Documentação recebida', 'Em sindicância', 'Em pagamento', 'Encerrado'];
  const STATUS_TO_STAGE = { 'Aguardando Análise': 0, 'Análise em Execução': 1, 'Documentação Recebida': 4, 'Encerrado': 7 };
  const DOCS = ['Boletim de ocorrência', 'Laudo médico', 'CNH do condutor', 'Documento do veículo', 'Comprovante de residência'];
  const DESCRICOES = {
    'Colisão': ['Eu estava dirigindo pela rua principal quando, de repente, o carro à minha frente freou bruscamente. Tentei parar a tempo, mas o asfalto molhado não ajudou. O impacto foi inevitável, e senti o meu carro bater contra o da frente.',
      'Hematomas na perna esquerda, causadas pela colisão.'],
    'Atropelamento': ['Atravessava a avenida na faixa de pedestres quando um veículo avançou o sinal e me atingiu na lateral.',
      'Fratura no braço direito e escoriações nas pernas.'],
    'Queda de moto': ['Perdi o controle da moto em uma curva com óleo na pista e caí no acostamento.',
      'Luxação no ombro e ferimentos leves nas mãos.']
  };
  const caseState = new Map();

  function findCase(numero) {
    for (const v of D.listViews) {
      const r = buildRows(v, state.period).find(x => x.numero === numero);
      if (r) return r;
    }
    return null;
  }

  function getCaseState(r) {
    if (!caseState.has(r.numero)) {
      const stage = STATUS_TO_STAGE[r.status] ?? 0;
      const comments = [{ text: 'Aviso registrado', date: r.aviso, publico: true }];
      if (stage >= 1) comments.unshift({ text: 'Sinistro em Análise', date: r.aviso.replace(/\d\d:00$/, '23:11'), publico: false });
      caseState.set(r.numero, { stage, comments, following: false, showAll: false, tab: 'detalhes', open: true });
    }
    return caseState.get(r.numero);
  }

  function toast(message, variant = 'success') {
    const t = el('div', { class: 'toast toast-' + variant, role: 'status' }, [
      el('span', { text: message }),
      el('button', { type: 'button', class: 'toast-close', 'aria-label': 'Fechar', onclick: () => t.remove() }, '×')
    ]);
    document.getElementById('toasts').append(t);
    setTimeout(() => t.remove(), 4000);
  }

  function nowStamp() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function field(label, value, opts = {}) {
    return el('div', { class: 'field' + (opts.full ? ' field-full' : '') }, [
      el('span', { class: 'field-label', text: label }),
      el('span', { class: 'field-value' + (opts.link ? ' is-link' : '') }, [opts.icon || null, value])
    ]);
  }

  function setStage(r, cs, stage, note) {
    cs.stage = stage;
    cs.comments.unshift({ text: note || STAGES[stage], date: nowStamp(), publico: false });
    toast(`Caso ${r.caso}: status alterado para "${STAGES[stage]}".`);
    renderCase(r.numero);
  }

  function solicitarModal(r, cs) {
    const checks = DOCS.map(d => el('label', { class: 'check-row' }, [el('input', { type: 'checkbox', value: d }), d]));
    const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    const send = el('button', { type: 'button', class: 'btn-brand', text: 'Enviar solicitação', onclick: () => {
      const docs = checks.map(c => c.querySelector('input')).filter(i => i.checked).map(i => i.value);
      if (!docs.length) { err.hidden = false; return; }
      close();
      setStage(r, cs, 3, 'Documentação solicitada: ' + docs.join(', '));
    } });
    const err = el('p', { class: 'form-error', text: 'Selecione ao menos um documento.', hidden: '' });
    const overlay = el('div', { class: 'modal-backdrop', onclick: e => { if (e.target === overlay) close(); } },
      el('section', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'modal-title' }, [
        el('header', {}, [
          el('h2', { id: 'modal-title', text: 'Solicitar documentação' }),
          el('button', { type: 'button', class: 'modal-close', 'aria-label': 'Fechar', onclick: close }, '×')
        ]),
        el('div', { class: 'modal-body' }, [
          el('p', { text: `Selecione os documentos que ${r.nome} deve enviar para o caso ${r.caso}.` }),
          ...checks, err
        ]),
        el('footer', {}, [el('button', { type: 'button', class: 'btn-neutral', text: 'Cancelar', onclick: close }), send])
      ]));
    document.body.append(overlay);
    document.addEventListener('keydown', onKey);
    checks[0].querySelector('input').focus();
  }

  function renderCase(numero) {
    const r = findCase(numero);
    if (!r) return renderPlaceholder('#/caso/' + numero);
    const cs = getCaseState(r);
    const view = D.listViews.find(v => v.id === r.viewId);
    const [descAviso, descDanos] = DESCRICOES[r.natureza] || DESCRICOES['Colisão'];
    const notReady = () => toast('Ação não disponível neste protótipo.', 'info');

    const wsLink = document.getElementById('ws-tab-link');
    wsLink.textContent = `${r.caso} | Case`;
    wsLink.href = '#/caso/' + r.numero;

    // Path
    const path = el('ol', { class: 'path' }, STAGES.map((s, i) => {
      const status = i < cs.stage || cs.stage === STAGES.length - 1 ? 'complete' : i === cs.stage ? 'current' : 'incomplete';
      return el('li', { class: 'path-step is-' + status },
        el('button', { type: 'button', title: s, 'aria-current': status === 'current' ? 'step' : null,
          onclick: () => { if (i !== cs.stage) setStage(r, cs, i); } },
          status === 'complete' && i !== cs.stage
            ? el('span', { class: 'path-check', 'aria-label': s + ' (concluída)' })
            : el('span', { class: 'path-label', text: s })));
    }));

    // Detalhes
    const section = el('div', { class: 'section' + (cs.open ? ' is-open' : '') }, [
      el('button', { type: 'button', class: 'section-title', 'aria-expanded': String(cs.open), onclick: () => {
        cs.open = !cs.open;
        section.classList.toggle('is-open', cs.open);
        section.firstChild.setAttribute('aria-expanded', String(cs.open));
      } }, [el('img', { src: 'assets/section-chevron.svg', alt: '', width: 16, height: 16 }), 'Dados Básicos']),
      el('div', { class: 'section-body' }, [
        el('div', { class: 'field-row' }, field('Nome da Conta', r.nome, { link: true, full: true,
          icon: el('span', { class: 'avatar-xs' }, el('img', { src: 'assets/user.svg', alt: '' })) })),
        el('div', { class: 'field-row cols-2' }, [field('Informante', r.nome), field('Tipo de Informante', 'Segurado')]),
        el('div', { class: 'field-row cols-2' }, [
          field('Telefone celular', '+55 (11) 9999-9999', { link: true, icon: el('img', { src: 'assets/call.svg', alt: '', width: 16, height: 16 }) }),
          field('Telefone Residencial', '+55 (11) 9999-9999', { link: true, icon: el('img', { src: 'assets/call.svg', alt: '', width: 16, height: 16 }) })
        ]),
        el('div', { class: 'field-row cols-2' }, [field('Alguém se feriu no acidente?', r.lesao === 'Leve' && r.natureza === 'Colisão' ? 'Não' : 'Sim')]),
        el('label', { class: 'textarea-field' }, [el('span', { class: 'field-label', text: 'Descrição do aviso' }),
          el('textarea', { rows: 3, readonly: '', text: descAviso })]),
        el('label', { class: 'textarea-field' }, [el('span', { class: 'field-label', text: 'Descrição dos Danos' }),
          el('textarea', { rows: 3, readonly: '', text: descDanos })])
      ])
    ]);

    const docsPanel = el('div', { class: 'docs-empty' }, [
      el('p', { text: cs.stage >= 3 ? 'Documentação solicitada. Aguardando envio do segurado.' : 'Nenhum documento anexado a este caso.' }),
      el('button', { type: 'button', class: 'btn-neutral', text: 'Solicitar documentação', onclick: () => solicitarModal(r, cs) })
    ]);

    const tabs = [['detalhes', 'Detalhes'], ['documentos', 'Documentos']];
    const tabBar = el('div', { class: 'tabs', role: 'tablist' }, tabs.map(([id, label]) =>
      el('button', { type: 'button', role: 'tab', 'aria-selected': String(cs.tab === id), id: 'tab-' + id,
        onclick: () => { cs.tab = id; renderCase(r.numero); } }, label)));

    // Comments
    const shown = cs.showAll ? cs.comments : cs.comments.slice(0, 2);
    const newForm = el('form', { class: 'comment-form', hidden: '', onsubmit: e => {
      e.preventDefault();
      const ta = newForm.querySelector('textarea');
      if (!ta.value.trim()) return ta.focus();
      cs.comments.unshift({ text: ta.value.trim(), date: nowStamp(), publico: newForm.querySelector('input').checked });
      toast('Comentário adicionado.');
      renderCase(r.numero);
    } }, [
      el('textarea', { rows: 3, placeholder: 'Escreva um comentário…', 'aria-label': 'Comentário' }),
      el('label', { class: 'check-row' }, [el('input', { type: 'checkbox' }), 'Publico']),
      el('div', { class: 'form-actions' }, [
        el('button', { type: 'button', class: 'btn-neutral', text: 'Cancelar', onclick: () => { newForm.hidden = true; } }),
        el('button', { type: 'submit', class: 'btn-brand', text: 'Salvar' })
      ])
    ]);
    const commentsMenu = el('div', { class: 'row-menu' }, [
      el('button', { type: 'button', class: 'card-menu-btn dark', 'aria-haspopup': 'menu', 'aria-label': 'Ações de comentários',
        onclick: e => { e.stopPropagation(); e.currentTarget.nextSibling.hidden = !e.currentTarget.nextSibling.hidden; } },
        el('img', { src: 'assets/row-menu.svg', alt: '' })),
      el('div', { class: 'menu menu-right', role: 'menu', hidden: '' }, [
        el('a', { role: 'menuitem', href: 'javascript:void 0', text: 'Novo comentário', onclick: () => {
          newForm.hidden = false; newForm.querySelector('textarea').focus();
        } })
      ])
    ]);

    app.replaceChildren(el('div', { class: 'case-page' }, [
      workspaceTabs(r, view, 'case'),
      el('div', { class: 'case-content' }, [
        el('section', { class: 'record-header' }, [
          el('div', { class: 'page-header' }, [
            el('div', { class: 'page-title' }, [
              el('img', { class: 'obj-icon', src: 'assets/case-standard.svg', alt: '' }),
              el('div', {}, [el('small', { text: 'Case' }), el('h1', {}, [r.caso,
                el('button', { type: 'button', class: 'icon-btn-xs', 'aria-label': 'Hierarquia', onclick: notReady },
                  el('img', { src: 'assets/share.svg', alt: '' }))])])
            ]),
            el('div', { class: 'header-actions' }, [
              el('button', { type: 'button', class: 'btn-follow' + (cs.following ? ' is-on' : ''), 'aria-pressed': String(cs.following),
                onclick: () => { cs.following = !cs.following; toast(cs.following ? `Você está seguindo o caso ${r.caso}.` : 'Você deixou de seguir o caso.', 'info'); renderCase(r.numero); } },
                [cs.following ? el('span', { class: 'tick' }) : el('img', { src: 'assets/add-brand.svg', alt: '', width: 16, height: 16 }), cs.following ? 'Following' : 'Follow']),
              el('div', { class: 'btn-group' }, [
                el('button', { type: 'button', class: 'btn btn-mid', text: 'Edit', onclick: notReady }),
                el('button', { type: 'button', class: 'btn btn-mid', text: 'Start Conversation', onclick: notReady }),
                el('button', { type: 'button', class: 'btn btn-mid', text: 'New Opportunity', onclick: notReady }),
                el('button', { type: 'button', class: 'btn-icon', 'aria-label': 'Mais ações', onclick: notReady }, el('img', { src: 'assets/caret.svg', alt: '' }))
              ])
            ])
          ]),
          el('div', { class: 'highlights' }, [
            field('Criticidade', r.prioridade),
            field('Data do Sinistro', r.sinistroData),
            field('Data do Aviso', r.aviso),
            field('Dentro da vigência', 'Sim', { link: true }),
            field('Tempo Decorrido', `${1 + (parseInt(r.caso, 10) % 5)} Dias`, { link: true }),
            field('Status', STAGE_STATUS[cs.stage], { link: true })
          ])
        ]),
        el('section', { class: 'bar-card' }, el('div', { class: 'path-wrap' }, path)),
        el('section', { class: 'bar-card actions-bar' }, [
          el('button', { type: 'button', class: 'btn-brand', text: 'Analisar', disabled: cs.stage > 1 ? '' : null,
            title: cs.stage > 1 ? 'Disponível para casos aguardando análise ou em análise' : null,
            onclick: () => { location.hash = `#/analise/${r.numero}/${cs.wiz ? cs.wiz.step : 1}`; } }),
          el('button', { type: 'button', class: 'btn-brand', text: 'Solicitar', disabled: cs.stage === 7 ? '' : null,
            onclick: () => solicitarModal(r, cs) })
        ]),
        el('div', { class: 'case-columns' }, [
          el('section', { class: 'detail-card' }, [tabBar,
            el('div', { class: 'tab-panel', role: 'tabpanel', 'aria-labelledby': 'tab-' + cs.tab },
              cs.tab === 'detalhes' ? section : docsPanel)]),
          el('aside', { class: 'side-col' }, [
            el('section', { class: 'side-card' }, [
              el('header', {}, [
                el('h2', {}, [el('span', { class: 'std-icon yellow' }, el('img', { src: 'assets/case-glyph.svg', alt: '' })), 'Resumo do Sinistro']),
                el('button', { type: 'button', class: 'card-menu-btn', 'aria-label': 'Ações do resumo', onclick: notReady }, el('img', { src: 'assets/card-menu.svg', alt: '' }))
              ]),
              el('div', { class: 'side-fields' }, [
                el('div', { class: 'field-row cols-2' }, [field('Segmento', r.segmento), field('Nível de Dano', r.lesao)]),
                el('div', { class: 'field-row cols-2' }, [field('Num Apólice', r.apolice, { link: true }), field('Numero Sinistro', r.numero, { link: true })]),
                field('Data Aviso', r.aviso, { full: true }),
                field('Segurado', r.nome, { full: true })
              ])
            ]),
            el('section', { class: 'side-card comments' }, [
              el('header', { class: 'is-gray' }, [
                el('h2', {}, [el('img', { src: 'assets/maintenance.svg', alt: '', width: 24, height: 24 }), `Case Comments (${cs.comments.length})`]),
                commentsMenu
              ]),
              newForm,
              ...shown.map(c => el('article', { class: 'comment' }, [
                el('div', { class: 'comment-head' }, [
                  el('img', { src: 'assets/astro.svg', alt: '', width: 40, height: 40 }),
                  el('a', { href: 'javascript:void 0', text: 'Test Admin' }),
                  el('img', { src: 'assets/dropdown-lg.svg', alt: '', width: 20, height: 20, class: 'comment-menu' })
                ]),
                el('label', { class: 'check-row' }, [el('input', { type: 'checkbox', ...(c.publico ? { checked: '' } : {}),
                  onchange: e => { c.publico = e.target.checked; } }), 'Publico']),
                el('p', { text: 'Created Date:  ' + c.date }),
                el('p', { text: 'Comment:  ' + c.text })
              ])),
              cs.comments.length > 2 && el('button', { type: 'button', class: 'view-all', text: cs.showAll ? 'View Less' : 'View All',
                onclick: () => { cs.showAll = !cs.showAll; renderCase(r.numero); } })
            ])
          ])
        ])
      ])
    ]));
    // On narrow screens the path scrolls sideways; keep the current step in view.
    const current = app.querySelector('.path-step.is-current');
    if (current) app.querySelector('.path-wrap').scrollLeft = current.offsetLeft - 16;
  }

  // ---- Workspace subtabs shared by the case, the analysis wizard and the extrato
  function workspaceTabs(r, view, active) {
    const cs = getCaseState(r);
    const icon = name => el('img', { src: `assets/${name}.svg`, alt: '', width: 14, height: 14 });
    // Closing a tab only hides it; the wizard keeps its progress for when Analisar is clicked again.
    const onClose = { wizard: () => { cs.wizTabClosed = true; cs.extratoOpen = false; }, extrato: () => { cs.extratoOpen = false; } };
    const close = (id, href, label) => el('a', { href, class: 'subtab-close', 'aria-label': label, onclick: onClose[id] },
      el('img', { src: 'assets/close.svg', alt: '', width: 10, height: 10 }));
    const tab = (id, href, content, closeHref, closeLabel) => id === active
      ? el('span', { class: 'subtab is-active', 'aria-current': 'page' }, [...content, closeHref && close(id, closeHref, closeLabel)])
      : el('a', { class: 'subtab', href }, content);
    const wizStep = cs.wiz ? cs.wiz.step : 1;
    return el('nav', { class: 'subtabs', 'aria-label': 'Abas do workspace' }, [
      tab('list', '#/lista/' + r.viewId, [icon('table'), view.label]),
      tab('case', '#/caso/' + r.numero, [icon('case'), `${r.caso} | Case`], '#/lista/' + r.viewId, 'Fechar caso e voltar à lista'),
      cs.wiz && !cs.wizTabClosed && tab('wizard', `#/analise/${r.numero}/${wizStep}`, [icon('case'), 'Analisar Sinistro'],
        '#/caso/' + r.numero, 'Fechar análise e voltar ao caso'),
      cs.extratoOpen && tab('extrato', `#/analise/${r.numero}/extrato`, [icon('money'), 'Extrato Utilização'],
        `#/analise/${r.numero}/${wizStep}`, 'Fechar extrato')
    ]);
  }

  // ---- Analysis wizard (Analisar): Aviso → Apólice → Resumo → Parecer, plus the Extrato subtab
  const WIZ_STEPS = ['Aviso', 'Apólice', 'Resumo', 'Parecer e continuidade do processo'];
  const WIZ_TITLES = ['Aviso', 'Apólice', 'Resumo', 'Parecer'];
  const CHECKS = ['Conferi os dados do Aviso', 'Conferi os dados da Apólice', 'Conferi o Resumo e parecer'];
  const DECISOES = [
    { label: 'Interna - Analista Porto', stage: 2, note: 'Regulação interna (Analista Porto)' },
    { label: 'Externa - Com prestador', stage: 2, note: 'Regulação externa (com prestador)' },
    { label: 'Sindicância', stage: 5, note: 'Encaminhado para sindicância' },
    { label: 'Recusar', stage: 7, note: 'Sinistro recusado' },
    { label: 'Solicitar Documentos', stage: 3, note: 'Documentação solicitada ao segurado' }
  ];

  const slug = name => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '');
  const money = n => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Demo data for the wizard, derived from the case row so each case reads consistently.
  function analysisData(r) {
    const rnd = seeded('analise' + r.numero);
    const pick = arr => arr[Math.floor(rnd() * arr.length)];
    const segurado = pick(D.pools.nomes.filter(n => n !== r.nome));
    const condutor = pick(D.pools.nomes.filter(n => n !== r.nome && n !== segurado));
    const [descAviso, descLesao] = DESCRICOES[r.natureza] || DESCRICOES['Colisão'];
    const apolice = r.apolice.split('-')[1];
    const empresaCurta = r.empresa.split(' ')[0].replace(/^./, c => c.toUpperCase());
    return {
      empresa: empresaCurta, apolice, segurado, condutor,
      corretor: 'Jose da Silva', analista: 'João Silva', analistaParecer: 'Raphaella Pereira',
      vitimaEmail: slug(r.nome) + '@gmail.com', seguradoEmail: slug(segurado) + '@uol.com.br',
      descAviso, descLesao,
      vigenciaFim: r.sinistroData,
      culpado: rnd() > 0.5 ? 'Sim' : 'Não', bo: rnd() > 0.3 ? 'Sim' : 'Não',
      endereco: { territorio: 'Nacional', cep: '04' + (100 + Math.floor(rnd() * 800)) + '-' + (100 + Math.floor(rnd() * 800)),
        rua: pick(['Rua Eça de Queiroz', 'Av. Paulista', 'Rua Vergueiro', 'Rua Domingos de Morais']),
        numero: String(10 + Math.floor(rnd() * 990)), bairro: pick(['Vila Mariana', 'Paraíso', 'Bela Vista', 'Aclimação']),
        cidade: 'São Paulo', estado: 'SP' },
      ocorrencias: [
        { nome: r.nome, tipo: r.segmento, lesao: r.lesao },
        { nome: condutor, tipo: 'DC', lesao: 'Leve' }
      ],
      proposta: (16000 + Math.floor(rnd() * 900)) + '/' + (100 + Math.floor(rnd() * 900)),
      bonus: String(1 + Math.floor(rnd() * 10)),
      nascimento: `${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}/${String(1 + Math.floor(rnd() * 12)).padStart(2, '0')}/${1960 + Math.floor(rnd() * 35)}`,
      valores: [
        ['Importância Segurada Auto', 65607.63], ['Franquia Casco', 2928], ['Importância Segurada RC-DM', 50000],
        ['Franquia RC-DM', 50000], ['Importância Segurada RC-DP', 50000], ['Franquia RC-DP', 50000],
        ['Dano Moral', 50000], ['Dano corporal e APP', 50000]
      ],
      extrato: [
        { nome: condutor, tipo: 'DC', valor: 10000, desc: 'Medicamentos' },
        { nome: condutor, tipo: 'DC', valor: 20000, desc: 'Despesas Médicas' },
        { nome: condutor, tipo: 'DC', valor: 20000, desc: 'Internação' }
      ],
      pagamento: '10/06/2024 11:00',
      parecer: 'Descrições compatíveis, se trata de acidente em cruzamento sem sinalização. Conforme danos do veículo segurado, preferencial do terceiro. Processo liberado'
    };
  }

  function section(title, children, cs, key) {
    cs.sections = cs.sections || {};
    const open = cs.sections[key] !== false;
    const wrap = el('div', { class: 'section' + (open ? ' is-open' : '') }, [
      el('button', { type: 'button', class: 'section-title', 'aria-expanded': String(open), onclick: () => {
        cs.sections[key] = !wrap.classList.contains('is-open');
        wrap.classList.toggle('is-open', cs.sections[key]);
        wrap.firstChild.setAttribute('aria-expanded', String(cs.sections[key]));
      } }, [el('img', { src: 'assets/section-chevron.svg', alt: '', width: 16, height: 16 }), title]),
      el('div', { class: 'section-body' }, children)
    ]);
    return wrap;
  }

  const row2 = (...fields) => el('div', { class: 'field-row cols-2' }, fields);
  const phone = n => ({ link: true, icon: el('img', { src: 'assets/call.svg', alt: '', width: 16, height: 16 }) });
  const textareaField = (label, value) => el('label', { class: 'textarea-field' }, [
    el('span', { class: 'field-label', text: label }), el('textarea', { rows: 3, readonly: '', text: value })]);

  function relatedList({ icon, title, columns, rows, onViewAll, menu = true }) {
    return el('section', { class: 'related' }, [
      el('header', {}, [el('img', { src: `assets/${icon}.svg`, alt: '', width: 32, height: 32 }), el('h3', { text: title })]),
      el('div', { class: 'related-scroll' }, el('table', { class: 'related-table' }, [
        el('thead', {}, el('tr', {}, [...columns.map(c => el('th', { text: c })), menu && el('th', { 'aria-label': 'Ações' })])),
        el('tbody', {}, rows.map(cells => el('tr', {}, [
          ...cells.map(c => el('td', {}, c instanceof Node ? c : el('a', { href: 'javascript:void 0', text: c }))),
          menu && el('td', { class: 'col-action' }, el('span', { class: 'icon-btn-xs' }, el('img', { src: 'assets/row-menu.svg', alt: '' })))
        ])))
      ])),
      onViewAll && el('button', { type: 'button', class: 'view-all', text: 'View All', onclick: onViewAll })
    ]);
  }

  function renderAnalise(numero, stepParam) {
    const r = findCase(numero);
    if (!r) return renderPlaceholder('#/analise/' + numero);
    const cs = getCaseState(r);
    const view = D.listViews.find(v => v.id === r.viewId);
    const a = analysisData(r);
    const notReady = () => toast('Ação não disponível neste protótipo.', 'info');

    if (cs.stage > 1 && !cs.wiz) { location.replace('#/caso/' + r.numero); return; }
    if (!cs.wiz) {
      cs.wiz = { step: 1, max: 1, parecer: a.parecer, checks: CHECKS.map(() => false), decisao: null };
      if (cs.stage === 0) {
        cs.stage = 1;
        cs.comments.unshift({ text: 'Sinistro em Análise', date: nowStamp(), publico: false });
      }
    }
    const isExtrato = stepParam === 'extrato';
    const step = isExtrato ? cs.wiz.step : Math.min(Math.max(parseInt(stepParam, 10) || 1, 1), cs.wiz.max);
    if (!isExtrato && String(step) !== stepParam) { location.replace(`#/analise/${r.numero}/${step}`); return; }
    cs.wizTabClosed = false;
    if (isExtrato) cs.extratoOpen = true; else cs.wiz.step = step;

    const wsLink = document.getElementById('ws-tab-link');
    wsLink.textContent = `${r.caso} | Case`;
    wsLink.href = '#/caso/' + r.numero;

    const go = n => { cs.wiz.max = Math.max(cs.wiz.max, n); location.hash = `#/analise/${r.numero}/${n}`; };
    const openExtrato = () => { location.hash = `#/analise/${r.numero}/extrato`; };
    const apoliceLink = () => el('a', { href: `#/analise/${r.numero}/extrato`, class: 'field-link', text: a.apolice,
      title: 'Abrir extrato de utilização da apólice' });

    const header = el('section', { class: 'record-header' }, [
      el('div', { class: 'page-header' }, [
        el('div', { class: 'page-title' }, [
          el('img', { class: 'obj-icon', src: 'assets/new-task.svg', alt: '' }),
          el('div', {}, [el('small', { text: 'Análise Sinistro' }), el('h1', {}, [r.caso,
            el('button', { type: 'button', class: 'icon-btn-xs', 'aria-label': 'Hierarquia', onclick: notReady },
              el('img', { src: 'assets/share.svg', alt: '' }))])])
        ]),
        el('div', { class: 'header-actions' }, [
          el('button', { type: 'button', class: 'btn-follow' + (cs.following ? ' is-on' : ''), 'aria-pressed': String(cs.following),
            onclick: () => { cs.following = !cs.following; renderAnalise(numero, stepParam); } },
            [cs.following ? el('span', { class: 'tick' }) : el('img', { src: 'assets/add-brand.svg', alt: '', width: 16, height: 16 }), cs.following ? 'Following' : 'Follow']),
          el('div', { class: 'btn-group' }, [
            el('button', { type: 'button', class: 'btn btn-mid', text: 'Edit', onclick: notReady }),
            el('button', { type: 'button', class: 'btn btn-mid', text: 'Start Conversation', onclick: notReady }),
            el('button', { type: 'button', class: 'btn btn-mid', text: 'New Opportunity', onclick: notReady }),
            el('button', { type: 'button', class: 'btn-icon', 'aria-label': 'Mais ações', onclick: notReady }, el('img', { src: 'assets/caret.svg', alt: '' }))
          ])
        ])
      ]),
      el('div', { class: 'highlights' }, [
        field('Empresa', a.empresa), field('Produto', r.produto), field('Segmento', r.segmento), field('Ramo', 'Convencional'),
        field('Num. Sinistro', r.numero), field('Natureza', r.natureza), field('Analista Responsável', a.analista),
        field('Dentro da vigência', 'Sim', { link: true }), field('Criticidade', r.prioridade, { link: true }),
        field('Tempo Decorrido', `${1 + (parseInt(r.caso, 10) % 5)} Dias`, { link: true }),
        field('Status', STAGE_STATUS[cs.stage], { link: true })
      ])
    ]);

    let body;
    if (isExtrato) {
      body = el('section', { class: 'wizard-card full' }, relatedList({
        icon: 'money', title: 'Extrato de Utilização',
        columns: ['Nome', 'Tipo', 'Valor Pago', 'Descrição', 'Data do Pagamento', 'Comprovante de pagamento'],
        rows: a.extrato.map(e => [e.nome, e.tipo, money(e.valor), e.desc, a.pagamento,
          el('a', { href: 'javascript:void 0', text: 'Visualizar', onclick: () => toast('Comprovante: ' + e.desc + ' (' + money(e.valor) + ')', 'info') })])
      }));
    } else {
      const nav = (nextLabel, onNext) => el('div', { class: 'wizard-nav' }, [
        el('button', { type: 'button', class: 'btn-neutral', text: 'Voltar',
          onclick: () => { location.hash = step === 1 ? '#/caso/' + r.numero : `#/analise/${r.numero}/${step - 1}`; } }),
        el('button', { type: 'button', class: 'btn-brand', text: nextLabel, onclick: onNext })
      ]);
      let content;
      if (step === 1) {
        content = [
          section('Informações do Aviso', [
            row2(field('Nome da Vitima', r.nome), field('Nível de Dano', r.lesao)),
            row2(field('Telefone', '11-9999-9999'), field('Email', a.vitimaEmail)),
            textareaField('Descrição das Lesões', a.descLesao),
            textareaField('Descrição do aviso', a.descAviso),
            row2(field('Data/hora do Sinistro', r.sinistroData), field('Data/hora do Aviso', r.aviso)),
            row2(field('Data/hora Final da Vigência', a.vigenciaFim), field('Dentro da vigência', 'Sim')),
            row2(field('O condutor se considera culpado', a.culpado), field('Registrou BO?', a.bo))
          ], cs, 'aviso'),
          section('Endereço da Ocorrência', [
            row2(field('Território', a.endereco.territorio), field('CEP', a.endereco.cep)),
            el('div', { class: 'field-row' }, field('Endereço do sinistro', a.endereco.rua, { full: true })),
            row2(field('Número', a.endereco.numero), field('Bairro', a.endereco.bairro)),
            row2(field('Cidade', a.endereco.cidade), field('Estado', a.endereco.estado)),
            el('div', { class: 'field-row' }, field('Complemento', '', { full: true }))
          ], cs, 'endereco'),
          relatedList({ icon: 'car', title: 'Ocorrências Relacionadas', columns: ['Item/Pessoa', 'Tipo/Natureza', 'Tipo Lesão', 'Telefone de contato'],
            rows: a.ocorrencias.map(o => [o.nome, o.tipo, o.lesao, '(11) 9999-9999']), onViewAll: notReady }),
          nav('Próximo', () => go(2))
        ];
      } else if (step === 2) {
        content = [
          section('Dados da apólice', [
            row2(field('Num. Apólice', apoliceLink()), field('Sucursal', '99')),
            row2(field('Proposta Origem/Número', a.proposta), field('Classe de Bônus', a.bonus)),
            row2(field('Nome do Segurado', a.segurado), field('Data de Nascimento', a.nascimento)),
            row2(field('Nome do Principal Condutor', a.condutor), field('Cep onde o veículo pernoita', a.endereco.cep.replace('-', ''))),
            row2(field('Telefone celular', '+55 (11) 9999-9999', phone()), field('Email', a.seguradoEmail)),
            row2(field('Nome do Corretor', a.corretor), field('Telefone Comercial', '+55 (11) 9999-9999', phone()))
          ], cs, 'apolice'),
          relatedList({ icon: 'money', title: 'Valores', columns: ['Item', 'Valor'],
            rows: a.valores.map(([k, v]) => [k, money(v)]), onViewAll: notReady }),
          nav('Próximo', () => go(3))
        ];
      } else if (step === 3) {
        const usado = a.extrato.reduce((s, e) => s + e.valor, 0);
        content = [
          section('Dados do seguro', [
            row2(field('Seguradora', a.empresa), field('Ramo', '553')),
            row2(field('Cobertura Reclamada', 'APP/DC'), field('Apólice', apoliceLink())),
            row2(field('Data Ocorrência', r.sinistroData), field('Data do Aviso', r.aviso)),
            row2(field('Nome do Segurado', a.segurado), field('Nome do Principal Condutor', a.condutor)),
            row2(field('Nome do Corretor', a.corretor)),
            row2(field('Telefone celular', '+55 (11) 9999-9999', phone()), field('Email', slug(a.corretor) + '@gmail.com')),
            row2(field('Nome do Analista', a.analistaParecer), field('Email Analista', slug(a.analistaParecer) + '@gmail.com'))
          ], cs, 'seguro'),
          section('Dados da vítima', [
            row2(field('Nome da Vitima', r.nome), field('Nível de Dano', r.lesao)),
            row2(field('Telefone', '11-9999-9999'), field('Email', a.vitimaEmail)),
            textareaField('Descrição das Lesões', a.descLesao)
          ], cs, 'vitima'),
          section('Valores durante a vigência', [
            row2(field('Importância Segurada Danos Morais', '0'), field('Importância Segurada Danos Corporais', money(150000))),
            row2(field('Saldo Importância Segurada Danos Morais', '0'), field('Saldo Importância Segurada Danos Corporais', money(150000 - usado)))
          ], cs, 'valores'),
          relatedList({ icon: 'money', title: 'Extrato de Utilização', columns: ['Nome', 'Tipo', 'Valor Pago'], menu: false,
            rows: a.extrato.slice(0, 2).map(e => [e.nome, e.tipo, money(e.valor)]), onViewAll: openExtrato }),
          nav('Próximo', () => go(4))
        ];
      } else {
        const w = cs.wiz;
        const err = el('p', { class: 'form-error', hidden: '', role: 'alert' });
        const ta = el('textarea', { rows: 3, id: 'parecer', text: w.parecer, oninput: e => { w.parecer = e.target.value; } });
        content = [
          section('Anotações e Parecer do Sinistro', [
            el('label', { class: 'textarea-field' }, [el('span', { class: 'field-label', text: 'Parecer do Sinistro' }), ta]),
            el('div', { class: 'check-list' }, CHECKS.map((c, i) => el('label', { class: 'check-row' }, [
              el('input', { type: 'checkbox', ...(w.checks[i] ? { checked: '' } : {}), onchange: e => { w.checks[i] = e.target.checked; } }), c])))
          ], cs, 'parecer'),
          section('Continuidade do processo', [
            el('div', { class: 'check-list', role: 'radiogroup', 'aria-label': 'Continuidade do processo' }, DECISOES.map((d, i) =>
              el('label', { class: 'check-row' }, [el('input', { type: 'radio', name: 'decisao', ...(w.decisao === i ? { checked: '' } : {}),
                onchange: () => { w.decisao = i; } }), d.label])))
          ], cs, 'continuidade'),
          err,
          nav('Continuar', () => {
            const missing = [];
            if (!w.parecer.trim()) missing.push('escreva o parecer');
            if (w.checks.some(c => !c)) missing.push('confirme as 3 conferências');
            if (w.decisao == null) missing.push('escolha a continuidade do processo');
            if (missing.length) { err.textContent = 'Para continuar, ' + missing.join(', ') + '.'; err.hidden = false; return; }
            const d = DECISOES[w.decisao];
            cs.stage = d.stage;
            cs.comments.unshift({ text: 'Parecer: ' + w.parecer.trim(), date: nowStamp(), publico: false });
            cs.comments.unshift({ text: d.note, date: nowStamp(), publico: false });
            cs.wiz = null;
            cs.extratoOpen = false;
            toast(`Análise do caso ${r.caso} concluída: ${d.label}.`);
            location.hash = '#/caso/' + r.numero;
          })
        ];
      }

      const progress = el('aside', { class: 'wizard-progress' }, [
        el('h2', { text: WIZ_TITLES[step - 1] }),
        el('ol', {}, WIZ_STEPS.map((s, i) => {
          const n = i + 1;
          const state = n < step || (n <= cs.wiz.max && n !== step) ? 'done' : n === step ? 'current' : 'todo';
          const label = el('span', { text: s });
          return el('li', { class: 'is-' + state, 'aria-current': n === step ? 'step' : null },
            n <= cs.wiz.max && n !== step
              ? el('a', { href: `#/analise/${r.numero}/${n}` }, [el('i'), label])
              : el('span', { class: 'step-static' }, [el('i'), label]));
        }))
      ]);
      body = el('div', { class: 'wizard-columns' }, [
        el('section', { class: 'wizard-card' }, [el('h2', { class: 'wizard-title', text: WIZ_TITLES[step - 1] }), ...content]),
        progress
      ]);
    }

    app.replaceChildren(el('div', { class: 'case-page' }, [
      workspaceTabs(r, view, isExtrato ? 'extrato' : 'wizard'),
      el('div', { class: 'case-content' }, [header, body])
    ]));
  }

  function renderPlaceholder(hash) {
    const name = decodeURIComponent(hash.replace(/^#\//, '')).replace(/[\/-]/g, ' ');
    app.replaceChildren(el('section', { class: 'placeholder' }, [
      el('h1', { text: 'Próxima tela: ' + name }),
      el('p', { text: 'Esta tela ainda não foi construída no protótipo.' }),
      el('a', { href: '#/dashboard', text: '← Voltar ao dashboard' })
    ]));
  }

  window.addEventListener('hashchange', router);
  router();
})();
