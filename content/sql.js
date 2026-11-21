/* SQL 课程。约定：<textarea data-run="sql"> 可运行代码，<textarea data-code="sql"> 静态代码，<div data-viz="名称"> 可视化 */
window.COURSE = window.COURSE || {};
COURSE.sql = [
{
  id: 's1', title: '查询基础', sub: 'SELECT · WHERE · ORDER BY · LIMIT · DISTINCT',
  body: `
<p>SQL 就是用“接近英语”的句子向数据库要数据：<b>从哪张表</b>（FROM）、<b>满足什么条件</b>（WHERE）、<b>要哪些列</b>（SELECT）、<b>怎么排序</b>（ORDER BY）、<b>要几行</b>（LIMIT）。下面每个代码框都可以直接修改并点 <b>运行</b>（快捷键 Ctrl/⌘ + Enter）。</p>

<h2>第一条查询</h2>
<p><code>*</code> 表示所有列，<code>LIMIT 5</code> 只取前 5 行——查看一张新表时的第一件事。</p>
<textarea data-run="sql">SELECT * FROM users LIMIT 5;</textarea>
<p>只要部分列时把列名用逗号隔开，<code>AS</code> 可以给列起别名（中文别名也可以）：</p>
<textarea data-run="sql">SELECT user_id, city, age AS 年龄
FROM users
LIMIT 5;</textarea>

<h2>WHERE：按条件筛选行</h2>
<div data-viz="filter"></div>
<table>
<tr><th>写法</th><th>含义</th><th>例子</th></tr>
<tr><td><code>=  &lt;&gt;  &gt;  &gt;=  &lt;  &lt;=</code></td><td>比较（不等于也可写 <code>!=</code>）</td><td><code>age &gt;= 30</code></td></tr>
<tr><td><code>AND / OR / NOT</code></td><td>且 / 或 / 非</td><td><code>city = '北京' AND age &lt; 25</code></td></tr>
<tr><td><code>BETWEEN a AND b</code></td><td>在区间内（含两端）</td><td><code>price BETWEEN 100 AND 200</code></td></tr>
<tr><td><code>IN (…)</code></td><td>等于列表中任一值</td><td><code>city IN ('北京', '上海')</code></td></tr>
<tr><td><code>LIKE</code></td><td>模糊匹配：<code>%</code> 任意多个字符，<code>_</code> 一个字符</td><td><code>product_name LIKE '%耳机%'</code></td></tr>
<tr><td><code>IS NULL / IS NOT NULL</code></td><td>是否为空</td><td><code>age IS NULL</code></td></tr>
</table>
<textarea data-run="sql">SELECT user_id, city, age, channel
FROM users
WHERE city IN ('北京', '上海')
  AND age BETWEEN 25 AND 30;</textarea>
<div class="warn"><code>AND</code> 的优先级高于 <code>OR</code>。<code>WHERE city = '北京' OR city = '上海' AND age &gt; 30</code> 实际是“北京的所有人 + 上海 30 岁以上的人”。混用时一定加括号：<code>(city = '北京' OR city = '上海') AND age &gt; 30</code>。</div>

<h2>ORDER BY 排序与 LIMIT</h2>
<p><code>ORDER BY 列 DESC</code> 降序，<code>ASC</code>（默认）升序；可以按多列排序，前一列相同时再比较后一列。</p>
<textarea data-run="sql">-- 金额最高的 10 笔订单；金额相同时按订单号升序
SELECT order_id, user_id, amount, order_date
FROM orders
ORDER BY amount DESC, order_id
LIMIT 10;</textarea>

<h2>DISTINCT 去重与计算列</h2>
<textarea data-run="sql">SELECT DISTINCT category FROM products;</textarea>
<p>SELECT 中可以直接做运算，生成新列：</p>
<textarea data-run="sql">SELECT order_id, amount, quantity,
       amount / quantity AS unit_price,
       amount * 0.9 AS 九折后
FROM orders
LIMIT 5;</textarea>
<div class="tip">SQL 关键字不区分大小写，但习惯上关键字大写、表名列名小写；字符串用<b>单引号</b>；一条语句以分号结束。</div>
`,
  ex: [
    { q: '<p>查询来自 <b>“抖音”</b> 渠道、且年龄<b>小于 25 岁</b>的用户，返回 <code>user_id, city, age</code> 三列。</p>',
      sol: "SELECT user_id, city, age\nFROM users\nWHERE channel = '抖音' AND age < 25;",
      hint: '两个条件用 AND 连接；字符串要加单引号。' },
    { q: '<p>找出金额最高的 <b>5</b> 笔订单，返回 <code>order_id, user_id, amount</code>，按金额从高到低排序，金额相同按 order_id 升序。</p>', ordered: true,
      sol: 'SELECT order_id, user_id, amount\nFROM orders\nORDER BY amount DESC, order_id\nLIMIT 5;',
      hint: 'ORDER BY amount DESC, order_id 然后 LIMIT 5。' },
    { q: '<p>订单表中一共出现过哪些不同的订单状态 <code>status</code>？</p>',
      sol: 'SELECT DISTINCT status FROM orders;', hint: '用 DISTINCT。' },
    { q: '<p>查询商品名包含“<b>耳机</b>”，或者价格在 <b>100 到 200 元之间</b>（含两端）的商品，返回全部列。</p>',
      sol: "SELECT *\nFROM products\nWHERE product_name LIKE '%耳机%'\n   OR price BETWEEN 100 AND 200;",
      hint: "LIKE '%耳机%' 与 BETWEEN … AND … 用 OR 连接。" },
  ],
},
{
  id: 's2', title: '聚合与分组', sub: 'COUNT · SUM · AVG · GROUP BY · HAVING',
  body: `
<p>数据分析的核心问题大多是“<b>按某个维度，统计某个指标</b>”：每个城市多少用户？每个品类卖了多少钱？这就是聚合与分组。</p>

<h2>聚合函数</h2>
<p>聚合函数把很多行“压缩”成一个值：<code>COUNT</code> 计数、<code>SUM</code> 求和、<code>AVG</code> 平均、<code>MAX</code> / <code>MIN</code> 最大最小。</p>
<textarea data-run="sql">SELECT COUNT(*)              AS 订单数,
       SUM(amount)           AS 总金额,
       ROUND(AVG(amount), 2) AS 平均金额,
       MAX(amount)           AS 最大金额,
       COUNT(DISTINCT user_id) AS 下单人数
FROM orders;</textarea>

<h2>GROUP BY：分组统计</h2>
<div data-viz="groupby"></div>
<textarea data-run="sql">SELECT city, COUNT(*) AS 用户数
FROM users
GROUP BY city
ORDER BY 用户数 DESC;</textarea>
<p>可以按多列分组，每种组合一行：</p>
<textarea data-run="sql">SELECT city, gender, COUNT(*) AS 用户数, ROUND(AVG(age), 1) AS 平均年龄
FROM users
GROUP BY city, gender
ORDER BY city, gender;</textarea>
<div class="warn"><b>规则：SELECT 里出现的非聚合列，必须写在 GROUP BY 里。</b> 例如 <code>SELECT city, gender, COUNT(*) … GROUP BY city</code> 是错误的写法——每个城市有男有女，数据库不知道该显示哪个。</div>
<div class="mysql">MySQL 5.7+ 默认开启 <code>ONLY_FULL_GROUP_BY</code>，违反上面规则会直接报错；SQLite 不报错但结果不可靠，请养成好习惯。</div>

<h2>HAVING：筛选分组</h2>
<p><code>WHERE</code> 在分组<b>之前</b>筛选行，<code>HAVING</code> 在分组<b>之后</b>筛选组。看懂下面的执行顺序，就再也不会混淆：</p>
<div data-viz="order"></div>
<textarea data-run="sql">-- 已支付订单数不少于 10 笔的用户，按总金额降序
SELECT user_id, COUNT(*) AS 订单数, SUM(amount) AS 总金额
FROM orders
WHERE status = '已支付'          -- 先筛行
GROUP BY user_id
HAVING COUNT(*) >= 10            -- 再筛组
ORDER BY 总金额 DESC;</textarea>
<div class="tip"><code>COUNT(*)</code> 数行数，<code>COUNT(DISTINCT user_id)</code> 数不同用户数。“订单数”和“下单人数”是两个完全不同的指标，写之前先想清楚要哪个。</div>
`,
  ex: [
    { q: '<p>统计每个注册渠道 <code>channel</code> 的用户数。返回两列：渠道、用户数。</p>',
      sol: 'SELECT channel, COUNT(*) AS 用户数\nFROM users\nGROUP BY channel;', hint: 'GROUP BY channel，SELECT 里用 COUNT(*)。' },
    { q: '<p>统计每个品类 <code>category</code> 的商品数量和平均价格（保留 2 位小数）。</p>',
      sol: 'SELECT category, COUNT(*) AS 商品数, ROUND(AVG(price), 2) AS 平均价格\nFROM products\nGROUP BY category;', hint: 'ROUND(AVG(price), 2)。' },
    { q: '<p>统计每个用户<b>已支付</b>订单的总金额，只保留总金额<b>超过 3000</b> 的用户。返回 <code>user_id</code> 和总金额。</p>',
      sol: "SELECT user_id, SUM(amount) AS 总金额\nFROM orders\nWHERE status = '已支付'\nGROUP BY user_id\nHAVING SUM(amount) > 3000;",
      hint: '状态条件写在 WHERE，金额条件是分组后的，写在 HAVING。' },
    { q: '<p>统计每个月（<code>order_date</code> 的前 7 个字符，如 2024-01）、每种订单状态 <code>status</code> 的<b>订单数</b>和<b>下单人数</b>（去重）。返回：月份、status、订单数、下单人数。</p>',
      sol: 'SELECT substr(order_date, 1, 7) AS 月份, status,\n       COUNT(*) AS 订单数, COUNT(DISTINCT user_id) AS 下单人数\nFROM orders\nGROUP BY 月份, status;',
      hint: 'substr(order_date, 1, 7) 取年月；按月份和 status 两列分组；COUNT(*) 与 COUNT(DISTINCT user_id)。' },
  ],
},
{
  id: 's3', title: '多表连接 JOIN', sub: 'INNER JOIN · LEFT JOIN · 多表关联 · 行数膨胀',
  body: `
<p>订单表只记录了 <code>product_id</code>，想知道“每个品类卖了多少”，就要把<b>订单表</b>和<b>商品表</b>按 product_id 连接起来。JOIN 是 SQL 里最重要也最容易出错的操作。</p>
<div data-viz="join"></div>

<h2>INNER JOIN：两边都匹配上</h2>
<textarea data-run="sql">SELECT o.order_id, o.amount, p.product_name, p.category
FROM orders o
JOIN products p ON o.product_id = p.product_id   -- JOIN 默认就是 INNER JOIN
LIMIT 10;</textarea>
<p><code>orders o</code> 中的 <code>o</code> 是<b>表别名</b>，多表查询时用 <code>o.列名</code> 指明列来自哪张表——两张表都有的列（如 user_id）不加前缀会报“列名有歧义”。</p>

<h2>LEFT JOIN：保留左表全部行</h2>
<p>最典型的用途：<b>找出“没有”的记录</b>。比如从未下过单的用户——LEFT JOIN 后右表列为 NULL 的就是没匹配上的：</p>
<textarea data-run="sql">SELECT u.user_id, u.city, u.register_date, o.order_id
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
WHERE o.order_id IS NULL;</textarea>

<h2>多表连接 + 聚合</h2>
<p>JOIN 可以连续写多个。下面统计各城市、各品类的已支付销售额：</p>
<textarea data-run="sql">SELECT u.city, p.category, ROUND(SUM(o.amount)) AS 销售额
FROM orders o
JOIN users u    ON o.user_id = u.user_id
JOIN products p ON o.product_id = p.product_id
WHERE o.status = '已支付'
GROUP BY u.city, p.category
ORDER BY 销售额 DESC
LIMIT 10;</textarea>

<div class="warn"><b>行数膨胀陷阱：</b>users 和 orders 是一对多关系，连接后一个用户会出现多行。此时 <code>COUNT(*)</code> 数的是<b>订单数</b>而不是用户数；要数用户请用 <code>COUNT(DISTINCT u.user_id)</code>。JOIN 之后的 SUM 也可能被重复计算——每次写 JOIN 都先想一想“连接后一行代表什么”。</div>
<textarea data-run="sql">SELECT COUNT(*) AS 连接后行数, COUNT(DISTINCT u.user_id) AS 用户数
FROM users u JOIN orders o ON u.user_id = o.user_id;</textarea>
<div class="mysql">MySQL 不支持 <code>FULL JOIN</code>，需要用 <code>LEFT JOIN … UNION … RIGHT JOIN</code> 模拟。SQLite 3.39+ 和大多数数仓（Hive、Spark）支持 FULL JOIN。</div>
`,
  ex: [
    { q: '<p>查询每笔订单的 <code>order_id</code>、商品名 <code>product_name</code> 和下单用户所在城市 <code>city</code>。</p>',
      sol: 'SELECT o.order_id, p.product_name, u.city\nFROM orders o\nJOIN products p ON o.product_id = p.product_id\nJOIN users u ON o.user_id = u.user_id;',
      hint: '连续两个 JOIN：orders → products，orders → users。' },
    { q: '<p>统计每个品类的<b>已支付</b>销售额（amount 求和）。返回：品类、销售额。</p>',
      sol: "SELECT p.category, SUM(o.amount) AS 销售额\nFROM orders o\nJOIN products p ON o.product_id = p.product_id\nWHERE o.status = '已支付'\nGROUP BY p.category;",
      hint: 'orders JOIN products，WHERE 筛选状态，GROUP BY 品类。' },
    { q: '<p>有多少用户<b>从未下过单</b>？返回一个数字。</p>',
      sol: 'SELECT COUNT(*) AS 未下单用户数\nFROM users u\nLEFT JOIN orders o ON u.user_id = o.user_id\nWHERE o.order_id IS NULL;',
      hint: 'LEFT JOIN 后筛选 o.order_id IS NULL，再 COUNT。' },
    { q: '<p>统计每个城市的<b>用户总数</b>和<b>下过单的用户数</b>。返回：城市、用户数、下单用户数。</p>',
      sol: 'SELECT u.city,\n       COUNT(DISTINCT u.user_id) AS 用户数,\n       COUNT(DISTINCT o.user_id) AS 下单用户数\nFROM users u\nLEFT JOIN orders o ON u.user_id = o.user_id\nGROUP BY u.city;',
      hint: 'LEFT JOIN 保留所有用户；COUNT(DISTINCT o.user_id) 会自动忽略 NULL（没下单的用户）。' },
  ],
},
{
  id: 's4', title: 'CASE WHEN 条件逻辑', sub: '分档打标签 · 条件计数 · 行转列',
  body: `
<p><code>CASE WHEN</code> 是 SQL 里的 if-else，可以写在 SELECT、GROUP BY、聚合函数里，用途极广：给数据<b>打标签</b>、<b>按条件计数</b>、<b>行转列</b>。</p>
<textarea data-code="sql">CASE
    WHEN 条件1 THEN 结果1
    WHEN 条件2 THEN 结果2
    ELSE 其他结果        -- 不写 ELSE 时，都不满足返回 NULL
END</textarea>

<h2>分档打标签</h2>
<p>条件<b>从上到下</b>判断，命中第一个就停止，所以下面第二个条件不用写 <code>age &gt;= 25</code>：</p>
<textarea data-run="sql">SELECT CASE
         WHEN age < 25 THEN '25岁以下'
         WHEN age < 35 THEN '25-34岁'
         WHEN age >= 35 THEN '35岁及以上'
         ELSE '未知'
       END AS 年龄段,
       COUNT(*) AS 用户数
FROM users
GROUP BY 年龄段
ORDER BY 年龄段;</textarea>

<h2>条件计数与比率</h2>
<p><code>SUM(CASE WHEN 条件 THEN 1 ELSE 0 END)</code> = 满足条件的行数。配合 <code>COUNT(*)</code> 就能算各种“率”：</p>
<textarea data-run="sql">SELECT p.category,
       COUNT(*) AS 订单数,
       SUM(CASE WHEN o.status = '已退款' THEN 1 ELSE 0 END) AS 退款数,
       ROUND(SUM(CASE WHEN o.status = '已退款' THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 4) AS 退款率
FROM orders o JOIN products p ON o.product_id = p.product_id
GROUP BY p.category;</textarea>
<div class="warn"><b>整数除法陷阱：</b>SQLite（以及 Hive 的部分写法、SQL Server）中 <code>3 / 4 = 0</code>，整数相除结果会截断。计算比率时先 <code>* 1.0</code> 转成小数。MySQL 的 <code>/</code> 会自动返回小数，但 <code>DIV</code> 是整除。</div>
<textarea data-run="sql">SELECT 3 / 4 AS 整数除法, 3 * 1.0 / 4 AS 小数除法;</textarea>

<h2>行转列</h2>
<p>把“品类”这一列的不同取值变成多列，是做报表的常用操作：</p>
<div data-viz="pivot"></div>
<textarea data-run="sql">SELECT substr(o.order_date, 1, 7) AS 月份,
       SUM(CASE WHEN p.category = '数码' THEN o.amount ELSE 0 END) AS 数码,
       SUM(CASE WHEN p.category = '服饰' THEN o.amount ELSE 0 END) AS 服饰,
       SUM(CASE WHEN p.category = '美妆' THEN o.amount ELSE 0 END) AS 美妆,
       SUM(CASE WHEN p.category = '食品' THEN o.amount ELSE 0 END) AS 食品,
       SUM(CASE WHEN p.category = '家居' THEN o.amount ELSE 0 END) AS 家居
FROM orders o JOIN products p ON o.product_id = p.product_id
WHERE o.status = '已支付'
GROUP BY 月份;</textarea>
<div class="mysql">MySQL 还有简写 <code>IF(条件, 真值, 假值)</code>，SQLite 对应 <code>IIF(…)</code>。CASE WHEN 是所有数据库通用的标准写法，优先掌握它。</div>
`,
  ex: [
    { q: '<p>把商品按价格分档：<b>低价</b>（&lt;100）、<b>中价</b>（100~499）、<b>高价</b>（≥500），统计每档的商品数。返回：档位、商品数。</p>',
      sol: "SELECT CASE WHEN price < 100 THEN '低价'\n            WHEN price < 500 THEN '中价'\n            ELSE '高价' END AS 档位,\n       COUNT(*) AS 商品数\nFROM products\nGROUP BY 档位;",
      hint: 'CASE WHEN 写在 SELECT 中并起别名，再 GROUP BY 这个别名。' },
    { q: '<p>计算每个注册渠道的用户中，<b>年龄为空</b>的比例（保留 4 位小数）。返回：channel、空值比例。</p>',
      sol: 'SELECT channel,\n       ROUND(SUM(CASE WHEN age IS NULL THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 4) AS 空值比例\nFROM users\nGROUP BY channel;',
      hint: '条件计数 SUM(CASE WHEN age IS NULL THEN 1 ELSE 0 END)，再除以 COUNT(*)，别忘了 * 1.0。' },
    { q: '<p>统计每个渠道的男、女用户数，结果为三列：<code>channel</code>、男、女。</p>',
      sol: "SELECT channel,\n       SUM(CASE WHEN gender = '男' THEN 1 ELSE 0 END) AS 男,\n       SUM(CASE WHEN gender = '女' THEN 1 ELSE 0 END) AS 女\nFROM users\nGROUP BY channel;",
      hint: '行转列：每个性别写一个 SUM(CASE WHEN …)。' },
  ],
},
{
  id: 's5', title: '子查询与 CTE', sub: '标量子查询 · IN 子查询 · 派生表 · WITH',
  body: `
<p>有些问题一步算不出来：“比平均值高的订单”需要先算平均值。<b>子查询</b>就是把一个查询的结果当作另一个查询的输入。</p>
<div data-viz="subquery"></div>

<h2>WHERE 中的子查询</h2>
<p>子查询返回<b>一个值</b>时可以直接比较：</p>
<textarea data-run="sql">SELECT order_id, amount
FROM orders
WHERE amount > (SELECT AVG(amount) FROM orders)
ORDER BY amount
LIMIT 5;</textarea>
<p>子查询返回<b>一列</b>时配合 <code>IN</code>：买过“数码”商品的用户都来自哪些城市？</p>
<textarea data-run="sql">SELECT city, COUNT(*) AS 用户数
FROM users
WHERE user_id IN (
    SELECT o.user_id
    FROM orders o JOIN products p ON o.product_id = p.product_id
    WHERE p.category = '数码'
)
GROUP BY city;</textarea>

<h2>FROM 中的子查询（派生表）</h2>
<p>先算出中间结果，再在其上继续分析——例如“每个用户的订单数”的分布：</p>
<textarea data-run="sql">SELECT 订单数, COUNT(*) AS 用户数
FROM (
    SELECT user_id, COUNT(*) AS 订单数
    FROM orders
    GROUP BY user_id
) t                       -- 派生表必须起别名
GROUP BY 订单数
ORDER BY 订单数;</textarea>

<h2>CTE：用 WITH 让查询更清晰</h2>
<p>子查询一嵌套就难读。<b>CTE（公用表表达式）</b>先给中间结果起名字，再像普通表一样使用，可以写多个、后面的引用前面的：</p>
<textarea data-run="sql">WITH user_stat AS (           -- 第 1 步：每个用户的消费
    SELECT user_id, COUNT(*) AS 订单数, SUM(amount) AS 总金额
    FROM orders
    WHERE status = '已支付'
    GROUP BY user_id
),
avg_stat AS (                 -- 第 2 步：全体平均
    SELECT AVG(总金额) AS 平均总金额 FROM user_stat
)
SELECT u.*                    -- 第 3 步：高于平均的用户
FROM user_stat u, avg_stat a
WHERE u.总金额 > a.平均总金额
ORDER BY u.总金额 DESC
LIMIT 10;</textarea>
<div class="tip">写复杂 SQL 的心法：<b>拆步骤</b>。先想清楚每一步要得到什么样的中间表，用 CTE 一步步写，每写完一步就单独 SELECT 出来检查——这和在 pandas 里一行一个变量是同样的思路。</div>
<div class="mysql">MySQL 8.0 起支持 WITH（CTE）；MySQL 5.7 只能用子查询。</div>
`,
  ex: [
    { q: '<p>查询价格<b>高于所有商品平均价格</b>的商品名称和价格。</p>',
      sol: 'SELECT product_name, price\nFROM products\nWHERE price > (SELECT AVG(price) FROM products);', hint: 'WHERE price > (SELECT AVG(price) FROM products)。' },
    { q: '<p>找出来自 <b>上海</b>、并且<b>买过“美妆”品类</b>商品的用户 <code>user_id</code>。</p>',
      sol: "SELECT user_id\nFROM users\nWHERE city = '上海'\n  AND user_id IN (\n      SELECT o.user_id\n      FROM orders o JOIN products p ON o.product_id = p.product_id\n      WHERE p.category = '美妆'\n  );",
      hint: '外层筛选城市，内层子查询找出买过美妆的 user_id，用 IN 连接。' },
    { q: '<p>用 CTE 先算出每个用户的订单数，再统计<b>每个订单数对应多少用户</b>。返回：订单数、用户数。</p>',
      sol: 'WITH t AS (\n    SELECT user_id, COUNT(*) AS n\n    FROM orders\n    GROUP BY user_id\n)\nSELECT n AS 订单数, COUNT(*) AS 用户数\nFROM t\nGROUP BY n;',
      hint: 'WITH t AS (按用户 GROUP BY) SELECT n, COUNT(*) FROM t GROUP BY n。' },
    { q: '<p>有多少用户的已支付总消费额，高于“所有下单用户的平均总消费额”？返回一个数字。</p>',
      sol: "WITH t AS (\n    SELECT user_id, SUM(amount) AS s\n    FROM orders\n    WHERE status = '已支付'\n    GROUP BY user_id\n)\nSELECT COUNT(*) AS 用户数\nFROM t\nWHERE s > (SELECT AVG(s) FROM t);",
      hint: '先用 CTE 算每个用户的总额 s，再与 (SELECT AVG(s) FROM t) 比较。' },
  ],
},
{
  id: 's6', title: '窗口函数', sub: 'ROW_NUMBER · RANK · SUM OVER · LAG / LEAD',
  body: `
<p>窗口函数是数据分析 SQL 的“分水岭”：排名、TopN、累计、环比、占比……都离不开它。它和 GROUP BY 最大的区别是：<b>计算分组统计量，但不压缩行</b>。</p>
<textarea data-code="sql">函数名() OVER (
    PARTITION BY 分组列     -- 可选：在哪个范围内计算（不写 = 全表一个窗口）
    ORDER BY 排序列         -- 可选：按什么顺序（排名、累计、LAG 需要）
)</textarea>

<h2>排名：ROW_NUMBER / RANK / DENSE_RANK</h2>
<div data-viz="rank"></div>
<textarea data-run="sql">-- 每个品类内，商品按价格从高到低排名
SELECT category, product_name, price,
       ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS rn,
       RANK()       OVER (PARTITION BY category ORDER BY price DESC) AS rk,
       DENSE_RANK() OVER (PARTITION BY category ORDER BY price DESC) AS drk
FROM products;</textarea>
<p><b>分组 TopN</b> 的固定套路：先在子查询 / CTE 中排名，再在外层筛选（窗口函数不能直接写在 WHERE 里）：</p>
<textarea data-run="sql">WITH t AS (
    SELECT category, product_name, price,
           ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS rn
    FROM products
)
SELECT * FROM t WHERE rn <= 2;</textarea>

<h2>聚合窗口：累计与占比</h2>
<div data-viz="window"></div>
<textarea data-run="sql">-- 每个用户的累计消费；以及每笔订单占该用户总消费的比例
SELECT user_id, order_date, amount,
       SUM(amount) OVER (PARTITION BY user_id ORDER BY order_date, order_id) AS 累计金额,
       ROUND(amount * 1.0 / SUM(amount) OVER (PARTITION BY user_id), 3)    AS 占比
FROM orders
WHERE user_id <= 3;</textarea>
<div class="tip">加了 <code>ORDER BY</code> 的 <code>SUM() OVER</code> 是<b>累计到当前行</b>；不加 ORDER BY 则是<b>整个分区的总和</b>。这一个区别要牢记。</div>

<h2>LAG / LEAD：跨行取值</h2>
<div data-viz="lag"></div>
<textarea data-run="sql">WITH m AS (
    SELECT substr(order_date, 1, 7) AS 月份, SUM(amount) AS gmv
    FROM orders WHERE status = '已支付'
    GROUP BY 月份
)
SELECT 月份, gmv,
       LAG(gmv) OVER (ORDER BY 月份) AS 上月,
       ROUND((gmv - LAG(gmv) OVER (ORDER BY 月份)) * 1.0 / LAG(gmv) OVER (ORDER BY 月份), 4) AS 环比
FROM m;</textarea>
<div class="mysql">MySQL <b>8.0</b> 才支持窗口函数（5.7 不支持）；Hive、Spark SQL、PostgreSQL、SQLite 3.25+ 都支持，写法一致。</div>
`,
  ex: [
    { q: '<p>给每个品类内的商品按价格从高到低排名（使用 <code>DENSE_RANK</code>），返回：category、product_name、price、排名。</p>',
      sol: 'SELECT category, product_name, price,\n       DENSE_RANK() OVER (PARTITION BY category ORDER BY price DESC) AS 排名\nFROM products;',
      hint: 'DENSE_RANK() OVER (PARTITION BY category ORDER BY price DESC)。' },
    { q: '<p>查询每个用户的<b>第一笔订单</b>（按 order_date 最早，同一天取 order_id 最小的），返回 <code>user_id, order_id, order_date</code>。</p>',
      sol: 'WITH t AS (\n    SELECT user_id, order_id, order_date,\n           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY order_date, order_id) AS rn\n    FROM orders\n)\nSELECT user_id, order_id, order_date\nFROM t\nWHERE rn = 1;',
      hint: 'ROW_NUMBER() 按用户分区、按日期和订单号排序，外层取 rn = 1。' },
    { q: '<p>计算每个月（YYYY-MM）的已支付销售额，以及<b>上个月</b>的销售额。返回：月份、销售额、上月销售额。</p>',
      sol: "WITH m AS (\n    SELECT substr(order_date, 1, 7) AS 月份, SUM(amount) AS 销售额\n    FROM orders\n    WHERE status = '已支付'\n    GROUP BY 月份\n)\nSELECT 月份, 销售额, LAG(销售额) OVER (ORDER BY 月份) AS 上月销售额\nFROM m;",
      hint: '先用 CTE 按月汇总，再用 LAG(销售额) OVER (ORDER BY 月份)。' },
    { q: '<p>计算每个品类的已支付销售额，以及它占<b>全部销售额的比例</b>（保留 4 位小数）。返回：品类、销售额、占比。</p>',
      sol: "SELECT p.category,\n       SUM(o.amount) AS 销售额,\n       ROUND(SUM(o.amount) * 1.0 / SUM(SUM(o.amount)) OVER (), 4) AS 占比\nFROM orders o JOIN products p ON o.product_id = p.product_id\nWHERE o.status = '已支付'\nGROUP BY p.category;",
      hint: '窗口函数可以套在聚合函数外面：SUM(SUM(amount)) OVER () 就是所有组的总和。也可以用 CTE 分两步写。' },
  ],
},
{
  id: 's7', title: '日期与字符串函数', sub: '取年月 · 日期差 · 日期加减 · 字符串处理（附 MySQL 对照）',
  body: `
<p>按天、按周、按月统计是分析中最常见的需求。不同数据库的日期函数写法差异最大，本站运行的是 SQLite，下表给出 <b>MySQL</b> 对照，工作中照着换即可。</p>
<table>
<tr><th>需求</th><th>SQLite（本站）</th><th>MySQL</th></tr>
<tr><td>取年月 2024-01</td><td><code>strftime('%Y-%m', d)</code></td><td><code>DATE_FORMAT(d, '%Y-%m')</code></td></tr>
<tr><td>取年 / 月 / 日</td><td><code>strftime('%Y', d)</code> / <code>'%m'</code> / <code>'%d'</code></td><td><code>YEAR(d)</code> / <code>MONTH(d)</code> / <code>DAY(d)</code></td></tr>
<tr><td>取日期部分</td><td><code>date(event_time)</code></td><td><code>DATE(event_time)</code></td></tr>
<tr><td>取小时</td><td><code>strftime('%H', t)</code></td><td><code>HOUR(t)</code></td></tr>
<tr><td>星期几</td><td><code>strftime('%w', d)</code>（0=周日）</td><td><code>DAYOFWEEK(d)</code>（1=周日）/ <code>WEEKDAY(d)</code>（0=周一）</td></tr>
<tr><td>加减天数</td><td><code>date(d, '+7 day')</code></td><td><code>DATE_ADD(d, INTERVAL 7 DAY)</code></td></tr>
<tr><td>相差天数</td><td><code>julianday(d2) - julianday(d1)</code></td><td><code>DATEDIFF(d2, d1)</code></td></tr>
<tr><td>当月第一天</td><td><code>date(d, 'start of month')</code></td><td><code>DATE_FORMAT(d, '%Y-%m-01')</code></td></tr>
<tr><td>今天</td><td><code>date('now')</code></td><td><code>CURDATE()</code></td></tr>
<tr><td>字符串拼接</td><td><code>a || b</code></td><td><code>CONCAT(a, b)</code></td></tr>
<tr><td>截取子串</td><td><code>substr(s, 1, 4)</code></td><td><code>SUBSTRING(s, 1, 4)</code> / <code>LEFT(s, 4)</code></td></tr>
<tr><td>长度 / 替换 / 去空格</td><td><code>length</code> / <code>replace</code> / <code>trim</code></td><td><code>CHAR_LENGTH</code> / <code>REPLACE</code> / <code>TRIM</code></td></tr>
<tr><td>查找位置</td><td><code>instr(s, '耳机')</code></td><td><code>INSTR(s, '耳机')</code> / <code>LOCATE('耳机', s)</code></td></tr>
</table>
<div class="tip">本站的日期存成 <code>'2024-01-05'</code> 这样的文本，因此 <code>substr(order_date, 1, 7)</code> 也能取到年月，<code>order_date &gt;= '2024-03-01'</code> 这样的字符串比较也是正确的（格式统一时）。</div>

<h2>按月、按星期统计</h2>
<textarea data-run="sql">SELECT strftime('%Y-%m', order_date) AS 月份, COUNT(*) AS 订单数
FROM orders
GROUP BY 月份;</textarea>
<textarea data-run="sql" data-chart="bar">SELECT CASE strftime('%w', order_date)
         WHEN '0' THEN '7-周日' WHEN '1' THEN '1-周一' WHEN '2' THEN '2-周二'
         WHEN '3' THEN '3-周三' WHEN '4' THEN '4-周四' WHEN '5' THEN '5-周五'
         ELSE '6-周六' END AS 星期,
       COUNT(*) AS 订单数
FROM orders
GROUP BY 星期
ORDER BY 星期;</textarea>

<h2>日期差与日期加减</h2>
<textarea data-run="sql">-- 注册后多少天下了第一单
SELECT u.user_id, u.register_date, MIN(o.order_date) AS 首单日期,
       julianday(MIN(o.order_date)) - julianday(u.register_date) AS 间隔天数
FROM users u JOIN orders o ON u.user_id = o.user_id
GROUP BY u.user_id, u.register_date
LIMIT 10;</textarea>
<textarea data-run="sql">-- 统计 6 月最后 7 天的订单
SELECT order_date, COUNT(*) AS 订单数
FROM orders
WHERE order_date > date('2024-06-30', '-7 day')
GROUP BY order_date;</textarea>

<h2>字符串处理</h2>
<textarea data-run="sql">SELECT product_name,
       category || '-' || product_name AS 全称,
       length(product_name)            AS 字数,
       substr(product_name, 1, 2)      AS 前两个字,
       replace(product_name, '无线', '蓝牙') AS 替换后
FROM products
WHERE instr(product_name, '无线') > 0 OR product_name LIKE '%茶%';</textarea>
`,
  ex: [
    { q: '<p>统计每个月（YYYY-MM）的<b>新注册用户数</b>。返回：月份、新用户数。</p>',
      sol: "SELECT strftime('%Y-%m', register_date) AS 月份, COUNT(*) AS 新用户数\nFROM users\nGROUP BY 月份;", hint: "strftime('%Y-%m', register_date)。" },
    { q: '<p>统计 events 表中每个<b>小时</b>（0~23）发生的事件数。返回：小时、事件数。</p>',
      sol: "SELECT strftime('%H', event_time) AS 小时, COUNT(*) AS 事件数\nFROM events\nGROUP BY 小时;", hint: "strftime('%H', event_time) 取小时（结果是 '08' 这样的文本，也可以 CAST 成整数）。" },
    { q: '<p>计算每个下过单的用户从<b>注册到首次下单</b>间隔的天数。返回：user_id、间隔天数。</p>',
      sol: 'SELECT u.user_id,\n       julianday(MIN(o.order_date)) - julianday(u.register_date) AS 间隔天数\nFROM users u JOIN orders o ON u.user_id = o.user_id\nGROUP BY u.user_id, u.register_date;',
      hint: 'julianday(首单日期) - julianday(注册日期)，首单日期用 MIN(order_date)。' },
    { q: '<p>统计每个用户<b>注册后 7 天内</b>（含注册当天，即 order_date &lt;= 注册日 + 6 天）的订单数，只返回有订单的用户。返回：user_id、订单数。</p>',
      sol: "SELECT o.user_id, COUNT(*) AS 订单数\nFROM orders o JOIN users u ON o.user_id = u.user_id\nWHERE o.order_date <= date(u.register_date, '+6 day')\nGROUP BY o.user_id;",
      hint: "date(register_date, '+6 day') 得到第 7 天的日期。" },
  ],
},
{
  id: 's8', title: 'NULL 与常见陷阱', sub: 'IS NULL · COALESCE · LEFT JOIN 过滤 · NOT IN · 除零',
  body: `
<p>很多 SQL “看起来对、结果却错”的问题都和 <b>NULL</b> 有关。NULL 表示“未知”，它不等于 0，也不等于空字符串。</p>
<div data-viz="nullcount"></div>
<textarea data-run="sql">SELECT COUNT(*)                         AS 总行数,
       COUNT(age)                       AS 有年龄的,
       SUM(CASE WHEN age IS NULL THEN 1 ELSE 0 END) AS 年龄为空的,
       ROUND(AVG(age), 2)               AS 平均年龄_忽略空值,
       ROUND(AVG(COALESCE(age, 0)), 2)  AS 平均年龄_空值当0
FROM users;</textarea>

<h2>陷阱 1：用 = NULL 判断空值</h2>
<textarea data-run="sql">SELECT
  (SELECT COUNT(*) FROM users WHERE age = NULL)  AS 用等号,   -- 永远是 0
  (SELECT COUNT(*) FROM users WHERE age IS NULL) AS 用IS;</textarea>

<h2>陷阱 2：LEFT JOIN 后在 WHERE 里过滤右表</h2>
<p>想统计每个用户的“已退款”订单数（没有的记 0）。如果把右表条件写在 WHERE 里，没有退款的用户会被整行过滤掉——LEFT JOIN 悄悄变成了 INNER JOIN：</p>
<textarea data-run="sql">SELECT '条件写在 WHERE' AS 写法, COUNT(DISTINCT u.user_id) AS 用户数
FROM users u LEFT JOIN orders o ON u.user_id = o.user_id
WHERE o.status = '已退款'
UNION ALL
SELECT '条件写在 ON', COUNT(DISTINCT u.user_id)
FROM users u LEFT JOIN orders o ON u.user_id = o.user_id AND o.status = '已退款';</textarea>
<div class="tip">对右表的筛选条件写在 <code>ON</code> 里：先筛右表再连接，左表行全部保留。</div>

<h2>陷阱 3：LEFT JOIN 后用 COUNT(*)</h2>
<p>没下单的用户连接后也有一行（右表全是 NULL），<code>COUNT(*)</code> 会把它算成 1。应该用 <code>COUNT(o.order_id)</code>：</p>
<textarea data-run="sql">SELECT u.user_id, COUNT(*) AS 错误写法, COUNT(o.order_id) AS 正确写法
FROM users u LEFT JOIN orders o ON u.user_id = o.user_id
GROUP BY u.user_id
ORDER BY 正确写法
LIMIT 5;</textarea>

<h2>陷阱 4：NOT IN 遇到 NULL</h2>
<p><code>x NOT IN (1, 2, NULL)</code> 的结果永远不为真，查询会返回 0 行。子查询结果可能有 NULL 时，改用 <code>NOT EXISTS</code>：</p>
<textarea data-run="sql">SELECT COUNT(*) AS 未下单用户
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.user_id);</textarea>

<h2>陷阱 5：除以 0</h2>
<p>分母可能为 0 时，用 <code>NULLIF(分母, 0)</code> 把 0 变成 NULL，结果为 NULL 而不是报错或得到错误值：</p>
<textarea data-run="sql">SELECT 10 * 1.0 / NULLIF(0, 0) AS 安全除法;</textarea>
<div class="mysql">MySQL 中 <code>IFNULL(a, 0)</code> 等价于 <code>COALESCE(a, 0)</code>；除以 0 在 MySQL 中返回 NULL，在很多数仓中会报错。</div>
`,
  ex: [
    { q: '<p>统计 users 表中 <code>age</code> 为空的用户数。</p>',
      sol: 'SELECT COUNT(*) AS 空值数\nFROM users\nWHERE age IS NULL;', hint: '用 IS NULL，不要用 = NULL。' },
    { q: '<p>计算用户的平均年龄，给出两列：<b>忽略空值</b>的平均值、<b>把空值当 0</b> 的平均值（都保留 2 位小数）。</p>',
      sol: 'SELECT ROUND(AVG(age), 2) AS 忽略空值,\n       ROUND(AVG(COALESCE(age, 0)), 2) AS 空值当0\nFROM users;', hint: 'AVG 默认忽略 NULL；COALESCE(age, 0) 把空值变成 0。' },
    { q: '<p>统计<b>每个用户</b>（全部 300 个）的订单数，没下过单的记为 0。返回：user_id、订单数。</p>',
      sol: 'SELECT u.user_id, COUNT(o.order_id) AS 订单数\nFROM users u\nLEFT JOIN orders o ON u.user_id = o.user_id\nGROUP BY u.user_id;', hint: 'LEFT JOIN + COUNT(o.order_id)，不要用 COUNT(*)。' },
    { q: '<p>统计每个用户（全部 300 个）的<b>已退款</b>订单数，没有退款订单的记为 0。返回：user_id、退款订单数。</p>',
      sol: "SELECT u.user_id, COUNT(o.order_id) AS 退款订单数\nFROM users u\nLEFT JOIN orders o ON u.user_id = o.user_id AND o.status = '已退款'\nGROUP BY u.user_id;",
      hint: "把 o.status = '已退款' 写在 ON 里，而不是 WHERE 里。" },
  ],
},
];
