'use strict';
/* 数析实验室：路由、页面渲染、代码运行（sql.js / Pyodide）、判题、进度 */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const svg = d => `<svg viewBox="0 0 24 24">${d}</svg>`;
const ICON = {
  play: svg('<path d="M7 4v16l13-8z" fill="currentColor" stroke="none"/>'),
  check: svg('<path d="M4 12.5l5 5L20 6.5"/>'),
  reset: svg('<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/>'),
  bulb: svg('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>'),
  eye: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  copy: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
  run: svg('<path d="M13 3L4 14h7l-1 7 9-11h-7z"/>'),
  chart: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  play2: svg('<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>'),
  pause: svg('<path d="M8 5v14M16 5v14"/>'),
  prev: svg('<path d="M15 5l-7 7 7 7"/>'),
  next: svg('<path d="M9 5l7 7-7 7"/>'),
  table: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>'),
};

const TRACKS = {
  sql: { key: 'sql', name: 'SQL', full: 'SQL 必备', lang: 'sql', items: COURSE.sql,
    desc: '从查询、过滤、聚合到多表连接与窗口函数，覆盖取数分析 90% 的日常写法。' },
  pandas: { key: 'pandas', name: 'pandas', full: 'pandas 必备', lang: 'py', items: COURSE.pandas,
    desc: '读取、筛选、清洗、分组、合并、透视、时间序列——Python 数据分析的核心工具箱。' },
  case: { key: 'case', name: '业务实战', full: '业务场景实战', lang: 'sql', items: COURSE.cases,
    desc: 'DAU、留存、漏斗、复购、RFM、TopN……面试与工作中最高频的分析题，SQL 与 pandas 双解法。' },
};
const TABLES = ['users', 'products', 'orders', 'events', 'logins', 'users_raw'];

/* ---------- 本地进度（仅存在本浏览器） ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('sqlpd-' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sqlpd-' + k, JSON.stringify(v)); } catch {} },
};
let DONE = store.get('done', {});
const exKey = (lesson, i) => `${lesson.id}-${i}`;
function lessonProgress(L) {
  const n = (L.ex || []).length;
  const d = (L.ex || []).filter((_, i) => DONE[exKey(L, i)]).length;
  return { n, d };
}
function trackProgress(T) {
  return T.items.reduce((a, L) => { const p = lessonProgress(L); return { n: a.n + p.n, d: a.d + p.d }; }, { n: 0, d: 0 });
}

/* ---------- SQL 引擎（sql.js） ---------- */
let sqlP;
function sqlEngine() {
  return sqlP ||= Promise.all([
    initSqlJs({ locateFile: f => 'vendor/sqljs/' + f }),
    fetch('data/shop.db').then(r => { if (!r.ok) throw new Error('数据库下载失败'); return r.arrayBuffer(); }),
  ]).then(([SQL, buf]) => ({ SQL, bytes: new Uint8Array(buf) })).catch(e => { sqlP = null; throw e; });
}
async function runSQL(code) {
  const { SQL, bytes } = await sqlEngine();
  const db = new SQL.Database(bytes); // 每次运行都用全新副本
  try {
    const res = db.exec(code);
    const last = res[res.length - 1];
    if (!last) return { kind: 'none' };
    return { kind: 'table', columns: last.columns, rows: last.values, index: 0, total: last.values.length };
  } finally { db.close(); }
}

/* ---------- Python 引擎（Pyodide + pandas），首次运行时才加载 ---------- */
const PRELUDE = `
import io, json, re, sys, traceback, warnings
from contextlib import redirect_stdout
import numpy as np
import pandas as pd
from pyodide.code import eval_code
warnings.filterwarnings('ignore')
pd.set_option('display.width', 120)
pd.set_option('display.max_columns', 30)

_DATES = {'users': ['register_date'], 'orders': ['order_date'], 'events': ['event_time'], 'logins': ['login_date']}
_BASE = {t: pd.read_csv(f'/data/{t}.csv', parse_dates=_DATES.get(t, [])) for t in ${JSON.stringify(TABLES)}}

def _fresh():
    ns = {'pd': pd, 'np': np, '__name__': '__main__'}
    ns.update({k: v.copy() for k, v in _BASE.items()})
    return ns

def _cell(v):
    if isinstance(v, np.generic):
        v = v.item()
    if v is None:
        return None
    if isinstance(v, float):
        return None if v != v else v
    if isinstance(v, (bool, int, str)):
        return v
    if v is pd.NaT:
        return None
    if isinstance(v, pd.Timestamp):
        return str(v.date()) if v == v.normalize() else str(v)
    try:
        if pd.isna(v):
            return None
    except (TypeError, ValueError):
        pass
    return str(v)

def _payload(obj, limit=1000):
    if obj is None:
        return None
    if isinstance(obj, pd.Index):
        obj = obj.to_series(index=range(len(obj)))
    if isinstance(obj, pd.Series):
        obj = obj.to_frame(name=obj.name if obj.name is not None else 0)
    if isinstance(obj, pd.DataFrame):
        df = obj
        names = ['' if n is None else str(n) for n in df.index.names]
        cols = [' / '.join(map(str, c)) if isinstance(c, tuple) else str(c) for c in df.columns]
        rows = []
        for idx, row in zip(df.index[:limit], df.head(limit).itertuples(index=False)):
            idx = idx if isinstance(idx, tuple) else (idx,)
            rows.append([_cell(x) for x in idx] + [_cell(x) for x in row])
        return {'kind': 'table', 'columns': names + cols, 'index': len(names), 'rows': rows, 'total': len(df)}
    if isinstance(obj, np.generic):
        obj = obj.item()
    if isinstance(obj, np.ndarray):
        obj = obj.tolist()
    return {'kind': 'text', 'text': repr(obj)}

def _err(e):
    where = ''
    if isinstance(e, SyntaxError):
        where = f'第 {e.lineno} 行：{(e.text or "").strip()}'
    else:
        fr = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == '<exec>']
        if fr:
            where = f'第 {fr[-1].lineno} 行：{(fr[-1].line or "").strip()}'
    return {'type': type(e).__name__, 'msg': str(e), 'where': where}

def _exec(code):
    ns, out = _fresh(), io.StringIO()
    with redirect_stdout(out):
        val = eval_code(code, ns)
    return ns, val, out.getvalue()

def _run_json(code):
    try:
        ns, val, out = _exec(code)
    except Exception as e:
        return json.dumps({'err': _err(e)}, ensure_ascii=False)
    shown = val if val is not None else ns.get('result')
    return json.dumps({'out': out, 'res': _payload(shown)}, ensure_ascii=False, default=str)

_NUM = re.compile(r'^-?[0-9]+([.][0-9]+)?$')
def _key(v):
    v = _cell(v)
    if isinstance(v, str) and _NUM.match(v.strip()):
        v = float(v)
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return str(v)
    if isinstance(v, (int, float)):
        s = f'{v:.2f}'
        return '0.00' if s == '-0.00' else s
    return str(v).strip()

def _norm(x, ordered):
    if isinstance(x, pd.Index):
        x = x.to_series(index=range(len(x)))
    if isinstance(x, pd.Series):
        x = x.to_frame()
    elif not isinstance(x, pd.DataFrame):
        if isinstance(x, (list, tuple, np.ndarray)):
            x = pd.DataFrame({'v': list(x)})
        else:
            x = pd.DataFrame({'v': [x]})
    named = any(n is not None for n in x.index.names)
    x = x.reset_index(drop=not named, allow_duplicates=True)
    rows = [tuple(_key(v) for v in r) for r in x.itertuples(index=False)]
    return x.shape[1], (rows if ordered else sorted(rows))

def _compare(a, b, ordered):
    ca, ra = _norm(a, ordered)
    cb, rb = _norm(b, ordered)
    if ca != cb:
        return {'pass': False, 'msg': f'列数不对：你的结果有 {ca} 列，参考答案有 {cb} 列。'}
    if len(ra) != len(rb):
        return {'pass': False, 'msg': f'行数不对：你的结果有 {len(ra)} 行，参考答案有 {len(rb)} 行。'}
    for i, (x, y) in enumerate(zip(ra, rb)):
        if x != y:
            pos = f'第 {i + 1} 行' if ordered else '某一行'
            return {'pass': False, 'msg': f'内容不一致（{pos}）：你的是 [{" | ".join(x)}]，答案是 [{" | ".join(y)}]。'}
    return {'pass': True}

def _check_json(code, sol, ordered):
    try:
        ns, val, out = _exec(code)
    except Exception as e:
        return json.dumps({'err': _err(e)}, ensure_ascii=False)
    shown = val if val is not None else ns.get('result')
    res = {'out': out, 'res': _payload(shown)}
    if 'result' not in ns:
        res['verdict'] = {'pass': False, 'msg': '没有找到变量 result：请把最终答案赋值给 result，例如 result = df.head()'}
    else:
        ns2, _, _ = _exec(sol)
        res['verdict'] = _compare(ns['result'], ns2['result'], ordered)
    return json.dumps(res, ensure_ascii=False, default=str)
`;

let pyP;
const engineBtn = $('#engine');
function setEngine(state, text) {
  engineBtn.className = 'engine ' + state;
  engineBtn.textContent = text;
}
setEngine('', 'Python 未加载');
engineBtn.onclick = () => { if (!pyP) pyEngine().catch(() => {}); };

function loadScript(src) {
  return new Promise((ok, fail) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => fail(new Error('脚本加载失败：' + src)); document.head.append(s); });
}
function pyEngine(onStage = () => {}) {
  if (pyP) return pyP;
  const stage = t => { setEngine('loading', t); onStage(t); };
  return pyP = (async () => {
    stage('下载 Python 解释器（约 12MB）…');
    if (!window.loadPyodide) await loadScript('vendor/pyodide/pyodide.js');
    const base = new URL('vendor/pyodide/', location.href).href;
    const py = await loadPyodide({ indexURL: base, packageBaseUrl: base });
    stage('加载 pandas（约 8MB）…');
    await py.loadPackage(['pandas'], { messageCallback: () => {} });
    stage('读取数据集…');
    py.FS.mkdirTree('/data');
    await Promise.all(TABLES.map(async t => py.FS.writeFile(`/data/${t}.csv`, await fetch(`data/${t}.csv`).then(r => r.text()))));
    py.runPython(PRELUDE);
    setEngine('ready', 'Python 就绪');
    return { run: py.globals.get('_run_json'), check: py.globals.get('_check_json') };
  })().catch(e => { pyP = null; setEngine('error', 'Python 加载失败，点击重试'); throw e; });
}

/* ---------- 统一执行 & 判题 ---------- */
const SQL_HINTS = [
  [/no such column/i, '列名不存在：检查拼写，或多表查询时是否写错了表别名。'],
  [/no such table/i, '表名不存在：可用的表有 users、products、orders、events、logins、users_raw。'],
  [/ambiguous column/i, '列名有歧义：多张表都有这一列，请加上表别名前缀，例如 o.user_id。'],
  [/misuse of aggregate|aggregate functions are not allowed/i, '聚合函数用错位置：WHERE 里不能用聚合，分组后的筛选请用 HAVING。'],
  [/misuse of window/i, '窗口函数不能直接写在 WHERE / GROUP BY 中：先在子查询或 CTE 里算出来，再在外层筛选。'],
  [/syntax error/i, '语法错误：检查逗号、括号、引号是否成对，关键字顺序是否为 SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT。'],
  [/incomplete input/i, '语句不完整：是不是少了右括号或者结尾？'],
];
const PY_HINTS = {
  KeyError: '找不到这个列名或键：检查拼写（中英文、大小写、空格），可以先用 df.columns 看看有哪些列。',
  NameError: '变量未定义：检查变量名拼写，或者是否在使用前赋过值。可用的表：users、products、orders、events、logins、users_raw。',
  SyntaxError: '语法错误：检查括号、引号是否成对，冒号、逗号是否遗漏。',
  IndentationError: '缩进错误：Python 用缩进表示代码块，同一层级的代码缩进要一致。',
  AttributeError: '对象没有这个属性或方法：检查拼写；注意 Series 和 DataFrame 的方法不完全相同，字符串方法要写 .str.xxx，日期要写 .dt.xxx。',
  TypeError: '类型错误：参数个数或数据类型不匹配，例如字符串和数字不能直接相加。',
  ValueError: '值错误：常见于多条件筛选没加括号——请写成 (条件1) & (条件2)。',
};

async function execute(lang, code, onStage) {
  const t0 = performance.now();
  if (lang === 'sql') {
    try { const r = await runSQL(code); return { ...r, ms: performance.now() - t0 }; }
    catch (e) {
      const msg = e.message || String(e);
      return { err: { type: 'SQL 错误', msg, hint: (SQL_HINTS.find(([re]) => re.test(msg)) || [])[1] } };
    }
  }
  const py = await pyEngine(onStage);
  await sleep(16);
  const t1 = performance.now();
  const r = JSON.parse(py.run(code));
  if (r.err) r.err.hint = PY_HINTS[r.err.type];
  return { ...(r.res || { kind: 'none' }), out: r.out, err: r.err, ms: performance.now() - t1 };
}

function sqlKey(v) {
  if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim())) v = Number(v);
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') { const s = v.toFixed(2); return s === '-0.00' ? '0.00' : s; }
  return String(v).trim();
}
function compareRows(a, b, ordered) {
  const norm = r => { const rows = r.rows.map(x => x.map(sqlKey)); return ordered ? rows : rows.sort((p, q) => (p.join('\u0001') < q.join('\u0001') ? -1 : 1)); };
  const ca = a.columns.length, cb = b.columns.length;
  if (ca !== cb) return { pass: false, msg: `列数不对：你的结果有 ${ca} 列，参考答案有 ${cb} 列。` };
  if (a.rows.length !== b.rows.length) return { pass: false, msg: `行数不对：你的结果有 ${a.rows.length} 行，参考答案有 ${b.rows.length} 行。` };
  const ra = norm(a), rb = norm(b);
  for (let i = 0; i < ra.length; i++) {
    if (ra[i].join('\u0001') !== rb[i].join('\u0001'))
      return { pass: false, msg: `内容不一致（${ordered ? `第 ${i + 1} 行` : '某一行'}）：你的是 [${ra[i].join(' | ')}]，答案是 [${rb[i].join(' | ')}]。` };
  }
  return { pass: true };
}

async function check(lang, code, sol, ordered, onStage) {
  if (lang === 'sql') {
    const user = await execute('sql', code);
    if (user.err) return user;
    if (user.kind !== 'table') return { ...user, verdict: { pass: false, msg: '没有查询结果：请写一条 SELECT 语句。' } };
    const ans = await runSQL(sol);
    return { ...user, verdict: compareRows(user, ans, ordered) };
  }
  const py = await pyEngine(onStage);
  await sleep(16);
  const t1 = performance.now();
  const r = JSON.parse(py.check(code, sol, !!ordered));
  if (r.err) { r.err.hint = PY_HINTS[r.err.type]; return { err: r.err }; }
  return { ...(r.res || { kind: 'none' }), out: r.out, verdict: r.verdict, ms: performance.now() - t1 };
}

/* ---------- 结果渲染 ---------- */
const fmt = v => {
  if (v === null || v === undefined) return '<span class="nul">NULL</span>';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 10000) / 10000);
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  return esc(v);
};
function resultHTML(r, lang) {
  let h = '';
  if (r.out) h += `<pre class="stdout">${esc(r.out)}</pre>`;
  if (r.err) {
    const e = r.err;
    return h + `<div class="error-box"><b>${esc(e.type)}</b><code>${esc(e.msg)}</code>${e.where ? `<div><code>${esc(e.where)}</code></div>` : ''}${e.hint ? `<div class="hint">💡 ${esc(e.hint)}</div>` : ''}</div>`;
  }
  if (r.kind === 'table') {
    const nul = lang === 'py' ? '<span class="nul">NaN</span>' : null;
    const cell = v => (v === null && nul) ? nul : fmt(v);
    const shown = r.rows.slice(0, 200);
    h += `<div class="out-meta"><span>${r.total} 行 × ${r.columns.length - (r.index || 0)} 列</span>${r.total > shown.length ? `<span>仅显示前 ${shown.length} 行</span>` : ''}${r.ms != null ? `<span>${r.ms.toFixed(0)} ms</span>` : ''}</div>`;
    h += `<div class="result-wrap"><table class="result"><thead><tr>${r.columns.map((c, j) => `<th class="${j < r.index ? 'ix' : ''}">${esc(c)}</th>`).join('')}</tr></thead><tbody>`;
    h += shown.map(row => `<tr>${row.map((v, j) => `<td class="${j < r.index ? 'ix' : ''}${typeof v === 'string' ? ' s' : ''}">${cell(v)}</td>`).join('')}</tr>`).join('');
    h += '</tbody></table></div>';
  } else if (r.kind === 'text') {
    h += `<div class="scalar">${esc(r.text)}</div>`;
  } else if (!r.out) {
    h += `<div class="out-meta">执行成功（没有返回结果${lang === 'py' ? '；想看结果可以把变量名写在最后一行' : ''}）</div>`;
  }
  return h;
}

/* ---------- 代码运行器 ---------- */
function highlight(code, lang) {
  const pre = document.createElement('pre');
  pre.className = 'code cm-s-default';
  CodeMirror.runMode(code, lang === 'sql' ? 'text/x-sqlite' : 'python', pre);
  return pre;
}
function makeRunner(host, { lang, code, chart, ex, exId, onPass }) {
  host.className = `runner t-${lang}`;
  host.innerHTML = `
    <div class="runner-bar">
      <span class="lang">${lang === 'sql' ? 'SQL' : 'Python · pandas'}</span><span class="grow"></span>
      ${ex ? `<button class="btn ghost" data-a="hint">${ICON.bulb}<span class="t">提示</span></button>
      <button class="btn ghost" data-a="answer">${ICON.eye}<span class="t">答案</span></button>` : ''}
      <button class="btn ghost" data-a="reset" title="恢复初始代码">${ICON.reset}<span class="t">重置</span></button>
      <button class="btn ${ex ? '' : 'primary'}" data-a="run" title="Ctrl/⌘ + Enter">${ICON.play}运行</button>
      ${ex ? `<button class="btn success" data-a="check">${ICON.check}提交</button>` : ''}
    </div>
    <div class="editor"></div><div class="extra"></div><div class="output"></div>`;
  const out = $('.output', host), extra = $('.extra', host);
  const saved = exId ? store.get('code-' + exId, null) : null;
  const run = () => go(false);
  const cm = CodeMirror($('.editor', host), {
    value: saved ?? code, mode: lang === 'sql' ? 'text/x-sqlite' : 'python', lineNumbers: true, indentUnit: 4,
    viewportMargin: Infinity, matchBrackets: true, lineWrapping: true,
    extraKeys: { 'Ctrl-Enter': run, 'Cmd-Enter': run, Tab: c => c.execCommand(c.somethingSelected() ? 'indentMore' : 'insertSoftTab') },
  });
  if (exId) cm.on('change', () => store.set('code-' + exId, cm.getValue()));
  const verdictEl = ex ? host.parentElement.querySelector('.verdict') : null;

  async function go(isCheck) {
    const btns = $$('[data-a="run"],[data-a="check"]', host);
    btns.forEach(b => (b.disabled = true));
    if (verdictEl) verdictEl.textContent = '';
    out.innerHTML = `<div class="loading-box"><span class="spinner"></span><span>运行中…</span></div>`;
    const onStage = t => { out.innerHTML = `<div class="loading-box"><span class="spinner"></span><span>首次运行需要准备 Python 环境：${esc(t)}（之后会快很多）</span></div>`; };
    let r;
    try {
      r = isCheck ? await check(lang, cm.getValue(), ex.sol, ex.ordered, onStage) : await execute(lang, cm.getValue(), onStage);
    } catch (e) {
      r = { err: { type: '环境加载失败', msg: e.message || String(e), hint: '请检查网络后重试；手机上首次加载约需下载 20MB。' } };
    }
    out.innerHTML = resultHTML(r, lang);
    if (chart && r.kind === 'table' && r.rows.length) {
      const box = document.createElement('div'); box.className = 'chart-box'; out.append(box);
      renderChart(box, chart, r.columns, r.rows);
    }
    if (isCheck && verdictEl) {
      const v = r.err ? { pass: false, msg: '代码运行出错了，先修正上面的错误。' } : r.verdict;
      verdictEl.className = 'verdict ' + (v.pass ? 'pass' : 'fail');
      verdictEl.textContent = v.pass ? '✅ 回答正确！结果与参考答案一致。' : '❌ ' + v.msg;
      if (v.pass) onPass?.();
    }
    btns.forEach(b => (b.disabled = false));
  }

  host.addEventListener('click', e => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'run') go(false);
    else if (a === 'check') go(true);
    else if (a === 'reset') { cm.setValue(code); out.innerHTML = ''; }
    else if (a === 'hint') { extra.innerHTML = extra.dataset.v === 'hint' ? '' : `<p class="hint-text">💡 ${ex.hint || '回顾本课讲解中的示例，思路是一样的。'}</p>`; extra.dataset.v = extra.innerHTML ? 'hint' : ''; }
    else if (a === 'answer') {
      if (extra.dataset.v === 'ans') { extra.innerHTML = ''; extra.dataset.v = ''; return; }
      extra.innerHTML = ''; extra.append(highlight(ex.sol, lang));
      const b = document.createElement('button'); b.className = 'btn'; b.innerHTML = `${ICON.copy}填入编辑器`;
      b.onclick = () => cm.setValue(ex.sol); extra.append(b); extra.dataset.v = 'ans';
    }
  });
  return cm;
}

/* ---------- 页面 ---------- */
const main = $('#main'), sidebar = $('#sidebar');

function hydrate(root) {
  $$('textarea[data-run]', root).forEach(t => {
    const host = document.createElement('div');
    t.replaceWith(host);
    makeRunner(host, { lang: t.dataset.run, code: t.value.trim(), chart: t.dataset.chart });
  });
  $$('textarea[data-code]', root).forEach(t => t.replaceWith(highlight(t.value.trim(), t.dataset.code)));
  $$('[data-viz]', root).forEach(el => {
    const f = VIZ[el.dataset.viz];
    if (f) f(el, el.dataset); else el.textContent = '（缺少可视化：' + el.dataset.viz + '）';
  });
  $$('table:not(.mini):not(.result)', root).forEach(t => {
    if (t.parentElement.classList.contains('table-scroll')) return;
    const w = document.createElement('div'); w.className = 'table-scroll'; t.replaceWith(w); w.append(t);
  });
}

function renderSidebar(cur) {
  const groups = Object.values(TRACKS).map(T => {
    const p = trackProgress(T);
    const items = T.items.map((L, i) => {
      const lp = lessonProgress(L);
      const st = lp.n && lp.d === lp.n ? 'full' : lp.d ? 'part' : '';
      return `<a class="nav-item ${st} ${cur === L.id ? 'on' : ''}" href="#/${T.key}/${L.id}"><span class="num">${lp.n && lp.d === lp.n ? '✓' : i + 1}</span>${esc(L.title)}</a>`;
    }).join('');
    const open = cur && T.items.some(L => L.id === cur) || cur === T.key;
    return `<details class="nav-group t-${T.key}" ${open ? 'open' : ''}><summary><span class="dot" style="background:var(--c)"></span>${T.full}<span class="count">${p.d}/${p.n}</span></summary>${items}</details>`;
  }).join('');
  sidebar.innerHTML = groups + `<div class="nav-links">
    <a class="nav-item ${cur === 'home' ? 'on' : ''}" href="#/"><span class="num">⌂</span>首页</a>
    <a class="nav-item ${cur === 'data' ? 'on' : ''}" href="#/data"><span class="num">⛁</span>数据集 & 自由练习</a>
    <a class="nav-item ${cur === 'cheatsheet' ? 'on' : ''}" href="#/cheatsheet"><span class="num">≡</span>SQL ↔ pandas 速查表</a></div>`;
}

function pageHome() {
  const card = T => {
    const p = trackProgress(T);
    const pct = p.n ? Math.round(p.d / p.n * 100) : 0;
    return `<a class="card track-card t-${T.key}" href="#/${T.key}">
      <h3>${T.full}</h3><p>${T.desc}</p>
      <div class="chips">${T.items.slice(0, 6).map(L => `<span>${esc(L.title)}</span>`).join('')}${T.items.length > 6 ? `<span>+${T.items.length - 6}</span>` : ''}</div>
      <div class="progress-label"><span>${T.items.length} 个模块 · ${p.n} 道练习</span><span>${pct}%</span></div>
      <div class="progress"><i style="width:${pct}%"></i></div></a>`;
  };
  const feat = (t, ico, h, p) => `<div class="card feature t-${t}"><div class="ico">${ico}</div><h4>${h}</h4><p>${p}</p></div>`;
  return `<div class="page wide">
    <section class="hero">
      <div>
        <h1>在浏览器里学会<br><em>SQL 与 pandas</em></h1>
        <p>只讲日常数据分析最常用的知识。每个概念配可视化动画，每段代码都能直接运行，再用真实业务场景题把它们串起来——电脑、手机都能练。</p>
        <div class="cta"><a class="btn big primary" href="#/sql/s1">从 SQL 开始</a><a class="btn big py" href="#/pandas/p1">从 pandas 开始</a><a class="btn big" href="#/case">业务实战</a></div>
      </div>
      <div class="duo">
        <div><span class="lbl" style="color:var(--sql)">SQL</span><pre class="cm-s-default" id="duoSql"></pre></div>
        <div class="equal">⇅ 同一个问题，两种写法</div>
        <div><span class="lbl" style="color:var(--py)">pandas</span><pre class="cm-s-default" id="duoPy"></pre></div>
      </div>
    </section>
    <h2>三条学习路径</h2>
    <div class="tracks">${Object.values(TRACKS).map(card).join('')}</div>
    <h2>建议学习顺序</h2>
    <div class="route">
      <div class="t-sql"><b>SQL 基础 8 课</b><span>先学会“取数”：查询、聚合、连接、窗口函数，是所有分析岗位的基本功。</span></div>
      <div class="t-pandas"><b>pandas 基础 8 课</b><span>再学“加工”：清洗、分组、合并、透视，处理 SQL 不方便做的灵活分析。</span></div>
      <div class="t-case"><b>业务实战 10 题</b><span>最后“解决问题”：留存、漏斗、复购、RFM，每题都有 SQL 与 pandas 两种解法。</span></div>
    </div>
    <h2>这里有什么</h2>
    <div class="features">
      ${feat('sql', ICON.run, '浏览器内直接运行', 'SQL 由 SQLite（WebAssembly）执行，pandas 由 Pyodide 执行，无需安装任何软件，手机也能跑。')}
      ${feat('pandas', ICON.chart, '可视化动画讲解', 'JOIN 怎么匹配、GROUP BY 怎么分组、窗口怎么滑动……一步一步看清楚每个操作对数据做了什么。')}
      ${feat('case', ICON.check, '自动判题 + 进度记录', '每课都有练习，提交后自动和参考答案比对结果；完成进度保存在本机浏览器里。')}
    </div>
    <div class="footer"><span>数据集为模拟的电商数据（300 用户 · 半年订单），可随意练习。</span><span><a href="#/data">查看数据集</a> · <a href="#/cheatsheet">速查表</a> · <a href="#/selftest">自测</a></span></div>
  </div>`;
}
function afterHome() {
  CodeMirror.runMode(`SELECT city, COUNT(*) AS 用户数\nFROM users\nGROUP BY city\nORDER BY 用户数 DESC;`, 'text/x-sqlite', $('#duoSql'));
  CodeMirror.runMode(`(users.groupby('city')\n      .size()\n      .sort_values(ascending=False))`, 'python', $('#duoPy'));
}

function pageTrack(T) {
  const p = trackProgress(T);
  return `<div class="page t-${T.key}">
    <div class="lesson-head"><div class="crumb"><span class="pill">${T.name}</span><span>${T.items.length} 个模块 · ${p.n} 道练习 · 已完成 ${p.d}</span></div>
    <h1>${T.full}</h1><p class="sub">${T.desc}</p></div>
    <div class="lesson-list">${T.items.map((L, i) => {
      const lp = lessonProgress(L);
      return `<a class="card lesson-row" href="#/${T.key}/${L.id}"><span class="n">${i + 1}</span><span class="t"><b>${esc(L.title)}</b><span>${esc(L.sub)}</span></span>${lp.n ? `<span class="badge ${lp.d === lp.n ? 'ok' : ''}">${lp.d}/${lp.n}</span>` : ''}</a>`;
    }).join('')}</div></div>`;
}

function pageLesson(T, idx) {
  const L = T.items[idx], prev = T.items[idx - 1], next = T.items[idx + 1];
  const lp = lessonProgress(L);
  return `<article class="page t-${T.key}">
    <header class="lesson-head">
      <div class="crumb"><span class="pill">${T.name}</span><span>第 ${idx + 1} / ${T.items.length} 课</span></div>
      <h1>${esc(L.title)}</h1><p class="sub">${esc(L.sub)}</p>
      ${lp.n ? `<div class="meta"><span>练习完成 <b id="lpText">${lp.d}/${lp.n}</b></span><div class="progress"><i id="lpBar" style="width:${lp.d / lp.n * 100}%"></i></div></div>` : ''}
    </header>
    <section class="prose">${L.body}</section>
    ${lp.n ? `<section class="ex-section prose"><h2>动手练习</h2><p>写完点 <b>提交</b> 自动判题：结果的行和值与参考答案一致即为正确（列名不限，未要求排序时不看行顺序）。${T.key !== 'sql' ? 'pandas 题请把最终答案赋值给变量 <code>result</code>。' : ''}</p><div id="exList"></div></section>` : ''}
    <nav class="pager">
      ${prev ? `<a class="card prev" href="#/${T.key}/${prev.id}"><small>← 上一课</small>${esc(prev.title)}</a>` : '<span></span>'}
      ${next ? `<a class="card next" href="#/${T.key}/${next.id}"><small>下一课 →</small>${esc(next.title)}</a>` : ''}
    </nav></article>`;
}
function afterLesson(T, idx) {
  const L = T.items[idx];
  hydrate($('.prose', main));
  const list = $('#exList');
  if (!list) return;
  (L.ex || []).forEach((ex, i) => {
    const lang = ex.lang || T.lang, key = exKey(L, i);
    const box = document.createElement('div');
    box.className = `exercise t-${lang} ${DONE[key] ? 'done' : ''}`;
    box.id = 'ex-' + key;
    box.innerHTML = `<div class="ex-head"><span class="ex-num">练习 ${i + 1}</span><span class="badge">${lang === 'sql' ? 'SQL' : 'pandas'}</span>${ex.ordered ? '<span class="badge">需按要求排序</span>' : ''}<span class="badge ok" ${DONE[key] ? '' : 'hidden'}>✓ 已完成</span></div>
      <div class="ex-q">${ex.q}</div><div class="rh"></div><div class="verdict"></div>`;
    list.append(box);
    const starter = ex.starter ?? (lang === 'sql' ? '-- 在这里写 SQL\n' : '# 把最终答案赋值给 result\nresult = ');
    makeRunner($('.rh', box), {
      lang, code: starter, ex, exId: key,
      onPass: () => {
        DONE[key] = true; store.set('done', DONE);
        box.classList.add('done'); $('.badge.ok', box).hidden = false;
        const p = lessonProgress(L);
        $('#lpText').textContent = `${p.d}/${p.n}`; $('#lpBar').style.width = p.d / p.n * 100 + '%';
        renderSidebar(L.id);
      },
    });
  });
}

const TABLE_INFO = {
  users: ['用户表', '每行一个用户，注册即首次登录。', [['user_id', '用户 ID', 1], ['gender', '性别：男/女'], ['age', '年龄（少量为空）'], ['city', '城市'], ['channel', '注册渠道'], ['register_date', '注册日期']]],
  products: ['商品表', '5 个品类，每类 8 个商品。', [['product_id', '商品 ID', 1], ['product_name', '商品名'], ['category', '品类'], ['price', '单价']]],
  orders: ['订单表', '2024-01 至 2024-06 的订单，一行一单。', [['order_id', '订单 ID', 1], ['user_id', '→ users'], ['product_id', '→ products'], ['quantity', '购买件数'], ['amount', '金额 = 单价 × 件数'], ['status', '已支付 / 已退款'], ['order_date', '下单日期']]],
  events: ['行为日志', '用户在 App 内的行为，用于漏斗分析。', [['user_id', '→ users'], ['event_type', '浏览/加购/下单/支付'], ['event_time', '发生时间']]],
  logins: ['登录表', '每个用户每天最多一行，用于活跃、留存、连续登录。', [['user_id', '→ users'], ['login_date', '登录日期']]],
  users_raw: ['脏数据', '含空值、重复行、空格和不统一日期，清洗课专用。', [['user_id', '用户 ID'], ['gender', '性别（有空值）'], ['age', '年龄（有空值）'], ['city', '城市（有空格/“市”）'], ['register_date', '日期格式不统一']]],
};
const TABLE_ROWS = { users: 300, products: 40, orders: 1332, events: 2041, logins: 5564, users_raw: 43 };
function pageData() {
  return `<div class="page wide t-sql">
    <div class="lesson-head"><div class="crumb"><span class="pill">数据集</span></div><h1>数据集 & 自由练习</h1>
    <p class="sub">一个模拟电商的 6 张表，所有课程和练习都基于它。SQL 中直接用表名查询；pandas 中已预先读入同名 DataFrame（日期列已解析为日期类型）。点击表卡片可预览数据。</p></div>
    <div class="schema">${TABLES.map(t => {
      const [cn, d, cols] = TABLE_INFO[t];
      return `<button class="card tbl-card" data-t="${t}"><header><b>${t}</b><span>${cn} · ${TABLE_ROWS[t]} 行</span></header><p>${d}</p><ul>${cols.map(([c, s, k]) => `<li><code class="${k ? 'key' : ''}">${c}</code><span>${s}</span></li>`).join('')}</ul></button>`;
    }).join('')}</div>
    <div class="mysql">表之间通过 <code>user_id</code>、<code>product_id</code> 关联：orders / events / logins 的 user_id 对应 users，orders 的 product_id 对应 products。</div>
    <h2>自由练习</h2>
    <div class="seg" id="pgSeg"><button class="on" data-l="sql">SQL</button><button data-l="py">pandas</button></div>
    <div id="pg"></div></div>`;
}
function afterData() {
  const pg = $('#pg');
  const codes = { sql: 'SELECT * FROM orders LIMIT 10;', py: 'orders.head(10)' };
  let lang = 'sql', cm;
  const mount = () => { pg.innerHTML = '<div></div>'; cm = makeRunner(pg.firstChild, { lang, code: codes[lang] }); };
  mount();
  $('#pgSeg').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    lang = b.dataset.l; $$('#pgSeg button').forEach(x => x.classList.toggle('on', x === b)); mount();
  };
  $$('.tbl-card').forEach(c => c.onclick = () => {
    $$('.tbl-card').forEach(x => x.classList.toggle('on', x === c));
    const t = c.dataset.t;
    cm.setValue(lang === 'sql' ? `SELECT * FROM ${t} LIMIT 10;` : `${t}.head(10)`);
    $('[data-a="run"]', pg).click();
    pg.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

const CHEAT = [
  ['查看前几行', 'SELECT * FROM t LIMIT 5', 'df.head(5)'],
  ['行数 / 形状', 'SELECT COUNT(*) FROM t', 'len(df) / df.shape'],
  ['选择列', 'SELECT a, b FROM t', "df[['a', 'b']]"],
  ['列重命名', 'SELECT a AS x FROM t', "df.rename(columns={'a': 'x'})"],
  ['条件过滤', "WHERE a > 1 AND b = 'x'", "df[(df['a'] > 1) & (df['b'] == 'x')]"],
  ['多值匹配', 'WHERE a IN (1, 2)', "df[df['a'].isin([1, 2])]"],
  ['模糊匹配', "WHERE s LIKE '%耳机%'", "df[df['s'].str.contains('耳机')]"],
  ['空值判断', 'WHERE a IS NULL', "df[df['a'].isna()]"],
  ['空值填充', 'COALESCE(a, 0)', "df['a'].fillna(0)"],
  ['排序', 'ORDER BY a DESC, b', "df.sort_values(['a', 'b'], ascending=[False, True])"],
  ['去重', 'SELECT DISTINCT a FROM t', "df['a'].unique() / df.drop_duplicates()"],
  ['去重计数', 'COUNT(DISTINCT a)', "df['a'].nunique()"],
  ['分组聚合', 'SELECT a, SUM(b) FROM t GROUP BY a', "df.groupby('a')['b'].sum()"],
  ['多个指标', 'COUNT(*) AS n, AVG(b) AS m', "df.groupby('a').agg(n=('b', 'count'), m=('b', 'mean'))"],
  ['分组后筛选', 'HAVING SUM(b) > 100', "g = df.groupby('a')['b'].sum(); g[g > 100]"],
  ['连接', 'l LEFT JOIN r ON l.k = r.k', "pd.merge(l, r, on='k', how='left')"],
  ['上下拼接', 'SELECT … UNION ALL SELECT …', 'pd.concat([df1, df2])'],
  ['条件列', "CASE WHEN a > 1 THEN 'y' ELSE 'n' END", "np.where(df['a'] > 1, 'y', 'n')"],
  ['数值分箱', 'CASE WHEN … 多个区间', "pd.cut(df['age'], bins=[0, 25, 35, 100])"],
  ['行转列', "SUM(CASE WHEN c='x' THEN v END) AS x", "df.pivot_table(index='a', columns='c', values='v', aggfunc='sum')"],
  ['列转行', '多个 SELECT … UNION ALL', "df.melt(id_vars='a', var_name='c', value_name='v')"],
  ['组内编号', 'ROW_NUMBER() OVER (PARTITION BY a ORDER BY b)', "df.sort_values('b').groupby('a').cumcount() + 1"],
  ['排名', 'RANK() / DENSE_RANK() OVER (ORDER BY b DESC)', "df['b'].rank(method='min' / 'dense', ascending=False)"],
  ['累计求和', 'SUM(b) OVER (PARTITION BY a ORDER BY d)', "df.sort_values('d').groupby('a')['b'].cumsum()"],
  ['上一行的值', 'LAG(b) OVER (ORDER BY d)', "df['b'].shift(1)"],
  ['环比增长', '(b - LAG(b) OVER w) * 1.0 / LAG(b) OVER w', "df['b'].pct_change()"],
  ['移动平均', 'AVG(b) OVER (ORDER BY d ROWS 6 PRECEDING)', "df['b'].rolling(7).mean()"],
  ['组内占比', 'b * 1.0 / SUM(b) OVER (PARTITION BY a)', "df['b'] / df.groupby('a')['b'].transform('sum')"],
  ['取年月', "strftime('%Y-%m', d)  /  MySQL: DATE_FORMAT(d, '%Y-%m')", "df['d'].dt.strftime('%Y-%m')"],
  ['日期差', "julianday(d2) - julianday(d1)  /  MySQL: DATEDIFF(d2, d1)", "(df['d2'] - df['d1']).dt.days"],
  ['日期加减', "date(d, '+7 day')  /  MySQL: DATE_ADD(d, INTERVAL 7 DAY)", "df['d'] + pd.Timedelta(days=7)"],
];
function pageCheat() {
  return `<div class="page wide t-sql prose">
    <div class="lesson-head"><div class="crumb"><span class="pill">速查</span></div><h1>SQL ↔ pandas 速查表</h1><p class="sub">同一件事的两种写法。SQL 列中的日期函数以 SQLite 为主，并标注了 MySQL 写法。</p></div>
    <table class="cheat"><thead><tr><th>操作</th><th>SQL</th><th>pandas</th></tr></thead><tbody>
    ${CHEAT.map(([a, s, p]) => `<tr><td>${a}</td><td><code>${esc(s)}</code></td><td><code>${esc(p)}</code></td></tr>`).join('')}
    </tbody></table></div>`;
}

/* 自测：在真实引擎里跑每道题的参考答案，判题器应判“正确”；再喂错误答案，应判“错误” */
function pageSelftest() {
  return `<div class="page t-sql"><div class="lesson-head"><h1>自测</h1><p class="sub">运行所有示例代码与参考答案，检查内容和判题器是否正常。需要加载 Python 环境。</p></div>
    <button class="btn primary" id="stGo">${ICON.play}开始自测</button> <span id="stSum"></span><div id="stLog" style="margin-top:16px"></div></div>`;
}
function afterSelftest() {
  $('#stGo').onclick = async () => {
    $('#stGo').disabled = true;
    const log = $('#stLog'), sum = $('#stSum');
    let ok = 0, bad = 0;
    const row = (pass, name, msg = '') => {
      pass ? ok++ : bad++;
      log.insertAdjacentHTML(pass ? 'beforeend' : 'afterbegin', `<div class="selftest-row"><span class="st ${pass ? 'ok' : 'bad'}">${pass ? 'PASS' : 'FAIL'}</span><span>${esc(name)}</span><span style="color:var(--muted)">${esc(msg)}</span></div>`);
      sum.textContent = `通过 ${ok}，失败 ${bad}`;
    };
    for (const T of Object.values(TRACKS)) for (const L of T.items) {
      const tpl = document.createElement('template'); tpl.innerHTML = L.body;
      for (const [k, t] of $$('textarea[data-run]', tpl.content).entries()) {
        const r = await execute(t.dataset.run, t.value.trim());
        row(!r.err, `${L.id} 示例 ${k + 1}`, r.err ? r.err.msg : `${r.total ?? ''} 行`);
      }
      for (const [i, ex] of (L.ex || []).entries()) {
        const lang = ex.lang || T.lang;
        const r = await check(lang, ex.sol, ex.sol, ex.ordered);
        const fine = !r.err && r.verdict?.pass && (r.kind !== 'table' || r.total > 0);
        row(fine, `${L.id} 练习 ${i + 1}`, r.err ? r.err.msg : r.verdict?.pass ? `${r.total ?? r.text ?? ''}` : r.verdict?.msg);
      }
    }
    const w1 = await check('sql', 'SELECT 1 AS x', 'SELECT user_id FROM users', false);
    row(!w1.verdict.pass, '判题器：SQL 错误答案应判错', w1.verdict.msg);
    const w2 = await check('py', 'result = users.head(3)', 'result = users.head(4)', false);
    row(!w2.verdict.pass, '判题器：pandas 错误答案应判错', w2.verdict.msg);
    const w3 = await check('py', "result = users.groupby('city').size()", "result = users['city'].value_counts().reset_index()", false);
    row(w3.verdict.pass, '判题器：等价写法应判对', w3.verdict.msg || 'ok');
    $('#stGo').disabled = false;
  };
}

/* ---------- 路由 ---------- */
function route() {
  const [a = '', b = ''] = location.hash.replace(/^#\/?/, '').split('/');
  let html, after = () => {}, cur = a || 'home', title = '';
  const T = TRACKS[a];
  if (T && b) {
    const idx = T.items.findIndex(L => L.id === b);
    if (idx < 0) { location.hash = '#/' + a; return; }
    html = pageLesson(T, idx); after = () => afterLesson(T, idx); cur = b; title = T.items[idx].title;
  } else if (T) { html = pageTrack(T); title = T.full; }
  else if (a === 'data') { html = pageData(); after = afterData; title = '数据集'; }
  else if (a === 'cheatsheet') { html = pageCheat(); after = () => hydrate(main); title = '速查表'; }
  else if (a === 'selftest') { html = pageSelftest(); after = afterSelftest; title = '自测'; }
  else { html = pageHome(); after = afterHome; cur = 'home'; }
  main.innerHTML = html;
  after();
  renderSidebar(cur);
  $$('#tabs a').forEach(x => x.classList.toggle('on', x.dataset.k === a));
  document.title = (title ? title + ' · ' : '') + '数析实验室 · SQL × pandas';
  document.body.classList.remove('drawer');
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
$('#menuBtn').onclick = () => document.body.classList.toggle('drawer');
$('#scrim').onclick = () => document.body.classList.remove('drawer');
$('#themeBtn').onclick = () => {
  const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('sqlpd-theme', document.documentElement.dataset.theme); } catch {}
};
route();
