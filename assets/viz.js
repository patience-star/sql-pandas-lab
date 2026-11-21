'use strict';
/* 概念可视化（分步动画 / 切换演示）与结果图表 */
const VIZ = {};
const vesc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- 小工具 ---------- */
// 迷你表格：o.rc(i) 行样式，o.cc(i,j) 单元格样式，o.hc(j) 表头样式，o.ix 索引列，o.nul 空值显示
function mini(cols, rows, o = {}) {
  const nul = o.nul || 'NULL';
  const head = `${o.ix ? `<th class="ix ${o.ihc || ''}">${o.ixName || ''}</th>` : ''}${cols.map((c, j) => `<th class="${o.hc?.(j) || ''}">${c}</th>`).join('')}`;
  const body = rows.map((r, i) => `<tr class="${o.rc?.(i) || ''}">${o.ix ? `<td class="ix ${o.ixc?.(i) || ''}">${o.ix[i]}</td>` : ''}${r.map((v, j) => `<td class="${o.cc?.(i, j) || ''}">${v === null || v === undefined ? `<span class="null">${nul}</span>` : v}</td>`).join('')}</tr>`).join('');
  return `<table class="mini"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}
const col = (label, html) => `<div class="viz-col"><span class="lbl">${label}</span>${html}</div>`;
const row = (...parts) => `<div class="viz-row">${parts.join('')}</div>`;
const arrow = (t = '→') => `<span class="arrow">${t}</span>`;
const code2 = (sql, py) => `<pre class="qcode">${sql ? `<span style="color:var(--faint)">SQL   </span>${vesc(sql)}` : ''}${sql && py ? '\n' : ''}${py ? `<span style="color:var(--faint)">pandas</span> ${vesc(py)}` : ''}</pre>`;
const pct = v => (v * 100).toFixed(1) + '%';

function frame(el, title, tag, cls) {
  el.className = `viz ${cls || ''}`;
  el.innerHTML = `<div class="viz-head"><span class="tag">${tag}</span><b>${title}</b><span class="cnt"></span></div><div class="viz-stage"></div><div class="viz-cap"></div><div class="viz-ctrl"></div>`;
  return { stage: el.querySelector('.viz-stage'), cap: el.querySelector('.viz-cap'), ctrl: el.querySelector('.viz-ctrl'), cnt: el.querySelector('.viz-cnt, .cnt') };
}
function modeOf(d, def = 'sql') { return (d && d.mode) || def; }
const tagOf = m => (m === 'py' ? 'pandas' : m === 'both' ? 'SQL · pandas' : 'SQL');
const clsOf = m => (m === 'py' ? 't-py' : 't-sql');

// 分步动画：steps = [{html, cap}]
function stepper(el, title, tag, steps, cls) {
  const f = frame(el, title, tag, cls);
  let k = 0, timer = null;
  f.ctrl.innerHTML = `<button class="btn" data-s="prev" aria-label="上一步">${ICON.prev}</button><button class="btn primary" data-s="next">下一步 ${ICON.next}</button><button class="btn ghost" data-s="play">${ICON.play2}<span>自动播放</span></button><span class="dots">${steps.map((_, i) => `<i data-i="${i}"></i>`).join('')}</span>`;
  const show = () => {
    f.stage.innerHTML = steps[k].html;
    f.cap.innerHTML = steps[k].cap;
    f.cnt.textContent = `${k + 1} / ${steps.length}`;
    f.ctrl.querySelectorAll('.dots i').forEach((d, i) => d.classList.toggle('on', i === k));
    f.ctrl.querySelector('[data-s="prev"]').disabled = k === 0;
    f.ctrl.querySelector('[data-s="next"]').disabled = k === steps.length - 1 && !timer;
  };
  const stop = () => { clearInterval(timer); timer = null; f.ctrl.querySelector('[data-s="play"]').innerHTML = `${ICON.play2}<span>自动播放</span>`; };
  f.ctrl.onclick = e => {
    const b = e.target.closest('[data-s],[data-i]'); if (!b) return;
    if (b.dataset.i) { stop(); k = +b.dataset.i; }
    else if (b.dataset.s === 'prev') { stop(); k = Math.max(0, k - 1); }
    else if (b.dataset.s === 'next') { stop(); k = Math.min(steps.length - 1, k + 1); }
    else if (timer) stop();
    else {
      if (k === steps.length - 1) k = 0;
      b.innerHTML = `${ICON.pause}<span>暂停</span>`;
      timer = setInterval(() => { if (!el.isConnected || k >= steps.length - 1) return stop(), show(); k++; show(); }, 1900);
    }
    show();
  };
  show();
}
// 切换演示：opts = [{label, html, cap}]
function chooser(el, title, tag, opts, cls) {
  const f = frame(el, title, tag, cls);
  f.ctrl.innerHTML = `<div class="seg">${opts.map((o, i) => `<button data-i="${i}">${o.label}</button>`).join('')}</div>`;
  const show = i => {
    f.stage.innerHTML = opts[i].html; f.cap.innerHTML = opts[i].cap;
    f.ctrl.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', i === j));
  };
  f.ctrl.onclick = e => { const b = e.target.closest('button'); if (b) show(+b.dataset.i); };
  f.cnt.textContent = '点击切换';
  // 选项按钮放在舞台上方更直观
  f.stage.before(f.ctrl); f.ctrl.style.padding = '12px 16px 0';
  show(0);
}

/* ---------- 1. SQL 执行顺序 ---------- */
VIZ.order = el => {
  const Q = ['SELECT city, COUNT(*) AS n', 'FROM users', 'WHERE age >= 30', 'GROUP BY city', 'HAVING COUNT(*) >= 2', 'ORDER BY n DESC', 'LIMIT 1;'];
  const names = ['FROM', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'ORDER BY', 'LIMIT'];
  const qline = [1, 2, 3, 4, 0, 5, 6];
  const data = [[1, '北京', 25], [2, '上海', 34], [3, '北京', 41], [4, '广州', 30], [5, '上海', 28], [6, '北京', 36], [7, '广州', 22], [8, '上海', 45], [9, '北京', 52], [10, '深圳', 33]];
  const gc = { 北京: 'grp1', 上海: 'grp2', 广州: 'grp3', 深圳: 'grp4' };
  const kept = data.filter(r => r[2] >= 30);
  const grouped = ['北京', '上海', '广州', '深圳'].flatMap(c => kept.filter(r => r[1] === c));
  const counts = [['北京', 3], ['上海', 2], ['广州', 1], ['深圳', 1]];
  const H = ['user_id', 'city', 'age'];
  const tables = [
    mini(H, data),
    mini(H, data, { rc: i => (data[i][2] < 30 ? 'strike' : '') }),
    mini(H, grouped, { rc: i => gc[grouped[i][1]] }),
    mini(['city', 'COUNT(*)'], counts, { rc: i => (counts[i][1] < 2 ? 'strike' : gc[counts[i][0]]) }),
    mini(['city', 'n'], [['北京', 3], ['上海', 2]], { hc: () => 'new' }),
    mini(['city', 'n'], [['北京', 3], ['上海', 2]], { cc: (i, j) => (j === 1 ? 'hl' : '') }),
    mini(['city', 'n'], [['北京', 3]]),
  ];
  const caps = [
    '① <b>FROM</b>：先确定数据从哪张表来——拿到 users 的全部 10 行。',
    '② <b>WHERE</b>：逐行判断 <code>age >= 30</code>，不满足的 3 行被过滤。此时还没分组，所以 WHERE 里<b>不能用聚合函数</b>。',
    '③ <b>GROUP BY</b>：按 city 把剩下的 7 行分成 4 组。',
    '④ <b>HAVING</b>：对每组算 <code>COUNT(*)</code>，只保留 ≥ 2 的组。HAVING 就是“分组之后的 WHERE”。',
    '⑤ <b>SELECT</b>：到这一步才挑选输出列、起别名 n。所以 <b>WHERE 里不能用 SELECT 中起的别名</b>。',
    '⑥ <b>ORDER BY</b>：按 n 降序排列。它在 SELECT 之后执行，所以<b>可以</b>使用别名 n。',
    '⑦ <b>LIMIT</b>：最后只取前 1 行。记住口诀：<b>从哪来 → 筛行 → 分组 → 筛组 → 选列 → 排序 → 截取</b>。',
  ];
  const steps = names.map((_, k) => ({
    html: `<div class="chipline">${names.map((n, i) => `<span class="${i === k ? 'on' : i < k ? 'past' : ''}">${i + 1} ${n}</span>`).join('<i>→</i>')}</div>` +
      row(`<pre class="qcode">${Q.map((l, i) => `<span class="${i === qline[k] ? 'on' : ''}">${vesc(l)}</span>`).join('\n')}</pre>`, arrow(), tables[k]),
    cap: caps[k],
  }));
  stepper(el, '书写顺序 ≠ 执行顺序', 'SQL', steps, 't-sql');
};

/* ---------- 2. 条件过滤：WHERE / 布尔索引 ---------- */
VIZ.filter = (el, d) => {
  const m = modeOf(d);
  const py = m === 'py';
  const data = [['小王', '北京', 28], ['小李', '上海', 35], ['小张', '北京', 42], ['小赵', '广州', 31], ['小刘', '北京', 24]];
  const c1 = data.map(r => r[1] === '北京'), c2 = data.map(r => r[2] > 25), both = c1.map((v, i) => v && c2[i]);
  const T = py ? 'True' : '✓', F = py ? 'False' : '✗';
  const b = arr => arr.map(v => (v ? T : F));
  const bc = arr => i => (arr[i] ? 'good' : 'bad');
  const ix = py ? [0, 1, 2, 3, 4] : null;
  const base = mini(['name', 'city', 'age'], data, { ix });
  const flag = (name, arr) => mini([name], b(arr).map(v => [v]), { cc: bc(arr) });
  const L1 = py ? "df['city'] == '北京'" : "city = '北京'";
  const L2 = py ? "df['age'] > 25" : 'age > 25';
  const L3 = py ? 'm1 & m2' : '条件1 AND 条件2';
  const steps = [
    { html: row(col(py ? 'df' : 'users', base)), cap: py ? '要找“北京且年龄大于 25”的人。pandas 的思路：先算出一列 True/False（布尔序列），再用它去“筛”DataFrame。' : "要找“北京且年龄大于 25”的人：<code>SELECT * FROM users WHERE city = '北京' AND age > 25</code>。WHERE 会对<b>每一行</b>判断条件是否成立。" },
    { html: row(col(py ? 'df' : 'users', base), col(py ? 'm1' : '条件1', flag(L1, c1))), cap: `条件 1：<code>${vesc(L1)}</code>，逐行得到${py ? ' True / False' : '成立 ✓ / 不成立 ✗'}。` },
    { html: row(col(py ? 'df' : 'users', base), col(py ? 'm1' : '条件1', flag(L1, c1)), col(py ? 'm2' : '条件2', flag(L2, c2))), cap: `条件 2：<code>${vesc(L2)}</code>。` },
    { html: row(col(py ? 'df' : 'users', base), col(py ? 'm1' : '条件1', flag(L1, c1)), col(py ? 'm2' : '条件2', flag(L2, c2)), col('两者都满足', flag(L3, both))), cap: py ? '用 <code>&</code>（且）、<code>|</code>（或）、<code>~</code>（非）组合条件。注意：每个条件必须用<b>括号</b>包起来：<code>(df.city == \'北京\') & (df.age > 25)</code>。' : '<code>AND</code> 要求两个条件都成立；<code>OR</code> 只要一个成立。混用时 AND 优先级更高，记得加括号。' },
    { html: row(col(py ? 'df[m1 & m2]' : '结果', mini(['name', 'city', 'age'], data, { ix, rc: i => (both[i] ? 'hl' : 'fade') }))), cap: py ? '<code>df[m1 & m2]</code> 只保留 True 对应的行。注意结果保留了原来的索引（0、2），不是重新编号。' : '只有两个条件都成立的行被保留下来，进入后续步骤。' },
  ];
  stepper(el, py ? '布尔索引：先算条件，再筛行' : 'WHERE：逐行判断条件', tagOf(m), steps, clsOf(m));
};

/* ---------- 3. 分组聚合：拆分-应用-合并 ---------- */
VIZ.groupby = (el, d) => {
  const m = modeOf(d, 'both');
  const data = [['北京', 100], ['上海', 80], ['北京', 50], ['广州', 70], ['上海', 120], ['北京', 30]];
  const gc = { 北京: 'grp1', 上海: 'grp2', 广州: 'grp3' };
  const cities = ['北京', '上海', '广州'];
  const sums = cities.map(c => data.filter(r => r[0] === c).reduce((a, r) => a + r[1], 0));
  const code = code2('SELECT city, SUM(amount) FROM t GROUP BY city', "df.groupby('city')['amount'].sum()");
  const buckets = withSum => `<div class="viz-row">${cities.map((c, i) => `<div class="bucket"><span class="lbl">${c}</span>${mini(['city', 'amount'], data.filter(r => r[0] === c), { rc: () => gc[c] })}${withSum ? `<span class="bigval">SUM = ${sums[i]}</span>` : ''}</div>`).join('')}</div>`;
  const steps = [
    { html: code + row(col('原始数据', mini(['city', 'amount'], data, { rc: i => gc[data[i][0]] }))), cap: '目标：每个城市的销售额合计。分组聚合永远是三步：<b>拆分 Split → 应用 Apply → 合并 Combine</b>。' },
    { html: code + buckets(false), cap: '① <b>拆分</b>：按 city 的取值把行分进不同的“桶”，同一城市的行进同一个桶。' },
    { html: code + buckets(true), cap: '② <b>应用</b>：在每个桶内分别计算聚合函数（SUM / COUNT / AVG / MAX / MIN …）。' },
    { html: code + row(col('结果', mini(['city', 'SUM(amount)'], cities.map((c, i) => [c, sums[i]]), { rc: i => gc[cities[i]] }))), cap: '③ <b>合并</b>：每个桶压缩成<b>一行</b>，拼成结果表。原来 6 行 → 3 行，行数 = 分组的个数。' },
  ];
  stepper(el, 'GROUP BY / groupby 在做什么', tagOf(m), steps, clsOf(m));
};

/* ---------- 4. JOIN / merge ---------- */
VIZ.join = (el, d) => {
  const m = modeOf(d, 'both');
  const py = m === 'py';
  const U = [[1, '小王'], [2, '小李'], [3, '小张'], [4, '小赵']];
  const O = [[101, 1, 50], [102, 1, 30], [103, 3, 80], [104, 5, 20]];
  const gc = { 1: 'grp1', 3: 'grp2' };
  const types = [['inner', 'INNER JOIN', 'inner'], ['left', 'LEFT JOIN', 'left'], ['right', 'RIGHT JOIN', 'right'], ['full', 'FULL JOIN', 'outer']];
  const caps = {
    inner: '只保留两边<b>都能匹配上</b>的行。小王有 2 笔订单，所以出现 2 次——一对多连接会让行数“膨胀”，聚合时要当心重复计算。',
    left: '左表 users <b>全部保留</b>，右表匹配不上的列填空值。最常用的连接：例如“找出从没下过单的用户”= LEFT JOIN 后筛选 order_id 为空。',
    right: '右表 orders 全部保留。订单 104 的 user_id=5 在用户表里不存在，所以用户列为空。实际工作中一般交换两表位置写成 LEFT JOIN。',
    full: '两边全部保留，匹配不上的一侧填空值。注意：MySQL 不支持 FULL JOIN，可用 <code>LEFT JOIN … UNION … RIGHT JOIN</code> 模拟；pandas 写 <code>how=\'outer\'</code>。',
  };
  const venn = t => {
    const L = t === 'left' || t === 'full', R = t === 'right' || t === 'full';
    const id = 'c' + Math.random().toString(36).slice(2, 8);
    return `<svg class="venn" viewBox="0 0 220 120" width="200"><defs><clipPath id="${id}"><circle cx="85" cy="60" r="45"/></clipPath></defs>
      ${L ? '<circle class="fill" cx="85" cy="60" r="45"/>' : ''}${R ? '<circle class="fill" cx="135" cy="60" r="45"/>' : ''}
      <circle class="fill" cx="135" cy="60" r="45" clip-path="url(#${id})" style="${L || R ? 'opacity:0' : ''}"/>
      <circle cx="85" cy="60" r="45"/><circle cx="135" cy="60" r="45"/>
      <text x="58" y="64" text-anchor="middle">users</text><text x="162" y="64" text-anchor="middle">orders</text></svg>`;
  };
  const opts = types.map(([t, sql, how]) => {
    const res = [];
    U.forEach(([uid, name]) => {
      const os = O.filter(o => o[1] === uid);
      if (os.length) os.forEach(o => res.push([uid, name, o[0], o[2]]));
      else if (t === 'left' || t === 'full') res.push([uid, name, null, null]);
    });
    if (t === 'right' || t === 'full') O.filter(o => !U.some(u => u[0] === o[1])).forEach(o => res.push([o[1], null, o[0], o[2]]));
    if (t === 'right') res.sort((a, b) => a[2] - b[2]);
    const uKeep = u => O.some(o => o[1] === u[0]) || t === 'left' || t === 'full';
    const oKeep = o => U.some(u => u[0] === o[1]) || t === 'right' || t === 'full';
    const nul = py ? 'NaN' : 'NULL';
    const html = code2(`SELECT * FROM users u ${sql} orders o ON u.user_id = o.user_id`, `pd.merge(users, orders, on='user_id', how='${how}')`) +
      row(col('users（左表）', mini(['user_id', 'name'], U, { rc: i => (gc[U[i][0]] || (uKeep(U[i]) ? 'hl' : 'fade')) })),
        col('orders（右表）', mini(['order_id', 'user_id', 'amount'], O, { rc: i => (gc[O[i][1]] || (oKeep(O[i]) ? 'hl' : 'fade')) })),
        `<div class="viz-col" style="align-self:center">${venn(t)}</div>`) +
      `<div style="height:12px"></div>` + col(`结果：${res.length} 行`, mini(['user_id', 'name', 'order_id', 'amount'], res, { nul, rc: i => gc[res[i][0]] || '' }));
    return { label: py ? `how='${how}'` : sql, html, cap: caps[t] };
  });
  chooser(el, py ? 'merge 的四种连接方式' : 'JOIN 的四种连接方式', tagOf(m), opts, clsOf(m));
};

/* ---------- 5. 排名函数 ---------- */
VIZ.rank = (el, d) => {
  const m = modeOf(d, 'both');
  const data = [['小王', 95], ['小李', 90], ['小张', 90], ['小赵', 85], ['小刘', 80]];
  const rn = [1, 2, 3, 4, 5], rk = [1, 2, 2, 4, 5], dr = [1, 2, 2, 3, 4];
  const tie = i => (i === 1 || i === 2 ? 'hl' : '');
  const build = n => {
    const cols = ['name', 'score', 'ROW_NUMBER', 'RANK', 'DENSE_RANK'].slice(0, 2 + n);
    const rows = data.map((r, i) => [...r, rn[i], rk[i], dr[i]].slice(0, 2 + n));
    return mini(cols, rows, { cc: (i, j) => (j === 1 + n && n ? 'new ' : '') + (j >= 1 ? tie(i) : '') });
  };
  const steps = [
    { html: build(0), cap: '先按分数降序排好。小李和小张同为 90 分——三个排名函数的区别就在于<b>怎么处理并列</b>。' },
    { html: code2('ROW_NUMBER() OVER (ORDER BY score DESC)', "df['score'].rank(method='first', ascending=False)") + build(1), cap: '<b>ROW_NUMBER</b>：1、2、3、4、5 依次编号，<b>并列也不同号</b>。适合“每组只取一条”（如每个用户最近一笔订单）。' },
    { html: code2('RANK() OVER (ORDER BY score DESC)', "df['score'].rank(method='min', ascending=False)") + build(2), cap: '<b>RANK</b>：并列同号，<b>后面跳号</b>（1、2、2、4）。像体育比赛排名：两个第二名，下一个就是第四名。' },
    { html: code2('DENSE_RANK() OVER (ORDER BY score DESC)', "df['score'].rank(method='dense', ascending=False)") + build(3), cap: '<b>DENSE_RANK</b>：并列同号，<b>不跳号</b>（1、2、2、3）。适合“取前三档价格的商品”这类问题。加上 <code>PARTITION BY 品类</code> 就是组内排名。' },
  ];
  stepper(el, '三种排名：处理并列的方式不同', tagOf(m), steps, clsOf(m));
};

/* ---------- 6. 窗口累计 ---------- */
VIZ.window = (el, d) => {
  const m = modeOf(d, 'both');
  const data = [['A', '01-01', 10], ['A', '01-03', 20], ['A', '01-05', 15], ['B', '01-02', 30], ['B', '01-04', 10], ['B', '01-06', 25]];
  const cum = [10, 30, 45, 30, 40, 65];
  const gc = i => (data[i][0] === 'A' ? 'grp1' : 'grp2');
  const code = code2('SUM(amount) OVER (PARTITION BY user ORDER BY dt)', "df.groupby('user')['amount'].cumsum()");
  const steps = [{ html: code + mini(['user', 'dt', 'amount', '累计'], data.map(r => [...r, ''])), cap: '目标：每个用户的<b>累计消费</b>。<code>PARTITION BY user</code> 把数据切成两个窗口（A、B），<code>ORDER BY dt</code> 决定累加顺序。' }];
  data.forEach((r, k) => {
    const start = data.findIndex(x => x[0] === r[0]);
    const inFrame = i => i >= start && i <= k;
    const parts = data.slice(start, k + 1).map(x => x[2]);
    steps.push({
      html: code + mini(['user', 'dt', 'amount', '累计'], data.map((x, i) => [...x, i <= k ? cum[i] : '']), {
        rc: i => (inFrame(i) ? gc(i) : i > k ? 'fade' : ''),
        cc: (i, j) => (i === k && j === 3 ? 'new' : inFrame(i) && j === 2 ? 'sel' : ''),
      }),
      cap: `第 ${k + 1} 行（用户 ${r[0]}）：窗口 = 本分区第一行到当前行 → ${parts.join(' + ')} = <b>${cum[k]}</b>${k === 3 ? '。进入新分区 B，累计<b>重新开始</b>。' : '。'}`,
    });
  });
  steps.push({ html: code + mini(['user', 'dt', 'amount', '累计'], data.map((x, i) => [...x, cum[i]]), { rc: gc }), cap: '和 GROUP BY 最大的不同：窗口函数<b>不减少行数</b>，每一行都保留，只是多了一列计算结果。' });
  stepper(el, '窗口函数：一行一行滑过去', tagOf(m), steps, clsOf(m));
};

/* ---------- 7. LAG / shift ---------- */
VIZ.lag = (el, d) => {
  const m = modeOf(d, 'both');
  const py = m === 'py';
  const g = [100, 80, 120, 150], mon = ['1月', '2月', '3月', '4月'];
  const prev = [null, 100, 80, 120], next = [80, 120, 150, null];
  const mom = g.map((v, i) => (prev[i] == null ? null : (v - prev[i]) / prev[i]));
  const nul = py ? 'NaN' : 'NULL';
  const steps = [
    { html: mini(['month', 'gmv'], mon.map((x, i) => [x, g[i]])), cap: '想算<b>环比增长率</b> =（本月 − 上月）/ 上月。难点在于：“上月”的值在<b>上一行</b>，怎么把它拿到当前行？' },
    { html: code2('LAG(gmv) OVER (ORDER BY month) AS prev', "df['prev'] = df['gmv'].shift(1)") + mini(['month', 'gmv', 'prev'], mon.map((x, i) => [x, g[i], prev[i]]), { nul, cc: (i, j) => (j === 2 ? 'new sel' : i < 3 && j === 1 ? 'sel' : '') }), cap: `<b>${py ? 'shift(1)' : 'LAG'}</b> 把整列<b>向下错开一行</b>：每一行都拿到了上一行的值。第一行没有“上个月”，所以是 ${nul}。` },
    { html: code2('(gmv - prev) * 1.0 / prev AS mom', "df['mom'] = df['gmv'].pct_change()") + mini(['month', 'gmv', 'prev', '环比'], mon.map((x, i) => [x, g[i], prev[i], mom[i] == null ? null : pct(mom[i])]), { nul, cc: (i, j) => (j === 3 && mom[i] != null ? (mom[i] < 0 ? 'bad' : 'good') : '') }), cap: `同一行里有了本月和上月，相除即可。pandas 的 <code>pct_change()</code> 一步到位。${py ? '' : '注意：SQLite 整数相除会取整，记得乘 1.0。'}` },
    { html: code2('LEAD(gmv) OVER (ORDER BY month) AS next', "df['next'] = df['gmv'].shift(-1)") + mini(['month', 'gmv', 'next'], mon.map((x, i) => [x, g[i], next[i]]), { nul, cc: (i, j) => (j === 2 ? 'new sel' : '') }), cap: `反过来，<b>${py ? 'shift(-1)' : 'LEAD'}</b> 向上错一行，拿到<b>下一行</b>的值，常用于计算“距离下次购买的天数”。` },
  ];
  stepper(el, py ? 'shift：拿到上一行的值' : 'LAG / LEAD：拿到上一行的值', tagOf(m), steps, clsOf(m));
};

/* ---------- 8. 行转列 / pivot ---------- */
VIZ.pivot = (el, d) => {
  const m = modeOf(d, 'both');
  const py = m === 'py';
  const long = [['1月', '数码', 100], ['1月', '服饰', 60], ['2月', '数码', 120], ['2月', '服饰', 80], ['3月', '数码', 90]];
  const gc = c => (c === '数码' ? 'grp1' : 'grp2');
  const nul = py ? 'NaN' : 'NULL';
  const wide = (a, b, fill) => mini(['month', '数码', '服饰'], [['1月', a ? 100 : '', b ? 60 : ''], ['2月', a ? 120 : '', b ? 80 : ''], ['3月', a ? 90 : '', b ? (fill ? 0 : null) : '']], { nul, cc: (i, j) => (j === 1 && a ? 'grp1' : j === 2 && b ? 'grp2' : '') + (fill && i === 2 && j === 2 ? ' new' : '') });
  const L = (hi) => mini(['month', 'category', 'amount'], long, { rc: i => (hi && long[i][1] !== hi ? 'fade' : gc(long[i][1])) });
  const sqlCode = `SELECT month,\n  SUM(CASE WHEN category='数码' THEN amount END) AS 数码,\n  SUM(CASE WHEN category='服饰' THEN amount END) AS 服饰\nFROM t GROUP BY month`;
  const pyCode = "df.pivot_table(index='month', columns='category',\n               values='amount', aggfunc='sum')";
  const codeBox = `<pre class="qcode">${vesc(py ? pyCode : sqlCode)}</pre>`;
  const steps = [
    { html: row(col('长表（每行一条记录）', L())), cap: '数据库里的数据通常是<b>长表</b>：一行一个“月份 × 品类”。但报表常常要<b>宽表</b>：月份做行、品类做列。' },
    { html: codeBox + row(col('长表', L('数码')), arrow(), col('宽表', wide(true, false))), cap: py ? '<code>columns=\'category\'</code>：category 的每个取值变成一列；<code>index=\'month\'</code> 做行；<code>values</code> 填进格子。' : '<code>CASE WHEN category=\'数码\' THEN amount END</code>：只有数码的行才保留金额，其余为 NULL；再按月 SUM，就得到“数码”这一列。' },
    { html: codeBox + row(col('长表', L('服饰')), arrow(), col('宽表', wide(true, true))), cap: '“服饰”列同理。每个品类写一个 CASE WHEN —— 这就是 SQL 的“行转列”。' },
    { html: codeBox + row(col('宽表', wide(true, true, true))), cap: py ? '3 月没有服饰销售，格子为 NaN；加参数 <code>fill_value=0</code> 填成 0。' : '3 月没有服饰数据，SUM 结果为 NULL；用 <code>COALESCE(SUM(…), 0)</code> 或把 CASE 的 ELSE 写成 0 即可变成 0。' },
    { html: `<pre class="qcode">${vesc(py ? "wide.melt(id_vars='month', var_name='category', value_name='amount')" : "SELECT month, '数码' AS category, 数码 AS amount FROM wide\nUNION ALL\nSELECT month, '服饰', 服饰 FROM wide")}</pre>` + row(col('宽表', wide(true, true)), arrow('⇢'), col('长表', L())), cap: py ? '反过来，<code>melt</code> 把宽表“融化”回长表——画图、再分组时常用。' : '列转行：每一列写一段 SELECT，再用 UNION ALL 上下拼起来。' },
  ];
  stepper(el, '长表 ⇄ 宽表（行转列 / 透视）', tagOf(m), steps, clsOf(m));
};

/* ---------- 9. 子查询与 CTE ---------- */
VIZ.subquery = el => {
  const O = [[1, 30], [2, 80], [3, 50], [4, 100], [5, 40]];
  const q = (hi) => `<pre class="qcode"><span class="${hi === 'out' ? 'on' : ''}">SELECT * FROM orders\nWHERE amount > </span><span class="${hi === 'in' ? 'on' : ''}">(SELECT AVG(amount) FROM orders)</span></pre>`;
  const steps = [
    { html: q('in') + row(col('orders', mini(['order_id', 'amount'], O, { cc: (i, j) => (j === 1 ? 'sel' : '') })), arrow(), `<div class="flow-box on">子查询结果<br><span class="bigval">AVG = 60</span></div>`), cap: '① 先执行<b>括号里的子查询</b>：算出全部订单的平均金额 = (30+80+50+100+40)/5 = <b>60</b>。返回单个值的叫<b>标量子查询</b>。' },
    { html: q('out') + row(col('orders', mini(['order_id', 'amount'], O, { rc: i => (O[i][1] > 60 ? 'hl' : 'strike') })), arrow(), col('结果', mini(['order_id', 'amount'], O.filter(r => r[1] > 60)))), cap: '② 外层查询把子查询当成一个普通的值使用：<code>WHERE amount > 60</code>。' },
    { html: `<div class="box-flow"><div class="flow-box on"><small>第 1 步：给中间结果起名</small><code>WITH avg_t AS (\n SELECT AVG(amount) AS a FROM orders)</code></div>${arrow()}<div class="flow-box on"><small>第 2 步：像表一样使用</small><code>SELECT o.* FROM orders o, avg_t\nWHERE o.amount > avg_t.a</code></div>${arrow()}<div class="flow-box"><small>结果</small>2 行</div></div>`, cap: '③ 同样的逻辑用 <b>CTE（WITH 子句）</b>：先把中间结果起个名字，再在主查询中使用。复杂分析拆成多个 CTE，一步一个中间表，可读性远好于层层嵌套——这和 pandas 里“一步一个变量”的写法是一样的。' },
  ];
  stepper(el, '子查询：先算里面，再算外面', 'SQL', steps, 't-sql');
};

/* ---------- 10. NULL 与 COUNT ---------- */
VIZ.nullcount = el => {
  const ages = [25, null, 30, 30, null, 41];
  const ids = [1, 2, 3, 4, 5, 6];
  const t = (rc, cc, extraCol) => mini(['user_id', 'age', ...(extraCol ? [extraCol[0]] : [])], ids.map((id, i) => [id, ages[i], ...(extraCol ? [extraCol[1][i]] : [])]), { rc, cc });
  const isNull = i => ages[i] === null;
  const opt = (label, sql, py, table, val, cap) => ({ label, html: code2(sql, py) + row(table, arrow(), `<div class="flow-box on">结果<br><span class="bigval">${val}</span></div>`), cap });
  chooser(el, 'NULL 让很多函数“行为不同”', 'SQL · pandas', [
    opt('COUNT(*)', 'SELECT COUNT(*) FROM t', 'len(df)', t(() => 'hl'), 6, '<code>COUNT(*)</code> 数的是<b>行数</b>，不管有没有 NULL。'),
    opt('COUNT(age)', 'SELECT COUNT(age) FROM t', "df['age'].count()", t(i => (isNull(i) ? 'fade' : 'hl')), 4, '<code>COUNT(列)</code> 只数<b>非空值</b>，NULL 被跳过。'),
    opt('COUNT(DISTINCT)', 'SELECT COUNT(DISTINCT age) FROM t', "df['age'].nunique()", t(i => (isNull(i) || i === 3 ? 'fade' : 'hl')), 3, '<code>COUNT(DISTINCT 列)</code>：先去重（两个 30 算一个），也不计 NULL。'),
    opt('AVG(age)', 'SELECT AVG(age) FROM t', "df['age'].mean()", t(i => (isNull(i) ? 'fade' : 'hl')), 31.5, '聚合函数<b>忽略 NULL</b>：AVG = (25+30+30+41) / <b>4</b> = 31.5，而不是除以 6。如果业务上空值应当算 0，要先 <code>COALESCE(age, 0)</code>。'),
    opt('= NULL ✗', 'SELECT * FROM t WHERE age = NULL', "df[df['age'] == np.nan]", t(() => 'fade'), '0 行', '注意：任何值和 NULL 比较（=、<>、>）结果都是“未知”，<b>永远不成立</b>。pandas 中 NaN == NaN 也是 False。'),
    opt('IS NULL ✓', 'SELECT * FROM t WHERE age IS NULL', "df[df['age'].isna()]", t(i => (isNull(i) ? 'hl' : 'fade')), '2 行', '判断空值必须用 <code>IS NULL</code> / <code>IS NOT NULL</code>，pandas 用 <code>isna()</code> / <code>notna()</code>。'),
    opt('COALESCE', 'SELECT COALESCE(age, 0) FROM t', "df['age'].fillna(0)", t(null, (i, j) => (j === 2 && isNull(i) ? 'good' : ''), ['填充后', ages.map(a => a ?? 0)]), '空 → 0', '<code>COALESCE(a, b, …)</code> 返回第一个非空的参数，MySQL 也可用 <code>IFNULL(a, 0)</code>。'),
  ], 't-sql');
};

/* ---------- 11. DataFrame 结构 ---------- */
VIZ.anatomy = el => {
  const data = [[1, '北京', 25], [2, '上海', 34], [3, '广州', 41], [4, '北京', 29]];
  const cols = ['user_id', 'city', 'age'];
  const t = (o = {}) => mini(cols, data, { ix: [0, 1, 2, 3], ...o });
  const opt = (label, code, o, cap) => ({ label, html: `<pre class="qcode">${vesc(code)}</pre><div style="height:10px"></div>` + t(o), cap });
  chooser(el, 'DataFrame 的组成', 'pandas', [
    opt('整体', 'df  # 一张二维表', {}, '<b>DataFrame</b> = 带标签的二维表。左边灰色的是<b>行索引 index</b>，上面是<b>列名 columns</b>，中间是<b>数据 values</b>。'),
    opt('index', 'df.index   # RangeIndex(start=0, stop=4)', { ixc: () => 'sel', ihc: 'sel' }, '<b>index（行索引）</b>：每一行的“名字”。默认是 0、1、2…，也可以是日期、用户 ID 等。筛选、分组后索引会保留原值。'),
    opt('columns', "df.columns  # ['user_id', 'city', 'age']", { hc: () => 'sel' }, '<b>columns（列名）</b>：每一列的名字，用 <code>df[\'列名\']</code> 访问。'),
    opt('一列 Series', "df['city']   # 一维的 Series", { cc: (i, j) => (j === 1 ? 'sel' : ''), hc: j => (j === 1 ? 'sel' : ''), ixc: () => 'hl' }, '取出一列得到 <b>Series</b>：一维数据 + 它的索引。DataFrame 可以看成“共享同一个索引的多个 Series”。取多列要用双层方括号：<code>df[[\'city\', \'age\']]</code>。'),
    opt('一行', 'df.loc[1]    # 按索引标签取一行', { rc: i => (i === 1 ? 'hl' : ''), ixc: i => (i === 1 ? 'sel' : '') }, '<code>df.loc[1]</code> 取索引为 1 的行（也是一个 Series，索引是列名）。'),
    opt('一个值', "df.loc[2, 'age']   # 41", { cc: (i, j) => (i === 2 && j === 2 ? 'sel' : '') }, '<code>df.loc[行, 列]</code> 定位到单个格子。'),
    opt('shape', 'df.shape   # (4, 3) → 4 行 3 列', { cc: () => 'hl' }, '<code>df.shape</code> 返回（行数, 列数）；<code>len(df)</code> 是行数。拿到新数据先看 <code>head()</code>、<code>shape</code>、<code>info()</code>。'),
  ], 't-py');
};

/* ---------- 12. loc vs iloc ---------- */
VIZ.locidx = el => {
  const lab = [10, 11, 12, 13, 14];
  const data = [['北京', 28, '抖音'], ['上海', 35, '微信'], ['广州', 42, '抖音'], ['北京', 31, '应用商店'], ['深圳', 24, '微信']];
  const cols = ['city', 'age', 'channel'];
  const ix = lab.map((l, i) => `${l}<small style="opacity:.6"> #${i}</small>`);
  const opt = (code, R, C, cap) => ({
    label: code.replace('df.', ''),
    html: `<pre class="qcode">${vesc(code)}</pre><div style="height:10px"></div>` + mini(cols, data, { ix, ixName: '标签 #位置', cc: (i, j) => (R(i) && C(j) ? 'sel' : ''), ixc: i => (R(i) ? 'hl' : ''), hc: j => (C(j) ? 'hl' : '') }),
    cap,
  });
  const all = () => true;
  chooser(el, 'loc 按标签，iloc 按位置', 'pandas', [
    opt('df.loc[11:13]', i => i >= 1 && i <= 3, all, '<code>loc</code> 用<b>索引标签</b>：取标签 11 到 13 的行。注意：loc 的切片<b>包含两端</b>。'),
    opt('df.iloc[1:3]', i => i >= 1 && i < 3, all, '<code>iloc</code> 用<b>位置编号</b>（从 0 开始）：取第 1、2 行，<b>不含 3</b>——和 Python 列表切片一样左闭右开。'),
    opt("df.loc[:, ['city', 'age']]", all, j => j < 2, '逗号前选行、逗号后选列；<code>:</code> 表示全部。'),
    opt('df.iloc[0:2, 1:3]', i => i < 2, j => j >= 1, '前两行 × 第 1、2 列（age、channel）。'),
    opt("df.loc[df['age'] > 30, 'city']", i => data[i][1] > 30, j => j === 0, '<b>最常用</b>：loc 的行位置放布尔条件，列位置放列名——“筛行 + 选列”一步完成。'),
    opt('df.iloc[-1]', i => i === 4, all, '负数位置从末尾数：<code>iloc[-1]</code> 是最后一行。'),
  ], 't-py');
};

/* ---------- 13. 缺失值与重复值 ---------- */
VIZ.missing = el => {
  const D = [[1, '女', null, '北京'], [2, null, 55, null], [3, '男', 24, '上海'], [4, '男', null, '上海'], [3, '男', 24, '上海'], [5, '女', 47, '广州']];
  const cols = ['user_id', 'gender', 'age', 'city'];
  const ix = [0, 1, 2, 3, 4, 5];
  const nn = (i, j) => D[i][j] === null;
  const base = o => mini(cols, D, { ix, nul: 'NaN', cc: (i, j) => (nn(i, j) ? 'bad' : ''), ...o });
  const opt = (code, html, cap) => ({ label: code.replace(/^df\./, ''), html: `<pre class="qcode">${vesc(code)}</pre><div style="height:10px"></div>` + html, cap });
  chooser(el, '缺失值与重复值处理', 'pandas', [
    opt('df', base(), '红色格子是缺失值 NaN。真实数据几乎都有缺失和重复，分析前必须先处理。'),
    opt('df.isna()', mini(cols, D.map(r => r.map(v => (v === null ? 'True' : 'False'))), { ix, cc: (i, j) => (nn(i, j) ? 'bad' : '') }), '<code>isna()</code> 把每个格子变成 True（缺失）/ False。'),
    opt('df.isna().sum()', mini(['列', '缺失数'], cols.map((c, j) => [c, D.filter(r => r[j] === null).length]), { cc: (i, j) => (j === 1 && i > 0 ? 'bad' : '') }), '<code>isna().sum()</code>：True 当 1 加起来 = <b>每列缺失个数</b>，最常用的一行检查代码。'),
    opt('df.dropna()', base({ rc: i => (D[i].includes(null) ? 'strike' : '') }), '<code>dropna()</code> 删除<b>任何一列</b>有缺失的行——可能删掉太多数据，慎用。'),
    opt("df.dropna(subset=['age'])", base({ rc: i => (D[i][2] === null ? 'strike' : '') }), '<code>subset</code> 只看指定列：只删 age 为空的行。'),
    opt("df.fillna({'age': 35, 'city': '未知'})", mini(cols, D.map(r => [r[0], r[1], r[2] ?? 35, r[3] ?? '未知']), { ix, nul: 'NaN', cc: (i, j) => ((j === 2 || j === 3) && nn(i, j) ? 'good' : nn(i, j) ? 'bad' : '') }), '<code>fillna</code> 按列指定填充值：数值常用均值/中位数，类别常填“未知”。'),
    opt('df.duplicated()', mini([...cols, 'duplicated'], D.map((r, i) => [...r, i === 4 ? 'True' : 'False']), { ix, nul: 'NaN', cc: (i, j) => (j === 4 ? (i === 4 ? 'bad' : '') : i === 4 || i === 2 ? 'hl' : '') }), '<code>duplicated()</code> 标记重复行：第 4 行与第 2 行完全相同，第二次出现的被标为 True。'),
    opt('df.drop_duplicates()', base({ rc: i => (i === 4 ? 'strike' : '') }), '<code>drop_duplicates()</code> 删除重复行，默认保留第一次出现的；可用 <code>subset=[\'user_id\']</code> 按指定列判断重复。'),
  ], 't-py');
};

/* ---------- 14. agg vs transform ---------- */
VIZ.transform = el => {
  const D = [['北京', 100], ['上海', 80], ['北京', 50], ['上海', 120], ['北京', 30]];
  const tot = { 北京: 180, 上海: 200 };
  const gc = i => (D[i][0] === '北京' ? 'grp1' : 'grp2');
  const steps = [
    { html: mini(['city', 'amount'], D, { rc: gc }), cap: '问题：每笔订单占所在城市销售额的比例是多少？这需要把“城市合计”放回每一行。' },
    { html: code2(null, "df.groupby('city')['amount'].sum()") + row(col('原表 5 行', mini(['city', 'amount'], D, { rc: gc })), arrow(), col('agg 结果 2 行', mini(['city', 'sum'], [['上海', 200], ['北京', 180]], { rc: i => (i ? 'grp1' : 'grp2') }))), cap: '<b>agg / sum</b>：每组压缩成一行，行数变少，没法直接和原表逐行相除。' },
    { html: code2('SUM(amount) OVER (PARTITION BY city)', "df.groupby('city')['amount'].transform('sum')") + mini(['city', 'amount', 'total'], D.map(r => [...r, tot[r[0]]]), { rc: gc, cc: (i, j) => (j === 2 ? 'new' : '') }), cap: '<b>transform</b>：每组算出的值<b>广播回组内每一行</b>，结果和原表等长，可以直接作为新列——相当于 SQL 的窗口函数。' },
    { html: code2('amount * 1.0 / SUM(amount) OVER (PARTITION BY city)', "df['share'] = df['amount'] / df['total']") + mini(['city', 'amount', 'total', 'share'], D.map(r => [...r, tot[r[0]], pct(r[1] / tot[r[0]])]), { rc: gc, cc: (i, j) => (j === 3 ? 'new' : '') }), cap: '逐行相除得到占比。<b>组内占比、与组均值的差、组内标准化</b>都是这个套路。' },
  ];
  stepper(el, 'agg 压缩 vs transform 广播', 'pandas', steps, 't-py');
};

/* ---------- 15. concat ---------- */
VIZ.concat = el => {
  const A = [[1, '1月', 100], [2, '1月', 80]], B = [[3, '2月', 120], [4, '2月', 90]];
  const cols = ['order_id', 'month', 'amount'];
  chooser(el, '拼接：上下拼 vs 左右拼', 'SQL · pandas', [
    { label: '上下拼接', html: code2('SELECT * FROM jan UNION ALL SELECT * FROM feb', 'pd.concat([jan, feb], ignore_index=True)') + row(col('jan', mini(cols, A, { rc: () => 'grp1' })), col('feb', mini(cols, B, { rc: () => 'grp2' })), arrow(), col('结果', mini(cols, [...A, ...B], { ix: [0, 1, 2, 3], rc: i => (i < 2 ? 'grp1' : 'grp2') }))), cap: '把<b>列相同</b>的多张表上下堆叠，例如合并每个月导出的文件。<code>ignore_index=True</code> 重新编号索引，否则会出现 0、1、0、1。SQL 中 <code>UNION ALL</code> 保留重复行，<code>UNION</code> 会去重。' },
    { label: '左右拼接', html: code2(null, 'pd.concat([a, b], axis=1)') + row(col('a', mini(['city'], [['北京'], ['上海']], { ix: [0, 1], rc: () => 'grp1' })), col('b', mini(['users'], [[120], [95]], { ix: [0, 1], rc: () => 'grp2' })), arrow(), col('结果', mini(['city', 'users'], [['北京', 120], ['上海', 95]], { ix: [0, 1], cc: (i, j) => (j ? 'grp2' : 'grp1') }))), cap: '<code>axis=1</code> 按<b>索引对齐</b>左右拼接。按某个键列匹配时请用 <code>merge</code>，更安全。' },
  ], 't-py');
};

/* ---------- 16. 移动平均 ---------- */
VIZ.rolling = (el, d) => {
  const m = modeOf(d, 'both');
  const s = [10, 14, 9, 15, 20, 12, 18];
  const ma = s.map((_, i) => (i < 2 ? null : (s[i] + s[i - 1] + s[i - 2]) / 3));
  const code = code2('AVG(sales) OVER (ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)', "df['sales'].rolling(3).mean()");
  const steps = [];
  s.forEach((_, k) => {
    steps.push({
      html: code + mini(['day', 'sales', 'MA3'], s.map((v, i) => [i + 1, v, i <= k ? (ma[i] == null ? null : ma[i].toFixed(2)) : '']), { nul: 'NaN', rc: i => (i > k ? 'fade' : ''), cc: (i, j) => (j === 1 && i <= k && i >= k - 2 ? 'sel' : j === 2 && i === k ? 'new' : '') }),
      cap: k < 2 ? `第 ${k + 1} 天：窗口需要 3 天数据，目前不足 → pandas 给 NaN。` : `第 ${k + 1} 天：窗口 = 第 ${k - 1}~${k + 1} 天 → (${s.slice(k - 2, k + 1).join(' + ')}) / 3 = <b>${ma[k].toFixed(2)}</b>`,
    });
  });
  steps.push({ html: code + mini(['day', 'sales', 'MA3'], s.map((v, i) => [i + 1, v, ma[i] == null ? null : ma[i].toFixed(2)]), { nul: 'NaN' }), cap: '窗口像一个固定大小的框，每次向下滑一格。移动平均能<b>平滑日常波动</b>，看清趋势。注意：SQL 的 ROWS 窗口在前两天会用“不足 3 天”的数据直接计算（10、12），而 pandas 默认给 NaN（可用 <code>min_periods=1</code> 改变）。' });
  stepper(el, '移动平均：滑动的窗口', tagOf(m), steps, clsOf(m));
};

/* ---------- 17. 连续登录 ---------- */
VIZ.streak = el => {
  const days = [1, 2, 3, 5, 6, 8];
  const dt = n => `01-${String(n).padStart(2, '0')}`;
  const grpV = days.map((n, i) => n - (i + 1));
  const gname = v => (v === 0 ? '12-31' : dt(v));
  const gc = i => ['grp1', 'grp2', 'grp3'][[0, 3, 5].filter(s => i >= s).length - 1];
  const rows = n => days.map((x, i) => [dt(x), i + 1, gname(grpV[i])].slice(0, n));
  const H = ['login_date', 'rn', 'login_date − rn'];
  const steps = [
    { html: mini(H.slice(0, 1), rows(1)), cap: '用户 A 的登录日期（已排序）。怎么找出“连续登录了几天”？关键技巧：<b>日期 − 行号</b>。' },
    { html: code2('ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) AS rn', "df.groupby('user_id').cumcount() + 1") + mini(H.slice(0, 2), rows(2), { cc: (i, j) => (j === 1 ? 'new' : '') }), cap: '① 给每个用户的登录按日期编号 1、2、3……' },
    { html: code2("date(login_date, '-' || rn || ' day') AS grp", "df['login_date'] - pd.to_timedelta(rn, unit='D')") + mini(H, rows(3), { cc: (i, j) => (j === 2 ? 'new' : '') }), cap: '② 用日期减去行号。日期每天 +1，行号也每次 +1，所以<b>只要是连续的日子，差值就保持不变</b>；一旦断开，差值就会变。' },
    { html: mini(H, rows(3), { rc: gc }), cap: '③ 差值相同的行就是同一段连续登录：12-31 一段（3 天）、01-01 一段（2 天）、01-02 一段（1 天）。' },
    { html: row(col('按 (user_id, grp) 分组计数', mini(['grp', '起', '止', '连续天数'], [['12-31', '01-01', '01-03', 3], ['01-01', '01-05', '01-06', 2], ['01-02', '01-08', '01-08', 1]], { rc: i => ['grp1', 'grp2', 'grp3'][i], cc: (i, j) => (j === 3 && i === 0 ? 'good' : '') }))), cap: '④ 按 (user_id, grp) 分组 COUNT 即得每段的天数，再取 MAX 就是<b>最长连续登录天数 = 3</b>。这个套路也适用于“连续 N 天下单”“连续 N 个月增长”等问题。' },
  ];
  stepper(el, '连续登录：日期 − 行号 的妙用', 'SQL · pandas', steps, 't-sql');
};

/* ---------- 18. 留存矩阵 ---------- */
VIZ.retention = el => {
  const L = [['u1', '01-01', 0], ['u1', '01-02', 1], ['u1', '01-08', 7], ['u2', '01-01', 0], ['u2', '01-03', 2], ['u3', '01-02', 0], ['u3', '01-03', 1], ['u3', '01-04', 2], ['u4', '01-02', 0]];
  const first = { u1: '01-01', u2: '01-01', u3: '01-02', u4: '01-02' };
  const gc = i => (first[L[i][0]] === '01-01' ? 'grp1' : 'grp2');
  const heat = v => `background:color-mix(in srgb, var(--accent) ${Math.round(v * 45)}%, transparent)`;
  const mat = [['01-01', 2, 1, 1, 1], ['01-02', 2, 1, 1, 0]];
  const rate = mat.map(r => [r[0], ...r.slice(1).map(v => v / r[1])]);
  const heatTable = `<table class="mini"><thead><tr><th>首日</th><th>第0天</th><th>第1天</th><th>第2天</th><th>第7天</th></tr></thead><tbody>${rate.map(r => `<tr><td>${r[0]}</td>${r.slice(1).map(v => `<td style="${heat(v)}">${pct(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const steps = [
    { html: mini(['user_id', 'login_date'], L.map(r => r.slice(0, 2))), cap: '原始登录记录。<b>留存率</b>回答的是：某天来的新用户，第 N 天还有多少比例回来？' },
    { html: code2('MIN(login_date) OVER (PARTITION BY user_id) AS first_day', "df.groupby('user_id')['login_date'].transform('min')") + mini(['user_id', 'login_date', 'first_day'], L.map(r => [r[0], r[1], first[r[0]]]), { rc: gc, cc: (i, j) => (j === 2 ? 'new' : '') }), cap: '① 找到每个用户的<b>首次登录日</b>（新增日），用户按首日分成不同的“同期群”（cohort）。' },
    { html: code2('julianday(login_date) - julianday(first_day) AS day_n', "(df['login_date'] - df['first_day']).dt.days") + mini(['user_id', 'login_date', 'first_day', 'day_n'], L.map(r => [r[0], r[1], first[r[0]], r[2]]), { rc: gc, cc: (i, j) => (j === 3 ? 'new' : '') }), cap: '② 计算每次登录是首日之后的第几天。day_n = 1 表示次日回访。' },
    { html: code2("COUNT(DISTINCT CASE WHEN day_n = 1 THEN user_id END)", "pivot_table(index='first_day', columns='day_n', values='user_id', aggfunc='nunique')") + mini(['首日', '第0天', '第1天', '第2天', '第7天'], mat, { cc: (i, j) => (j === 1 ? 'hl' : '') }), cap: '③ 按“首日 × day_n”统计去重人数。第 0 天的人数就是该批次的<b>新增用户数</b>。' },
    { html: heatTable, cap: '④ 每一格除以第 0 天人数，得到<b>留存率矩阵</b>（颜色越深留存越高）。横向看一批用户随时间的流失，纵向比较不同批次的质量。' },
  ];
  stepper(el, '留存率是怎么算出来的', 'SQL · pandas', steps, 't-case');
};

/* ---------- 19. RFM ---------- */
VIZ.rfm = el => {
  const U = [['A', 5, 8, 3200], ['B', 40, 2, 300], ['C', 3, 1, 2500], ['D', 60, 6, 2800], ['E', 10, 5, 400]];
  const avg = [23.6, 4.4, 1840];
  const hi = (r, j) => (j === 1 ? r[1] < avg[0] : r[j] > avg[j - 1]);
  const names = { '111': '重要价值', '101': '重要发展', '011': '重要保持', '001': '重要挽留', '110': '一般价值', '100': '一般发展', '010': '一般保持', '000': '一般挽留' };
  const code = r => [1, 2, 3].map(j => (hi(r, j) ? '1' : '0')).join('');
  const H = ['用户', 'R 最近消费(天前)', 'F 消费次数', 'M 消费金额'];
  const steps = [
    { html: mini(H, U), cap: '对每个用户算三个指标：<b>R</b>（Recency）最近一次消费距今几天，<b>F</b>（Frequency）消费次数，<b>M</b>（Monetary）消费总额。' },
    { html: mini(H, U.map(r => [r[0], ...[1, 2, 3].map(j => `${r[j]} ${hi(r, j) ? '↑' : '↓'}`)]), { cc: (i, j) => (j ? (hi(U[i], j) ? 'good' : 'bad') : '') }) + `<div class="legend"><span>均值：R=${avg[0]} 天，F=${avg[1]} 次，M=${avg[2]} 元</span></div>`, cap: '和均值（或中位数）比较打分：<b>R 越小越好</b>（最近刚买过），F、M 越大越好。高于平均记 1（↑），否则记 0（↓）。' },
    { html: mini(['用户', 'R', 'F', 'M', '分群'], U.map(r => [r[0], ...code(r).split(''), names[code(r)]]), { cc: (i, j) => (j >= 1 && j <= 3 ? (code(U[i])[j - 1] === '1' ? 'good' : 'bad') : j === 4 ? 'hl' : '') }), cap: '三个 0/1 组合成 8 种用户类型，每种对应不同的运营策略。' },
    { html: mini(['R', 'F', 'M', '用户类型', '运营策略'], [['1', '1', '1', '重要价值', '重点维护，提供 VIP 服务'], ['0', '1', '1', '重要保持', '最近没来了，主动召回'], ['1', '0', '1', '重要发展', '买得多但不常来，提高频次'], ['0', '0', '1', '重要挽留', '高价值但快流失，重点挽留'], ['1', '1', '0', '一般价值', '活跃但客单低，推荐升级'], ['1', '0', '0', '一般发展', '新客，引导复购'], ['0', '1', '0', '一般保持', '低价值，低成本维护'], ['0', '0', '0', '一般挽留', '基本流失，可放弃']], { cc: (i, j) => (j === 3 ? (i < 4 ? 'good' : 'hl') : '') }), cap: '经典 8 分群对照表。实际工作中也常用分位数打 1~5 分，思路相同。' },
  ];
  stepper(el, 'RFM 用户分层', 'SQL · pandas', steps, 't-case');
};

/* ---------- 20. 分箱 pd.cut ---------- */
VIZ.cut = el => {
  const ages = [19, 23, 27, 31, 36, 40, 44, 52];
  const bins = [17, 24, 34, 44, 55], labels = ['18-24', '25-34', '35-44', '45-55'];
  const bi = a => bins.findIndex((b, i) => i > 0 && a <= b) - 1;
  const W = 560, x = a => 30 + (a - 15) / 45 * (W - 60);
  const svgLine = colored => `<svg viewBox="0 0 ${W} 110" style="width:100%;max-width:${W}px">
    <line x1="20" y1="60" x2="${W - 20}" y2="60" style="stroke:var(--muted)" stroke-width="1.5"/>
    ${colored ? bins.slice(0, -1).map((b, i) => `<rect x="${x(b)}" y="40" width="${x(bins[i + 1]) - x(b)}" height="40" rx="6" style="fill:var(--g${i + 1});opacity:.16"/><text x="${(x(b) + x(bins[i + 1])) / 2}" y="100" text-anchor="middle" style="font:600 12px var(--font);fill:var(--g${i + 1})">${labels[i]}</text>`).join('') + bins.map(b => `<line x1="${x(b)}" y1="34" x2="${x(b)}" y2="86" style="stroke:var(--muted)" stroke-dasharray="3 3"/><text x="${x(b)}" y="28" text-anchor="middle" style="font:11px var(--mono);fill:var(--muted)">${b}</text>`).join('') : ''}
    ${ages.map(a => `<circle cx="${x(a)}" cy="60" r="7" style="fill:${colored ? `var(--g${bi(a) + 1})` : 'var(--faint)'}"/><text x="${x(a)}" y="${colored ? 52 : 84}" text-anchor="middle" style="font:11px var(--mono);fill:var(--text)">${colored ? '' : a}</text>`).join('')}</svg>`;
  const cnt = labels.map((l, i) => [l, ages.filter(a => bi(a) === i).length]);
  const steps = [
    { html: svgLine(false), cap: '一组连续的年龄值。分析时常要把连续数值切成区间（年龄段、价格档、消费等级）。' },
    { html: code2(null, "pd.cut(df['age'], bins=[17, 24, 34, 44, 55], labels=['18-24', '25-34', '35-44', '45-55'])") + svgLine(true), cap: '<code>bins</code> 给出切分点，默认区间<b>左开右闭</b>：(17, 24] 即 18~24 岁。每个值落入对应区间，得到标签。' },
    { html: code2("CASE WHEN age <= 24 THEN '18-24' WHEN age <= 34 THEN '25-34' … END", ".value_counts().sort_index()") + svgLine(true) + mini(['年龄段', '人数'], cnt, { cc: (i) => `grp${i + 1}` }), cap: '再 <code>value_counts()</code> 就是年龄段分布。SQL 中用 CASE WHEN 实现同样的分箱；想按数量等分可用 <code>pd.qcut</code>。' },
  ];
  stepper(el, '分箱：把连续值切成区间', 'pandas', steps, 't-py');
};

/* ================= 结果图表 ================= */
// 一图一个强调色：要看的那条线 / 那根柱用墨水蓝，其余中性灰
const ACC = 'var(--accent)', NEU = ['var(--chart-2)', 'var(--chart-3)'];
function niceTicks(lo, hi, n = 5) {
  if (lo === hi) hi = lo + 1;
  const raw = (hi - lo) / n, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => (hi - lo) / s <= n) || raw;
  const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
  for (let v = a; v <= b + step / 2; v += step) t.push(+v.toFixed(10));
  return t;
}
function fmtNum(v, ratio) {
  if (v == null || isNaN(v)) return '';
  if (ratio) return (v * 100).toFixed(Math.abs(v) < 0.1 && v !== 0 ? 1 : 0) + '%';
  const a = Math.abs(v);
  if (a >= 1e8) return (v / 1e8).toFixed(1) + '亿';
  if (a >= 1e4) return +(v / 1e4).toFixed(a >= 1e6 ? 0 : 1) + '万';
  return Number.isInteger(v) ? String(v) : v.toFixed(a < 1 ? 3 : 1);
}
const isRatio = vals => vals.every(v => v == null || (v >= -1.5 && v <= 1.5)) && vals.some(v => v != null && !Number.isInteger(v));
const num = v => (v == null || v === '' ? null : typeof v === 'number' ? v : isNaN(+v) ? null : +v);

function renderChart(el, type, cols, rows) {
  rows = rows.slice(0, 400);
  const labels = rows.map(r => String(r[0] ?? ''));
  const series = cols.slice(1).map((c, j) => ({ name: c, vals: rows.map(r => num(r[j + 1])) })).filter(s => s.vals.some(v => v != null));
  if (!series.length) return;
  const W = Math.max(320, Math.min(el.clientWidth || 640, 900));
  const small = W < 480;
  const wrap = document.createElement('div'); wrap.className = 'chart chart-wrap'; el.append(wrap);
  const tip = document.createElement('div'); tip.className = 'chart-tip'; tip.hidden = true;
  const legend = (names, colors) => `<div class="chart-legend">${names.map((n, i) => `<span><i style="background:${colors[i]}"></i>${vesc(n)}</span>`).join('')}</div>`;

  if (type === 'heat') {
    const all = series.flatMap(s => s.vals).filter(v => v != null);
    const max = Math.max(...all), ratio = isRatio(all);
    const html = `<div class="result-wrap" style="max-height:none"><table class="mini" style="width:100%;border:0"><thead><tr><th>${vesc(cols[0])}</th>${series.map(s => `<th>${vesc(s.name)}</th>`).join('')}</tr></thead><tbody>${labels.map((l, i) => `<tr><td>${vesc(l)}</td>${series.map(s => { const v = s.vals[i]; return `<td style="${v == null ? '' : `background:color-mix(in srgb, var(--accent) ${Math.round(v / (max || 1) * 50)}%, transparent)`}">${v == null ? '' : fmtNum(v, ratio)}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
    wrap.innerHTML = html;
    return;
  }
  if (type === 'funnel') {
    const v = series[0].vals, max = Math.max(...v.filter(x => x != null)), bh = 40, H = v.length * (bh + 10) + 10;
    let s = `<svg viewBox="0 0 ${W} ${H}">`;
    v.forEach((x, i) => {
      const w = (W - 40) * (x / max) * (small ? 0.62 : 0.7), cx = W / 2 - (small ? 40 : 60), y = 10 + i * (bh + 10);
      s += `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="${bh}" rx="6" style="fill:${ACC};opacity:${1 - i * 0.12}"/>`;
      s += `<text x="${cx}" y="${y + bh / 2 + 4}" text-anchor="middle" style="fill:var(--on-accent);font:500 12px var(--font)">${vesc(labels[i])} ${fmtNum(x)}</text>`;
      if (i) s += `<text x="${W - 10}" y="${y + bh / 2 + 4}" text-anchor="end" class="val">${small ? '' : '转化 '}${pct(x / v[i - 1])}<tspan style="fill:var(--muted);font-weight:400"> / 总 ${pct(x / v[0])}</tspan></text>`;
    });
    wrap.innerHTML = s + '</svg>';
    return;
  }
  if (type === 'hbar') {
    const v = series[0].vals, max = Math.max(...v.filter(x => x != null), 0), bh = 22, lw = small ? 96 : 150, H = v.length * (bh + 6) + 10;
    let s = `<svg viewBox="0 0 ${W} ${H}">`;
    v.forEach((x, i) => {
      const y = 5 + i * (bh + 6), w = (W - lw - 70) * ((x || 0) / (max || 1));
      const lab = labels[i].length > (small ? 7 : 12) ? labels[i].slice(0, small ? 7 : 12) + '…' : labels[i];
      s += `<text x="${lw - 8}" y="${y + bh / 2 + 4}" text-anchor="end">${vesc(lab)}</text><rect x="${lw}" y="${y}" width="${Math.max(w, 1)}" height="${bh}" rx="4" style="fill:${i ? NEU[0] : ACC}"/><text x="${lw + w + 6}" y="${y + bh / 2 + 4}" class="val">${fmtNum(x)}</text>`;
    });
    wrap.innerHTML = s + '</svg>';
    return;
  }

  // 有坐标轴的图：line / bar / combo / pareto
  const H = small ? 230 : 280, mL = small ? 44 : 56, mR = (type === 'combo' || type === 'pareto') ? (small ? 40 : 52) : 16, mT = 16, mB = 42;
  const n = labels.length, pw = W - mL - mR, ph = H - mT - mB;
  let left = type === 'line' ? series.slice(0, 5) : type === 'bar' ? series.slice(0, 4) : [series[0]];
  let right = null;
  if (type === 'combo' && series[1]) right = series[1];
  if (type === 'pareto') {
    const tot = series[0].vals.reduce((a, b) => a + (b || 0), 0); let c = 0;
    right = { name: '累计占比', vals: series[0].vals.map(v => (c += v || 0) / tot) };
  }
  const leftColors = left.map((_, k) => ((type === 'line' || type === 'bar') && k === left.length - 1 ? ACC : NEU[k % 2]));
  const lv = left.flatMap(s => s.vals).filter(v => v != null);
  const lt = niceTicks(Math.min(0, ...lv), Math.max(...lv));
  const lr = isRatio(lv);
  const y = v => mT + ph - (v - lt[0]) / (lt[lt.length - 1] - lt[0]) * ph;
  let rt, ry, rr;
  if (right) {
    const rv = right.vals.filter(v => v != null);
    rt = type === 'pareto' ? [0, 0.25, 0.5, 0.75, 1] : niceTicks(Math.min(0, ...rv), Math.max(...rv));
    rr = isRatio(rv);
    ry = v => mT + ph - (v - rt[0]) / (rt[rt.length - 1] - rt[0]) * ph;
  }
  const band = pw / n, xc = i => mL + band * (i + 0.5);
  let s = `<svg viewBox="0 0 ${W} ${H}">`;
  lt.forEach(t => { s += `<line class="grid" x1="${mL}" x2="${W - mR}" y1="${y(t)}" y2="${y(t)}"/><text x="${mL - 6}" y="${y(t) + 4}" text-anchor="end">${fmtNum(t, lr)}</text>`; });
  if (right) rt.forEach(t => { s += `<text x="${W - mR + 6}" y="${ry(t) + 4}">${fmtNum(t, rr)}</text>`; });
  const every = Math.ceil(n / Math.floor(pw / (small ? 46 : 64)));
  labels.forEach((l, i) => { if (i % every === 0) s += `<text x="${xc(i)}" y="${H - mB + 18}" text-anchor="middle">${vesc(l.length > 10 ? l.slice(0, 10) : l)}</text>`; });
  s += `<line class="axis" x1="${mL}" x2="${W - mR}" y1="${y(Math.max(0, lt[0]))}" y2="${y(Math.max(0, lt[0]))}"/>`;
  const drawLine = (vals, yf, color, dots) => {
    let p = '', on = false;
    vals.forEach((v, i) => { if (v == null) { on = false; return; } p += `${on ? 'L' : 'M'}${xc(i).toFixed(1)},${yf(v).toFixed(1)}`; on = true; });
    let o = `<path d="${p}" style="fill:none;stroke:${color};stroke-width:2.4;stroke-linejoin:round;stroke-linecap:round"/>`;
    if (dots) vals.forEach((v, i) => { if (v != null) o += `<circle cx="${xc(i)}" cy="${yf(v)}" r="3.2" style="fill:var(--surface);stroke:${color};stroke-width:2"/>`; });
    return o;
  };
  if (type === 'line') left.forEach((sr, k) => { s += drawLine(sr.vals, y, leftColors[k], n <= 40); });
  else {
    const bw = Math.min(42, band * 0.72 / left.length);
    left.forEach((sr, k) => sr.vals.forEach((v, i) => {
      if (v == null) return;
      const x0 = xc(i) - bw * left.length / 2 + k * bw, y0 = y(Math.max(0, v)), h = Math.abs(y(v) - y(0));
      s += `<rect x="${x0 + 1}" y="${y0}" width="${Math.max(bw - 2, 1)}" height="${Math.max(h, 0.5)}" rx="2" style="fill:${leftColors[k]}"/>`;
      if (n * left.length <= 12 && !small) s += `<text x="${x0 + bw / 2}" y="${y0 - 5}" text-anchor="middle" class="val">${fmtNum(v, lr)}</text>`;
    }));
    if (right) {
      if (type === 'pareto') s += `<line x1="${mL}" x2="${W - mR}" y1="${ry(0.8)}" y2="${ry(0.8)}" style="stroke:var(--faint);stroke-dasharray:4 4"/><text x="${W - mR - 4}" y="${ry(0.8) - 5}" text-anchor="end" style="fill:var(--faint)">80%</text>`;
      s += drawLine(right.vals, ry, ACC, n <= 40);
    }
  }
  s += `<line class="guide" x1="0" x2="0" y1="${mT}" y2="${mT + ph}" style="stroke:var(--faint);stroke-dasharray:3 3;display:none"/>`;
  s += `<rect class="hit" x="${mL}" y="${mT}" width="${pw}" height="${ph}" fill="transparent"/></svg>`;
  wrap.innerHTML = s + legend([...left.map(x => x.name), ...(right ? [right.name] : [])], [...leftColors, ACC]);
  wrap.append(tip);
  const svgEl = wrap.querySelector('svg'), guide = svgEl.querySelector('.guide');
  const all = [...left.map((sr, k) => ({ ...sr, r: lr, c: leftColors[k] })), ...(right ? [{ ...right, r: rr, c: ACC }] : [])];
  const move = e => {
    const b = svgEl.getBoundingClientRect(), sx = (e.clientX - b.left) * W / b.width;
    const i = Math.max(0, Math.min(n - 1, Math.floor((sx - mL) / band)));
    guide.setAttribute('x1', xc(i)); guide.setAttribute('x2', xc(i)); guide.style.display = '';
    tip.hidden = false;
    tip.innerHTML = `<b>${vesc(labels[i])}</b><br>${all.map(a => `<span style="color:${a.c}">●</span> ${vesc(a.name)}：${fmtNum(a.vals[i], a.r)}`).join('<br>')}`;
    tip.style.left = Math.min(Math.max((xc(i) / W) * b.width, 70), b.width - 70) + 'px';
    tip.style.top = (e.clientY - b.top) + 'px';
  };
  svgEl.querySelector('.hit').addEventListener('pointermove', move);
  svgEl.querySelector('.hit').addEventListener('pointerdown', move);
  svgEl.addEventListener('pointerleave', () => { tip.hidden = true; guide.style.display = 'none'; });
}
