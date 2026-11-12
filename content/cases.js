/* 业务场景实战：每题给出 指标定义 → 思路拆解 → SQL 解法 → pandas 解法 → 练习 */
window.COURSE = window.COURSE || {};
COURSE.cases = [
{
  id: 'c1', title: 'DAU / MAU 与用户粘性', sub: '活跃用户怎么数？日活、月活、粘性',
  body: `
<div class="def"><b>指标定义</b><br><b>DAU</b>（日活跃用户数）= 当天登录过的<b>去重</b>用户数；<b>MAU</b>（月活）= 当月登录过的去重用户数；<b>粘性</b> = 当月日均 DAU / MAU，越接近 1 说明用户越是天天来。</div>
<h2>思路拆解</h2>
<ol class="steps-list"><li>活跃以登录表 <code>logins</code> 为准，一人一天最多一行。</li><li>按日期分组，<code>COUNT(DISTINCT user_id)</code> 得到 DAU。</li><li>按月分组再去重得到 MAU——注意 <b>MAU ≠ 每天 DAU 相加</b>，同一个人一个月来 20 天只算 1 个月活。</li></ol>

<h2>SQL 解法</h2>
<textarea data-run="sql" data-chart="line">SELECT login_date AS 日期, COUNT(DISTINCT user_id) AS DAU
FROM logins
GROUP BY login_date
ORDER BY login_date;</textarea>
<textarea data-run="sql">WITH d AS (
    SELECT login_date, COUNT(DISTINCT user_id) AS dau
    FROM logins GROUP BY login_date
), m AS (
    SELECT strftime('%Y-%m', login_date) AS 月份, COUNT(DISTINCT user_id) AS MAU
    FROM logins GROUP BY 月份
)
SELECT m.月份, m.MAU,
       ROUND(AVG(d.dau), 1)         AS 日均DAU,
       ROUND(AVG(d.dau) / m.MAU, 3) AS 粘性
FROM m JOIN d ON strftime('%Y-%m', d.login_date) = m.月份
GROUP BY m.月份, m.MAU;</textarea>

<h2>pandas 解法</h2>
<textarea data-run="py">dau = logins.groupby('login_date')['user_id'].nunique()
mau = logins.groupby(logins['login_date'].dt.strftime('%Y-%m'))['user_id'].nunique()
avg_dau = dau.groupby(dau.index.strftime('%Y-%m')).mean()
pd.DataFrame({'MAU': mau, '日均DAU': avg_dau.round(1), '粘性': (avg_dau / mau).round(3)})</textarea>
<div class="tip">DAU 的“构成拆解”是常见追问：把当天活跃拆成<b>新用户</b>（当天注册）和<b>老用户</b>，就能判断活跃增长是靠拉新还是靠留存。练习 3 就是这个问题。</div>
`,
  ex: [
    { q: '<p>【SQL】统计每个月（YYYY-MM）的 MAU。返回：月份、MAU。</p>',
      sol: "SELECT strftime('%Y-%m', login_date) AS 月份, COUNT(DISTINCT user_id) AS MAU\nFROM logins\nGROUP BY 月份;", hint: '按月分组后 COUNT(DISTINCT user_id)。' },
    { q: '<p>【pandas】用 <code>resample(\'W\')</code> 统计每周的活跃用户数 WAU（周内去重）。</p>', lang: 'py',
      sol: `result = logins.set_index('login_date').resample('W')['user_id'].nunique()`, hint: "set_index('login_date').resample('W')['user_id'].nunique()。" },
    { q: '<p>【SQL】统计每天的 DAU，以及其中<b>新用户</b>（当天注册）的人数。返回：日期、DAU、新用户数。</p>',
      sol: 'SELECT l.login_date AS 日期,\n       COUNT(DISTINCT l.user_id) AS DAU,\n       COUNT(DISTINCT CASE WHEN u.register_date = l.login_date THEN l.user_id END) AS 新用户数\nFROM logins l JOIN users u ON l.user_id = u.user_id\nGROUP BY l.login_date;',
      hint: '关联 users 拿到注册日期；条件计数 COUNT(DISTINCT CASE WHEN register_date = login_date THEN user_id END)。' },
  ],
},
{
  id: 'c2', title: 'GMV 趋势与环比', sub: '月度 GMV、环比 / 同比、GMV 拆解',
  body: `
<div class="def"><b>指标定义</b><br><b>GMV</b> = 成交总额（这里取已支付订单的金额）。<b>环比</b> =（本期 − 上期）/ 上期，例如 3 月比 2 月；<b>同比</b> =（本期 − 去年同期）/ 去年同期。<b>客单价</b> = GMV / 订单数。</div>
<h2>思路拆解</h2>
<ol class="steps-list"><li>筛选已支付订单，按月汇总 GMV。</li><li>用窗口函数 <code>LAG</code>（pandas 用 <code>pct_change</code>）拿到上月值，计算环比。</li><li>进一步拆解：<b>GMV = 下单人数 × 人均订单数 × 客单价</b>，找到 GMV 变化的原因。</li></ol>
<h2>SQL 解法</h2>
<textarea data-run="sql" data-chart="combo">WITH m AS (
    SELECT strftime('%Y-%m', order_date) AS 月份, SUM(amount) AS GMV
    FROM orders
    WHERE status = '已支付'
    GROUP BY 月份
)
SELECT 月份, ROUND(GMV) AS GMV,
       ROUND((GMV - LAG(GMV) OVER (ORDER BY 月份)) / LAG(GMV) OVER (ORDER BY 月份), 4) AS 环比
FROM m;</textarea>
<p>2 月 GMV 环比下降——是人少了、买得少了，还是买得便宜了？拆开看：</p>
<textarea data-run="sql">SELECT strftime('%Y-%m', order_date) AS 月份,
       COUNT(DISTINCT user_id)                                AS 下单人数,
       ROUND(COUNT(*) * 1.0 / COUNT(DISTINCT user_id), 2)     AS 人均订单数,
       ROUND(SUM(amount) / COUNT(*), 1)                       AS 客单价,
       ROUND(SUM(amount))                                     AS GMV
FROM orders
WHERE status = '已支付'
GROUP BY 月份;</textarea>
<div class="mysql">同比需要去年数据（本数据集只有半年）。按月汇总后写 <code>LAG(GMV, 12) OVER (ORDER BY 月份)</code> 即可取到 12 个月前的值；更稳妥的做法是把“去年同月”关联进来：<code>ON a.月份 = DATE_FORMAT(DATE_SUB(b.月份日期, INTERVAL -1 YEAR), '%Y-%m')</code>，避免中间有月份缺失导致错位。</div>
<h2>pandas 解法</h2>
<textarea data-run="py">paid = orders[orders['status'] == '已支付']
m = paid.groupby(paid['order_date'].dt.strftime('%Y-%m')).agg(
    GMV=('amount', 'sum'), 订单数=('order_id', 'count'), 下单人数=('user_id', 'nunique'))
m['客单价'] = (m['GMV'] / m['订单数']).round(1)
m['环比'] = m['GMV'].pct_change().round(4)
m</textarea>
`,
  ex: [
    { q: '<p>【SQL】按月统计已支付的订单数、GMV、客单价（GMV / 订单数，保留 2 位小数）。返回：月份、订单数、GMV、客单价。</p>',
      sol: "SELECT strftime('%Y-%m', order_date) AS 月份,\n       COUNT(*) AS 订单数,\n       SUM(amount) AS GMV,\n       ROUND(SUM(amount) / COUNT(*), 2) AS 客单价\nFROM orders\nWHERE status = '已支付'\nGROUP BY 月份;", hint: 'GROUP BY 月份，三个聚合。' },
    { q: '<p>【pandas】计算每个品类每个月（YYYY-MM）的已支付 GMV 及其<b>环比</b>。返回四列：category、month、amount、mom（品类内按月计算环比，第一个月为空）。</p>', lang: 'py',
      sol: `df = orders[orders['status'] == '已支付'].merge(products, on='product_id')\ndf['month'] = df['order_date'].dt.strftime('%Y-%m')\nm = df.groupby(['category', 'month'], as_index=False)['amount'].sum()\nm['mom'] = m.groupby('category')['amount'].pct_change()\nresult = m`,
      hint: "groupby(['category', 'month']) 求和后，再 groupby('category')['amount'].pct_change()。" },
  ],
},
{
  id: 'c3', title: '分组 TopN', sub: '每个品类销量前三的商品',
  body: `
<div class="def"><b>问题</b>：每个品类中，已支付<b>销量</b>（件数 quantity 之和）排名前 3 的商品是哪些？“每组取前 N 名”是面试出现频率最高的 SQL 题之一。</div>
<h2>思路拆解</h2>
<ol class="steps-list"><li>先按商品汇总销量（聚合）。</li><li>在每个品类内部按销量排名（窗口函数 <code>PARTITION BY category</code>）。</li><li>外层筛选排名 ≤ 3。</li></ol>
<div data-viz="rank"></div>
<h2>SQL 解法</h2>
<textarea data-run="sql">WITH s AS (
    SELECT p.category, p.product_name, SUM(o.quantity) AS 销量
    FROM orders o JOIN products p ON o.product_id = p.product_id
    WHERE o.status = '已支付'
    GROUP BY p.category, p.product_name
), r AS (
    SELECT *, DENSE_RANK() OVER (PARTITION BY category ORDER BY 销量 DESC) AS 排名
    FROM s
)
SELECT category, product_name, 销量, 排名
FROM r
WHERE 排名 <= 3
ORDER BY category, 排名;</textarea>
<div class="tip"><b>用哪个排名函数？</b>“严格只要 3 个”用 <code>ROW_NUMBER</code>；“并列的都要”用 <code>DENSE_RANK</code> 或 <code>RANK</code>（可能返回多于 3 行）。面试时主动说明你对并列的处理，是加分项。</div>
<textarea data-run="sql" data-chart="hbar">-- 画个图：全站销量前 10 的商品
SELECT p.category || '·' || p.product_name AS 商品, SUM(o.quantity) AS 销量
FROM orders o JOIN products p ON o.product_id = p.product_id
WHERE o.status = '已支付'
GROUP BY 商品
ORDER BY 销量 DESC
LIMIT 10;</textarea>
<h2>pandas 解法</h2>
<textarea data-run="py">df = orders[orders['status'] == '已支付'].merge(products, on='product_id')
s = df.groupby(['category', 'product_name'], as_index=False)['quantity'].sum()
s['排名'] = s.groupby('category')['quantity'].rank(method='dense', ascending=False)
s[s['排名'] <= 3].sort_values(['category', '排名'])</textarea>
<p>只要每组固定前 N 行时，“先排序再 <code>groupby().head(n)</code>”更简洁：</p>
<textarea data-run="py">df = orders[orders['status'] == '已支付'].merge(products, on='product_id')
s = df.groupby(['category', 'product_name'], as_index=False)['quantity'].sum()
s.sort_values('quantity', ascending=False).groupby('category').head(3)</textarea>
`,
  ex: [
    { q: '<p>【SQL】找出每个城市已支付<b>消费总额最高的前 2 名</b>用户。返回：city、user_id、消费总额。</p>',
      sol: "WITH s AS (\n    SELECT u.city, o.user_id, SUM(o.amount) AS 消费总额\n    FROM orders o JOIN users u ON o.user_id = u.user_id\n    WHERE o.status = '已支付'\n    GROUP BY u.city, o.user_id\n), r AS (\n    SELECT *, ROW_NUMBER() OVER (PARTITION BY city ORDER BY 消费总额 DESC) AS rn\n    FROM s\n)\nSELECT city, user_id, 消费总额 FROM r WHERE rn <= 2;",
      hint: '先按 (城市, 用户) 汇总，再按城市分区排名，取 rn <= 2。' },
    { q: '<p>【pandas】找出每个月（YYYY-MM）已支付 <b>GMV 最高的 3 个商品</b>。返回：month、product_name、amount。</p>', lang: 'py',
      sol: `df = orders[orders['status'] == '已支付'].merge(products, on='product_id')\ndf['month'] = df['order_date'].dt.strftime('%Y-%m')\ns = df.groupby(['month', 'product_name'], as_index=False)['amount'].sum()\nresult = s.sort_values('amount', ascending=False).groupby('month').head(3)`,
      hint: "groupby(['month', 'product_name']) 求和 → 按 amount 降序 → groupby('month').head(3)。" },
  ],
},
{
  id: 'c4', title: '新用户留存', sub: '次日留存、N 日留存、留存矩阵（cohort）',
  body: `
<div class="def"><b>指标定义</b><br><b>第 N 日留存率</b> = 某天新增的用户中，在第 N 天又登录的人数 / 当天新增人数。<b>次日留存</b>即 N = 1。按新增日期（或月份）分批，每批一行，就是<b>留存矩阵</b>。</div>
<div data-viz="retention"></div>
<h2>SQL 解法</h2>
<p>先算整体次日留存。思路：每个用户的首日 → 用 LEFT JOIN 去找“首日 + 1 天”的登录记录：</p>
<textarea data-run="sql">WITH f AS (
    SELECT user_id, MIN(login_date) AS d0
    FROM logins GROUP BY user_id
)
SELECT COUNT(DISTINCT f.user_id) AS 新用户,
       COUNT(DISTINCT l.user_id) AS 次日回访,
       ROUND(COUNT(DISTINCT l.user_id) * 1.0 / COUNT(DISTINCT f.user_id), 4) AS 次日留存率
FROM f
LEFT JOIN logins l ON l.user_id = f.user_id AND l.login_date = date(f.d0, '+1 day');</textarea>
<p>再按注册月份做留存矩阵：先算出每次登录是首日后的第几天（dn），再用条件计数：</p>
<textarea data-run="sql" data-chart="heat">WITH f AS (
    SELECT user_id, MIN(login_date) AS d0 FROM logins GROUP BY user_id
), t AS (
    SELECT f.user_id, strftime('%Y-%m', f.d0) AS cohort,
           CAST(julianday(l.login_date) - julianday(f.d0) AS INTEGER) AS dn
    FROM f JOIN logins l ON f.user_id = l.user_id
)
SELECT cohort AS 注册月份,
  ROUND(COUNT(DISTINCT CASE WHEN dn = 1  THEN user_id END) * 1.0 / COUNT(DISTINCT user_id), 3) AS 次日,
  ROUND(COUNT(DISTINCT CASE WHEN dn = 3  THEN user_id END) * 1.0 / COUNT(DISTINCT user_id), 3) AS 第3日,
  ROUND(COUNT(DISTINCT CASE WHEN dn = 7  THEN user_id END) * 1.0 / COUNT(DISTINCT user_id), 3) AS 第7日,
  ROUND(COUNT(DISTINCT CASE WHEN dn = 14 THEN user_id END) * 1.0 / COUNT(DISTINCT user_id), 3) AS 第14日,
  ROUND(COUNT(DISTINCT CASE WHEN dn = 30 THEN user_id END) * 1.0 / COUNT(DISTINCT user_id), 3) AS 第30日
FROM t
GROUP BY cohort;</textarea>
<div class="warn"><b>观察期不足：</b>数据截止到 6 月 30 日，6 月中下旬注册的用户还没“活到”第 30 天，所以 6 月的第 30 日留存被低估。严谨的做法是只统计 <code>d0 &lt;= 截止日 − N</code> 的用户。</div>
<h2>pandas 解法</h2>
<textarea data-run="py" data-chart="heat">df = logins.copy()
df['d0'] = df.groupby('user_id')['login_date'].transform('min')
df['dn'] = (df['login_date'] - df['d0']).dt.days
df['cohort'] = df['d0'].dt.strftime('%Y-%m')
mat = df.pivot_table(index='cohort', columns='dn', values='user_id', aggfunc='nunique')
rate = mat.div(mat[0], axis=0)          # 每行除以第 0 天人数
rate[[1, 3, 7, 14, 30]].round(3)</textarea>
`,
  ex: [
    { q: '<p>【SQL】计算整体的<b>第 7 日留存率</b>（首次登录后第 7 天登录的人数 / 新用户总数，保留 4 位小数）。返回一个数字。</p>',
      sol: "WITH f AS (\n    SELECT user_id, MIN(login_date) AS d0 FROM logins GROUP BY user_id\n)\nSELECT ROUND(COUNT(DISTINCT l.user_id) * 1.0 / COUNT(DISTINCT f.user_id), 4) AS 第7日留存率\nFROM f\nLEFT JOIN logins l ON l.user_id = f.user_id AND l.login_date = date(f.d0, '+7 day');",
      hint: "把示例中的 '+1 day' 改成 '+7 day'，只返回比率一列。" },
    { q: '<p>【pandas】按注册渠道 <code>channel</code> 计算第 7 日留存率（用户注册日即首次登录日）。返回 channel 和留存率。</p>', lang: 'py',
      sol: `df = logins.merge(users[['user_id', 'register_date', 'channel']], on='user_id')\nkept = df[(df['login_date'] - df['register_date']).dt.days == 7]\nresult = kept.groupby('channel')['user_id'].nunique() / users.groupby('channel')['user_id'].nunique()`,
      hint: '合并出注册日，筛选“登录日 − 注册日 = 7 天”的记录，按渠道数去重人数，再除以各渠道总人数。' },
  ],
},
{
  id: 'c5', title: '转化漏斗', sub: '浏览 → 加购 → 下单 → 支付，每一步流失了多少',
  body: `
<div class="def"><b>指标定义</b><br>漏斗把用户行为拆成有先后顺序的步骤。<b>步骤转化率</b> = 本步人数 / 上一步人数；<b>整体转化率</b> = 本步人数 / 第一步人数。转化率最低的一步，就是最值得优化的环节。</div>
<h2>思路拆解</h2>
<ol class="steps-list"><li>按 event_type 统计去重用户数。</li><li>给步骤定义顺序（CASE WHEN 映射成 1~4）。</li><li>用 <code>LAG</code> 拿上一步人数、<code>FIRST_VALUE</code> 拿第一步人数，相除。</li></ol>
<h2>SQL 解法</h2>
<textarea data-run="sql" data-chart="funnel">WITH s AS (
    SELECT event_type AS 步骤,
           COUNT(DISTINCT user_id) AS 人数,
           CASE event_type WHEN '浏览' THEN 1 WHEN '加购' THEN 2 WHEN '下单' THEN 3 ELSE 4 END AS 序号
    FROM events
    GROUP BY event_type
)
SELECT 步骤, 人数,
       ROUND(人数 * 1.0 / LAG(人数) OVER (ORDER BY 序号), 4)         AS 步骤转化率,
       ROUND(人数 * 1.0 / FIRST_VALUE(人数) OVER (ORDER BY 序号), 4) AS 整体转化率
FROM s
ORDER BY 序号;</textarea>
<div class="tip">这里是<b>宽松漏斗</b>：只要做过某一步就计入。<b>严格漏斗</b>要求按顺序完成（例如必须先浏览再加购，且在同一会话内），需要比较每个用户各步骤的首次时间：<code>MIN(CASE WHEN event_type='加购' THEN event_time END) &gt; MIN(CASE WHEN event_type='浏览' THEN event_time END)</code>。</div>
<h2>pandas 解法</h2>
<textarea data-run="py" data-chart="funnel">steps = ['浏览', '加购', '下单', '支付']
f = events.groupby('event_type')['user_id'].nunique().reindex(steps).to_frame('人数')
f['步骤转化率'] = (f['人数'] / f['人数'].shift(1)).round(4)
f['整体转化率'] = (f['人数'] / f['人数'].iloc[0]).round(4)
f</textarea>
<p>按渠道拆开看，哪个渠道的用户转化更好？</p>
<textarea data-run="py">steps = ['浏览', '加购', '下单', '支付']
df = events.merge(users[['user_id', 'channel']], on='user_id')
t = df.pivot_table(index='channel', columns='event_type', values='user_id', aggfunc='nunique')[steps]
t['浏览→支付'] = (t['支付'] / t['浏览']).round(3)
t.sort_values('浏览→支付', ascending=False)</textarea>
`,
  ex: [
    { q: '<p>【SQL】计算每个注册渠道“浏览 → 支付”的整体转化率（支付人数 / 浏览人数，保留 4 位小数）。返回：channel、转化率。</p>',
      sol: "SELECT u.channel,\n       ROUND(COUNT(DISTINCT CASE WHEN e.event_type = '支付' THEN e.user_id END) * 1.0\n           / COUNT(DISTINCT CASE WHEN e.event_type = '浏览' THEN e.user_id END), 4) AS 转化率\nFROM events e JOIN users u ON e.user_id = u.user_id\nGROUP BY u.channel;",
      hint: '关联 users 拿渠道；分子分母都用 COUNT(DISTINCT CASE WHEN …)。' },
    { q: '<p>【pandas】按月（event_time 的 YYYY-MM）统计漏斗每一步的人数：月份为行，<b>列顺序依次为 浏览、加购、下单、支付</b>。</p>', lang: 'py',
      sol: `df = events.assign(month=events['event_time'].dt.strftime('%Y-%m'))\nresult = df.pivot_table(index='month', columns='event_type', values='user_id', aggfunc='nunique')[['浏览', '加购', '下单', '支付']]`,
      hint: "pivot_table(index='month', columns='event_type', values='user_id', aggfunc='nunique')，最后用列表调整列顺序。" },
  ],
},
{
  id: 'c6', title: '连续登录 N 天', sub: '经典难题：日期 − 行号 分组法',
  body: `
<div class="def"><b>问题</b>：找出连续登录天数 ≥ N 的用户，或者计算每个用户的最长连续登录天数。类似的还有“连续 3 天下单”“连续 N 个月增长”，套路完全相同。</div>
<div data-viz="streak"></div>
<h2>SQL 解法</h2>
<textarea data-run="sql">WITH t AS (
    SELECT user_id, login_date,
           date(login_date, '-' || ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) || ' day') AS grp
    FROM logins
), s AS (
    SELECT user_id, grp, COUNT(*) AS 连续天数, MIN(login_date) AS 开始, MAX(login_date) AS 结束
    FROM t
    GROUP BY user_id, grp
)
SELECT * FROM s
ORDER BY 连续天数 DESC, user_id
LIMIT 10;</textarea>
<div class="mysql">MySQL 写法：<code>DATE_SUB(login_date, INTERVAL ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) DAY) AS grp</code>。如果一个用户一天可能有多条登录记录，要先 <code>SELECT DISTINCT user_id, login_date</code> 去重，否则行号会错位。</div>
<p>每个用户的最长连续天数分布：</p>
<textarea data-run="sql" data-chart="bar">WITH t AS (
    SELECT user_id,
           date(login_date, '-' || ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) || ' day') AS grp
    FROM logins
), s AS (
    SELECT user_id, grp, COUNT(*) AS 天数 FROM t GROUP BY user_id, grp
), mx AS (
    SELECT user_id, MAX(天数) AS 最长连续 FROM s GROUP BY user_id
)
SELECT CASE WHEN 最长连续 >= 10 THEN '10天+' ELSE printf('%02d天', 最长连续) END AS 最长连续天数,
       COUNT(*) AS 用户数
FROM mx
GROUP BY 最长连续天数
ORDER BY 最长连续天数;</textarea>
<h2>pandas 解法</h2>
<textarea data-run="py">df = logins.sort_values(['user_id', 'login_date']).copy()
rn = df.groupby('user_id').cumcount()                     # 0, 1, 2, …
df['grp'] = df['login_date'] - pd.to_timedelta(rn, unit='D')
s = (df.groupby(['user_id', 'grp'])
       .agg(连续天数=('login_date', 'size'), 开始=('login_date', 'min'), 结束=('login_date', 'max'))
       .reset_index())
s.sort_values(['连续天数', 'user_id'], ascending=[False, True]).head(10)</textarea>
`,
  ex: [
    { q: '<p>【SQL】有多少用户曾经<b>连续登录至少 7 天</b>？返回一个数字。</p>',
      sol: "WITH t AS (\n    SELECT user_id,\n           date(login_date, '-' || ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) || ' day') AS grp\n    FROM logins\n), s AS (\n    SELECT user_id, grp, COUNT(*) AS 天数 FROM t GROUP BY user_id, grp\n)\nSELECT COUNT(DISTINCT user_id) AS 用户数 FROM s WHERE 天数 >= 7;",
      hint: '先按示例求出每段连续的天数，再筛选 ≥ 7 并对用户去重计数。' },
    { q: '<p>【pandas】找出最长连续登录天数 <b>≥ 10 天</b>的用户。返回两列：user_id、最长连续天数。</p>', lang: 'py',
      sol: `df = logins.sort_values(['user_id', 'login_date']).copy()\ndf['grp'] = df['login_date'] - pd.to_timedelta(df.groupby('user_id').cumcount(), unit='D')\nmx = df.groupby(['user_id', 'grp']).size().groupby('user_id').max()\nresult = mx[mx >= 10]`,
      hint: "groupby(['user_id', 'grp']).size() 得到每段天数，再 groupby('user_id').max()，最后筛选。" },
  ],
},
{
  id: 'c7', title: '复购率与回购率', sub: '用户会不会再来买？',
  body: `
<div class="def"><b>指标定义</b><br><b>复购率</b> = 统计周期内购买 ≥ 2 次的用户数 / 有购买的用户数。<b>回购率</b> = 上一周期购买的用户中，本周期<b>再次</b>购买的比例。复购看“周期内”，回购看“跨周期”。</div>
<h2>SQL 解法</h2>
<textarea data-run="sql">WITH t AS (
    SELECT user_id, COUNT(*) AS n
    FROM orders WHERE status = '已支付'
    GROUP BY user_id
)
SELECT COUNT(*) AS 购买用户数,
       SUM(CASE WHEN n >= 2 THEN 1 ELSE 0 END) AS 复购用户数,
       ROUND(SUM(CASE WHEN n >= 2 THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 4) AS 复购率
FROM t;</textarea>
<p>按月看复购率（当月买 ≥ 2 次）：</p>
<textarea data-run="sql" data-chart="bar">WITH t AS (
    SELECT strftime('%Y-%m', order_date) AS 月份, user_id, COUNT(*) AS n
    FROM orders WHERE status = '已支付'
    GROUP BY 月份, user_id
)
SELECT 月份, ROUND(SUM(CASE WHEN n >= 2 THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 4) AS 月复购率
FROM t
GROUP BY 月份;</textarea>
<p>月度回购率：把“用户 × 月份”表和自己关联，条件是“同一用户、下个月”：</p>
<textarea data-run="sql">WITH m AS (
    SELECT DISTINCT user_id, strftime('%Y-%m', order_date) AS 月份
    FROM orders WHERE status = '已支付'
)
SELECT a.月份,
       COUNT(DISTINCT a.user_id) AS 当月购买,
       COUNT(DISTINCT b.user_id) AS 次月回购,
       ROUND(COUNT(DISTINCT b.user_id) * 1.0 / COUNT(DISTINCT a.user_id), 4) AS 回购率
FROM m a
LEFT JOIN m b ON a.user_id = b.user_id
             AND b.月份 = strftime('%Y-%m', date(a.月份 || '-01', '+1 month'))
GROUP BY a.月份;</textarea>
<div class="warn">6 月的回购率为 0 不是因为用户不回来，而是还没有 7 月的数据——和留存一样要注意<b>观察期</b>。</div>
<h2>pandas 解法</h2>
<textarea data-run="py">paid = orders[orders['status'] == '已支付']
n = paid.groupby('user_id').size()
print('整体复购率:', round((n >= 2).mean(), 4))      # 布尔值的均值 = True 的比例

month = paid['order_date'].dt.strftime('%Y-%m')
cnt = paid.groupby([month, 'user_id']).size()
(cnt >= 2).groupby(level=0).mean().round(4)</textarea>
`,
  ex: [
    { q: '<p>【SQL】计算每个品类的复购率：在该品类已支付购买 ≥ 2 次的用户数 / 在该品类有购买的用户数（保留 4 位小数）。返回：category、复购率。</p>',
      sol: "WITH t AS (\n    SELECT p.category, o.user_id, COUNT(*) AS n\n    FROM orders o JOIN products p ON o.product_id = p.product_id\n    WHERE o.status = '已支付'\n    GROUP BY p.category, o.user_id\n)\nSELECT category, ROUND(SUM(CASE WHEN n >= 2 THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 4) AS 复购率\nFROM t\nGROUP BY category;",
      hint: '先按 (品类, 用户) 统计购买次数，再按品类计算 n >= 2 的比例。' },
    { q: '<p>【pandas】计算每个月（YYYY-MM）的复购率（当月已支付购买 ≥ 2 次的用户 / 当月购买用户）。</p>', lang: 'py',
      sol: `paid = orders[orders['status'] == '已支付']\ncnt = paid.groupby([paid['order_date'].dt.strftime('%Y-%m'), 'user_id']).size()\nresult = (cnt >= 2).groupby(level=0).mean()`,
      hint: '按 [月份, 用户] 计数，(cnt >= 2) 后按第一层索引求均值。' },
  ],
},
{
  id: 'c8', title: 'RFM 用户分层', sub: '按最近消费、频次、金额把用户分成 8 类',
  body: `
<div class="def"><b>指标定义</b>（以 2024-07-01 为“今天”，只看已支付订单）<br><b>R</b> = 今天 − 最近一次购买日期（天）；<b>F</b> = 购买次数；<b>M</b> = 消费总额。R 低于平均为“高”（最近来过），F、M 高于平均为“高”。</div>
<div data-viz="rfm"></div>
<h2>SQL 解法</h2>
<textarea data-run="sql">WITH r AS (
    SELECT user_id,
           CAST(julianday('2024-07-01') - julianday(MAX(order_date)) AS INTEGER) AS R,
           COUNT(*)    AS F,
           SUM(amount) AS M
    FROM orders
    WHERE status = '已支付'
    GROUP BY user_id
), a AS (
    SELECT AVG(R) AS ar, AVG(F) AS af, AVG(M) AS am FROM r
)
SELECT r.*,
       (CASE WHEN R < ar THEN '1' ELSE '0' END) ||
       (CASE WHEN F > af THEN '1' ELSE '0' END) ||
       (CASE WHEN M > am THEN '1' ELSE '0' END) AS RFM编码
FROM r, a
LIMIT 10;</textarea>
<textarea data-run="sql" data-chart="hbar">WITH r AS (
    SELECT user_id,
           julianday('2024-07-01') - julianday(MAX(order_date)) AS R,
           COUNT(*) AS F, SUM(amount) AS M
    FROM orders WHERE status = '已支付' GROUP BY user_id
), a AS (SELECT AVG(R) AS ar, AVG(F) AS af, AVG(M) AS am FROM r),
s AS (
    SELECT (CASE WHEN R < ar THEN '1' ELSE '0' END) || (CASE WHEN F > af THEN '1' ELSE '0' END) ||
           (CASE WHEN M > am THEN '1' ELSE '0' END) AS code
    FROM r, a
)
SELECT CASE code WHEN '111' THEN '重要价值' WHEN '101' THEN '重要发展' WHEN '011' THEN '重要保持'
                 WHEN '001' THEN '重要挽留' WHEN '110' THEN '一般价值' WHEN '100' THEN '一般发展'
                 WHEN '010' THEN '一般保持' ELSE '一般挽留' END AS 用户类型,
       COUNT(*) AS 用户数
FROM s
GROUP BY 用户类型
ORDER BY 用户数 DESC;</textarea>
<h2>pandas 解法</h2>
<textarea data-run="py">paid = orders[orders['status'] == '已支付']
today = pd.Timestamp('2024-07-01')
rfm = paid.groupby('user_id').agg(last=('order_date', 'max'), F=('order_id', 'count'), M=('amount', 'sum'))
rfm['R'] = (today - rfm['last']).dt.days

code = ((rfm['R'] < rfm['R'].mean()).astype(int).astype(str)
        + (rfm['F'] > rfm['F'].mean()).astype(int).astype(str)
        + (rfm['M'] > rfm['M'].mean()).astype(int).astype(str))
names = {'111': '重要价值', '101': '重要发展', '011': '重要保持', '001': '重要挽留',
         '110': '一般价值', '100': '一般发展', '010': '一般保持', '000': '一般挽留'}
rfm['用户类型'] = code.map(names)
rfm['用户类型'].value_counts()</textarea>
<div class="tip">也可以用 <code>pd.qcut(rfm['M'], 5, labels=[1, 2, 3, 4, 5])</code> 按分位数打 1~5 分，得到更细的分层。</div>
`,
  ex: [
    { q: '<p>【SQL】计算每个用户的 R、F、M（已支付订单，今天 = 2024-07-01，R 为整数天）。返回：user_id、R、F、M。</p>',
      sol: "SELECT user_id,\n       CAST(julianday('2024-07-01') - julianday(MAX(order_date)) AS INTEGER) AS R,\n       COUNT(*) AS F,\n       SUM(amount) AS M\nFROM orders\nWHERE status = '已支付'\nGROUP BY user_id;",
      hint: "julianday('2024-07-01') - julianday(MAX(order_date))。" },
    { q: '<p>【pandas】统计“重要价值用户”（R 低于平均、F 高于平均、M 高于平均）的人数。返回一个数字。</p>', lang: 'py',
      sol: `paid = orders[orders['status'] == '已支付']\nrfm = paid.groupby('user_id').agg(last=('order_date', 'max'), F=('order_id', 'count'), M=('amount', 'sum'))\nrfm['R'] = (pd.Timestamp('2024-07-01') - rfm['last']).dt.days\nresult = int(((rfm['R'] < rfm['R'].mean()) & (rfm['F'] > rfm['F'].mean()) & (rfm['M'] > rfm['M'].mean())).sum())`,
      hint: '三个布尔条件用 & 连接后 sum()。' },
  ],
},
{
  id: 'c9', title: '累计值与移动平均', sub: '累计 GMV、7 日均线、补齐缺失日期',
  body: `
<div class="def"><b>指标定义</b><br><b>累计值</b>：从起点到当前的总和（年初至今 YTD 等）。<b>N 日移动平均</b>：最近 N 天的平均值，用来平滑每日波动、看清趋势。</div>
<div data-viz="rolling"></div>
<h2>SQL 解法</h2>
<p>先注意一个细节：有些日子可能没有订单，直接 GROUP BY 会<b>缺这一天</b>，导致“7 行”不等于“7 天”。用<b>递归 CTE</b> 生成完整日历再 LEFT JOIN：</p>
<textarea data-run="sql" data-chart="line">WITH RECURSIVE cal(d) AS (
    SELECT '2024-01-01'
    UNION ALL
    SELECT date(d, '+1 day') FROM cal WHERE d < '2024-06-30'
), daily AS (
    SELECT cal.d AS 日期, COALESCE(SUM(o.amount), 0) AS 日GMV
    FROM cal
    LEFT JOIN orders o ON o.order_date = cal.d AND o.status = '已支付'
    GROUP BY cal.d
)
SELECT 日期, 日GMV,
       ROUND(AVG(日GMV) OVER (ORDER BY 日期 ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 1) AS 七日均线
FROM daily;</textarea>
<textarea data-run="sql" data-chart="line">WITH m AS (
    SELECT strftime('%Y-%m', order_date) AS 月份, SUM(amount) AS GMV
    FROM orders WHERE status = '已支付'
    GROUP BY 月份
)
SELECT 月份, ROUND(GMV) AS GMV,
       ROUND(SUM(GMV) OVER (ORDER BY 月份)) AS 累计GMV
FROM m;</textarea>
<h2>pandas 解法</h2>
<p><code>resample('D')</code> 天然会补齐缺失日期（填 0），省去了日历表：</p>
<textarea data-run="py" data-chart="line">paid = orders[orders['status'] == '已支付']
daily = paid.set_index('order_date').resample('D')['amount'].sum().to_frame('日GMV')
daily['七日均线'] = daily['日GMV'].rolling(7, min_periods=1).mean().round(1)
daily</textarea>
<textarea data-run="py"># 每个代码框独立运行，所以这里重新算一次 daily
daily = orders[orders['status'] == '已支付'].set_index('order_date').resample('D')['amount'].sum().to_frame('日GMV')
daily['累计GMV'] = daily['日GMV'].cumsum()
daily['累计占全期比例'] = (daily['累计GMV'] / daily['日GMV'].sum()).round(3)
daily.tail()</textarea>
`,
  ex: [
    { q: '<p>【SQL】计算每个月（YYYY-MM）的已支付 GMV，以及<b>截至当月的累计 GMV</b>。返回：月份、GMV、累计GMV。</p>',
      sol: "WITH m AS (\n    SELECT strftime('%Y-%m', order_date) AS 月份, SUM(amount) AS GMV\n    FROM orders WHERE status = '已支付'\n    GROUP BY 月份\n)\nSELECT 月份, GMV, SUM(GMV) OVER (ORDER BY 月份) AS 累计GMV\nFROM m;",
      hint: 'SUM(GMV) OVER (ORDER BY 月份) 就是累计。' },
    { q: '<p>【pandas】计算每日已支付 GMV（<code>resample(\'D\')</code>，没有订单的日子为 0）的 <b>7 日移动平均</b>（<code>rolling(7)</code>，前 6 天为空）。返回这个 Series。</p>', lang: 'py',
      sol: `paid = orders[orders['status'] == '已支付']\nresult = paid.set_index('order_date').resample('D')['amount'].sum().rolling(7).mean()`,
      hint: "resample('D')['amount'].sum().rolling(7).mean()。" },
  ],
},
{
  id: 'c10', title: '帕累托与 ABC 分析', sub: '二八法则：少数商品贡献了大部分销售额吗？',
  body: `
<div class="def"><b>方法</b><br>把商品按销售额从高到低排序，计算<b>累计销售额占比</b>。<b>ABC 分类</b>：累计占比 ≤ 70% 的为 A 类（重点商品），70%~90% 为 B 类，其余为 C 类。</div>
<h2>SQL 解法</h2>
<textarea data-run="sql" data-chart="pareto">WITH s AS (
    SELECT p.product_name, SUM(o.amount) AS 销售额
    FROM orders o JOIN products p ON o.product_id = p.product_id
    WHERE o.status = '已支付'
    GROUP BY p.product_name
)
SELECT product_name, ROUND(销售额) AS 销售额,
       ROUND(SUM(销售额) OVER (ORDER BY 销售额 DESC ROWS UNBOUNDED PRECEDING) / SUM(销售额) OVER (), 4) AS 累计占比
FROM s
ORDER BY 销售额 DESC;</textarea>
<div class="warn">累计求和时写上 <code>ROWS UNBOUNDED PRECEDING</code>。默认的窗口范围是 RANGE，遇到销售额相同的商品会把它们“一起”累加，得到相同的累计值。</div>
<textarea data-run="sql">WITH s AS (
    SELECT p.product_name, SUM(o.amount) AS 销售额
    FROM orders o JOIN products p ON o.product_id = p.product_id
    WHERE o.status = '已支付'
    GROUP BY p.product_name
), c AS (
    SELECT product_name, 销售额,
           SUM(销售额) OVER (ORDER BY 销售额 DESC ROWS UNBOUNDED PRECEDING) / SUM(销售额) OVER () AS cum
    FROM s
)
SELECT CASE WHEN cum <= 0.7 THEN 'A' WHEN cum <= 0.9 THEN 'B' ELSE 'C' END AS 类别,
       COUNT(*) AS 商品数, ROUND(SUM(销售额)) AS 销售额
FROM c
GROUP BY 类别;</textarea>
<h2>pandas 解法</h2>
<textarea data-run="py" data-chart="pareto">df = orders[orders['status'] == '已支付'].merge(products, on='product_id')
s = df.groupby('product_name')['amount'].sum().sort_values(ascending=False).to_frame('销售额')
s['累计占比'] = (s['销售额'].cumsum() / s['销售额'].sum()).round(4)
s['ABC类'] = pd.cut(s['累计占比'], bins=[0, 0.7, 0.9, 1.0001], labels=['A', 'B', 'C'])
top20 = s['销售额'].head(int(len(s) * 0.2)).sum() / s['销售额'].sum()
print(f'前 20% 的商品贡献了 {top20:.1%} 的销售额')
s</textarea>
`,
  ex: [
    { q: '<p>【SQL】按上面的规则做 ABC 分类，统计每类的<b>商品数</b>。返回：类别、商品数。</p>',
      sol: "WITH s AS (\n    SELECT p.product_name, SUM(o.amount) AS 销售额\n    FROM orders o JOIN products p ON o.product_id = p.product_id\n    WHERE o.status = '已支付'\n    GROUP BY p.product_name\n), c AS (\n    SELECT 销售额,\n           SUM(销售额) OVER (ORDER BY 销售额 DESC ROWS UNBOUNDED PRECEDING) / SUM(销售额) OVER () AS cum\n    FROM s\n)\nSELECT CASE WHEN cum <= 0.7 THEN 'A' WHEN cum <= 0.9 THEN 'B' ELSE 'C' END AS 类别, COUNT(*) AS 商品数\nFROM c\nGROUP BY 类别;",
      hint: '先算累计占比 cum，再用 CASE WHEN 分类计数。' },
    { q: '<p>【pandas】销售额从高到低累加，<b>最少需要多少个商品</b>，累计销售额才能达到总销售额的 80%？返回一个整数。</p>', lang: 'py',
      sol: `df = orders[orders['status'] == '已支付'].merge(products, on='product_id')\ns = df.groupby('product_name')['amount'].sum().sort_values(ascending=False)\ncum = s.cumsum() / s.sum()\nresult = int((cum < 0.8).sum() + 1)`,
      hint: '累计占比 < 0.8 的商品个数再加 1，就是刚好跨过 80% 的那个商品的位置。' },
  ],
},
];
