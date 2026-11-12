/* pandas 课程。代码在浏览器中由 Pyodide 运行；已预置 pd、np 以及 users/products/orders/events/logins/users_raw 六个 DataFrame */
window.COURSE = window.COURSE || {};
COURSE.pandas = [
{
  id: 'p1', title: 'DataFrame 入门', sub: '读取数据 · head / info / describe · 选列 · 基础统计',
  body: `
<p>pandas 是 Python 做数据分析的核心库。它的主角是 <b>DataFrame</b>——一张带行索引和列名的二维表，可以理解为“Python 里的 Excel 表 / 数据库表”。</p>
<div class="tip">本站已经替你执行了 <code>import pandas as pd</code>、<code>import numpy as np</code>，并把 6 张表读成了同名 DataFrame（日期列已解析为日期类型）。<b>第一次运行 pandas 代码需要下载约 20MB 的 Python 环境</b>，请稍等片刻，之后就很快了。代码框最后一行的值会自动显示出来；每个代码框都是<b>独立运行</b>的，变量不会带到下一个代码框。</div>
<div data-viz="anatomy"></div>

<h2>读取数据</h2>
<p>工作中数据通常来自 CSV / Excel 文件或数据库，常用写法如下（本站数据已读好，这段不用运行）：</p>
<textarea data-code="py">df = pd.read_csv('orders.csv', parse_dates=['order_date'])   # 读 CSV，并把日期列解析成日期
df = pd.read_csv('data.csv', encoding='gbk')                   # 中文 Windows 导出的文件常用 gbk 编码
df = pd.read_excel('report.xlsx', sheet_name='Sheet1')         # 读 Excel
df.to_csv('result.csv', index=False, encoding='utf-8-sig')     # 导出：utf-8-sig 让 Excel 打开不乱码</textarea>

<h2>拿到数据先看三眼</h2>
<textarea data-run="py">orders.head()        # 前 5 行；tail() 看最后几行</textarea>
<textarea data-run="py">print(orders.shape)  # (行数, 列数)
orders.info()        # 每列的类型、非空数量——检查缺失值和类型最快的方法</textarea>
<textarea data-run="py">orders.describe()    # 数值列的统计摘要：计数、均值、标准差、分位数</textarea>

<h2>选择列</h2>
<p>单个列名得到 <b>Series</b>（一维），列名列表（双层方括号）得到 <b>DataFrame</b>：</p>
<textarea data-run="py">orders[['order_id', 'user_id', 'amount']].head(3)</textarea>
<textarea data-run="py">users['city'].value_counts()      # 每个取值出现的次数，最常用的方法之一</textarea>

<h2>基础统计</h2>
<textarea data-run="py">amt = orders['amount']
print('总金额:', amt.sum())
print('平均金额:', round(amt.mean(), 2))
print('中位数:', amt.median())
print('最大值:', amt.max())
print('下单人数:', orders['user_id'].nunique())   # 去重计数</textarea>
<div class="tip">Series 常用统计方法：<code>sum mean median max min count nunique std quantile value_counts</code>。它们默认<b>忽略缺失值</b>，与 SQL 的聚合函数一致。</div>
`,
  ex: [
    { q: '<p>返回 <code>products</code> 表的形状（行数和列数）。</p>', sol: `result = products.shape`, hint: '用 .shape 属性，不需要括号。' },
    { q: '<p>选出 <code>users</code> 表的 <code>user_id、city、channel</code> 三列。</p>', sol: `result = users[['user_id', 'city', 'channel']]`, hint: "双层方括号：users[['a', 'b', 'c']]。" },
    { q: '<p>统计 <code>users</code> 中每个城市的用户数。</p>', sol: `result = users['city'].value_counts()`, hint: "users['city'].value_counts()。" },
    { q: '<p>计算 <code>orders</code> 中 <code>amount</code> 的平均值，保留 2 位小数。</p>', sol: `result = round(orders['amount'].mean(), 2)`, hint: "round(orders['amount'].mean(), 2)。" },
  ],
},
{
  id: 'p2', title: '筛选与排序', sub: '布尔索引 · isin / between / str.contains · query · loc / iloc · sort_values',
  body: `
<p>筛选行是最高频的操作。pandas 的方式叫<b>布尔索引</b>：先写出条件得到一列 True/False，再用它来选行。</p>
<div data-viz="filter" data-mode="py"></div>

<h2>条件筛选</h2>
<textarea data-run="py">orders[orders['amount'] > 3000]</textarea>
<textarea data-run="py"># 多个条件：用 & | ~，每个条件都要加括号
users[(users['city'] == '北京') & (users['age'] >= 40)]</textarea>
<table>
<tr><th>SQL</th><th>pandas</th></tr>
<tr><td><code>city IN ('北京', '上海')</code></td><td><code>df['city'].isin(['北京', '上海'])</code></td></tr>
<tr><td><code>age BETWEEN 25 AND 30</code></td><td><code>df['age'].between(25, 30)</code></td></tr>
<tr><td><code>name LIKE '%耳机%'</code></td><td><code>df['name'].str.contains('耳机')</code></td></tr>
<tr><td><code>age IS NULL</code></td><td><code>df['age'].isna()</code></td></tr>
<tr><td><code>NOT (…)</code></td><td><code>~(…)</code></td></tr>
</table>
<textarea data-run="py">products[products['product_name'].str.contains('耳机|键盘|鼠标')]   # | 表示“或”（正则）</textarea>
<p><code>query</code> 用字符串写条件，长条件时更易读：</p>
<textarea data-run="py">orders.query("amount > 2000 and status == '已支付'").head()</textarea>

<h2>loc 与 iloc</h2>
<div data-viz="locidx"></div>
<textarea data-run="py"># 最常用：loc[行条件, 列名]，筛行 + 选列一步完成
users.loc[users['channel'] == '抖音', ['user_id', 'city', 'age']].head()</textarea>

<h2>排序与 TopN</h2>
<textarea data-run="py">orders.sort_values(['amount', 'order_id'], ascending=[False, True]).head(5)</textarea>
<textarea data-run="py">products.nlargest(3, 'price')     # 取最大的 3 行；nsmallest 取最小</textarea>
<div class="warn">筛选后的 DataFrame <b>保留原索引</b>（可能是 3、17、42…）。需要从 0 重新编号时用 <code>.reset_index(drop=True)</code>。修改筛选结果时，最好先 <code>.copy()</code>，避免 SettingWithCopyWarning。</div>
`,
  ex: [
    { q: '<p>筛选来自 <b>北京或上海</b>、且年龄<b>大于等于 30</b> 的用户（返回全部列）。</p>',
      sol: `result = users[users['city'].isin(['北京', '上海']) & (users['age'] >= 30)]`, hint: "isin(['北京', '上海']) & (age >= 30)，注意括号。" },
    { q: '<p>找出金额最高的 <b>5</b> 笔订单（金额相同按 order_id 升序），返回 <code>order_id、user_id、amount</code> 三列。</p>', ordered: true,
      sol: `result = orders.sort_values(['amount', 'order_id'], ascending=[False, True]).head(5)[['order_id', 'user_id', 'amount']]`,
      hint: "sort_values 可以传两列和两个 ascending，再 head(5)，再选列。" },
    { q: '<p>用 <code>loc</code> 选出品类为“数码”的商品的 <code>product_name</code> 和 <code>price</code> 两列。</p>',
      sol: `result = products.loc[products['category'] == '数码', ['product_name', 'price']]`, hint: "products.loc[条件, ['product_name', 'price']]。" },
    { q: '<p>筛选 6 月份（<code>order_date</code> 在 2024-06-01 及之后）<b>已退款</b>的订单（返回全部列）。</p>',
      sol: `result = orders[(orders['order_date'] >= '2024-06-01') & (orders['status'] == '已退款')]`,
      hint: "日期列可以直接和 '2024-06-01' 这样的字符串比较。" },
  ],
},
{
  id: 'p3', title: '数据清洗', sub: '缺失值 · 重复值 · 字符串清洗 · 类型转换',
  body: `
<p>真实数据总是脏的：有空值、有重复、有多余空格、日期格式五花八门。<b>清洗通常占分析工作的一大半时间</b>。本课使用专门准备的脏数据表 <code>users_raw</code>。</p>
<textarea data-run="py">users_raw.head(10)</textarea>
<div data-viz="missing"></div>

<h2>缺失值</h2>
<textarea data-run="py">users_raw.isna().sum()       # 每列缺失个数</textarea>
<textarea data-run="py">df = users_raw.copy()
df['gender'] = df['gender'].fillna('未知')                 # 类别列填“未知”
df['age'] = df['age'].fillna(df['age'].median())          # 数值列用中位数填充
df = df.dropna(subset=['city'])                           # city 为空的行直接删掉
df.isna().sum()</textarea>

<h2>重复值</h2>
<textarea data-run="py">print('重复行数:', users_raw.duplicated().sum())
users_raw[users_raw.duplicated(keep=False)]     # keep=False 把所有重复的行都标出来</textarea>
<textarea data-code="py">df = df.drop_duplicates()                      # 删除完全相同的行
df = df.drop_duplicates(subset=['user_id'], keep='last')   # 按 user_id 去重，保留最后一条</textarea>

<h2>字符串清洗</h2>
<p>字符串列的方法都在 <code>.str</code> 下面：<code>strip</code> 去首尾空格、<code>replace</code> 替换、<code>contains</code> 包含、<code>len</code> 长度、<code>split</code> 分割、<code>upper / lower</code> 大小写。</p>
<textarea data-run="py">print(users_raw['city'].unique())
clean = users_raw['city'].str.strip().str.replace('市', '')
print(clean.unique())</textarea>

<h2>类型转换</h2>
<textarea data-run="py">print(users_raw.dtypes)
df = users_raw.copy()
df['register_date'] = pd.to_datetime(df['register_date'], format='mixed')   # 混合格式的日期
df['age'] = df['age'].astype('Int64')       # 可为空的整数类型（大写 I）
df.dtypes</textarea>
<div class="tip">常用转换：<code>astype(int / float / str)</code>、<code>pd.to_numeric(s, errors='coerce')</code>（无法转换的变 NaN）、<code>pd.to_datetime(s)</code>。数值带缺失值时 int 列会变成 float，用 <code>'Int64'</code> 可以保留整数。</div>
<h2>一套完整的清洗流程</h2>
<textarea data-run="py">clean = (users_raw
         .drop_duplicates()
         .assign(city=lambda d: d['city'].str.strip().str.replace('市', ''),
                 register_date=lambda d: pd.to_datetime(d['register_date'], format='mixed'),
                 gender=lambda d: d['gender'].fillna('未知'))
         .dropna(subset=['city'])
         .reset_index(drop=True))
clean</textarea>
`,
  ex: [
    { q: '<p>统计 <code>users_raw</code> 每一列的缺失值个数。</p>', sol: `result = users_raw.isna().sum()`, hint: 'isna().sum()。' },
    { q: '<p>删除 <code>users_raw</code> 中完全重复的行，返回删除后的<b>行数</b>。</p>', sol: `result = len(users_raw.drop_duplicates())`, hint: 'len(df.drop_duplicates())。' },
    { q: '<p>清洗 <code>users_raw</code> 的 city 列：去掉首尾空格和“市”字，然后统计每个城市出现的次数（忽略缺失值，不用去重行）。</p>',
      sol: `result = users_raw['city'].str.strip().str.replace('市', '').value_counts()`, hint: ".str.strip().str.replace('市', '').value_counts()。" },
    { q: '<p>用 age 的<b>中位数</b>填充 <code>users_raw</code> 中 age 的缺失值，返回填充后 age 的<b>平均值</b>（保留 2 位小数）。</p>',
      sol: `age = users_raw['age'].fillna(users_raw['age'].median())\nresult = round(age.mean(), 2)`, hint: "先 fillna(median())，再 mean()。" },
    { q: '<p>先删除重复行，再把 register_date 转换为日期类型，统计<b>每一天</b>的注册人数（返回 Series 或 DataFrame 均可）。</p>',
      sol: `df = users_raw.drop_duplicates().copy()\ndf['register_date'] = pd.to_datetime(df['register_date'], format='mixed')\nresult = df.groupby('register_date').size()`,
      hint: "pd.to_datetime(..., format='mixed') 可以处理 2024/01/02 和 2024-01-02 混合的格式；然后 groupby(...).size()。" },
  ],
},
{
  id: 'p4', title: '列运算与转换', sub: '新增列 · np.where / np.select · pd.cut 分箱 · map / apply',
  body: `
<p>pandas 的列运算是<b>向量化</b>的：一行代码作用于整列，不需要写循环，既简洁又快。</p>

<h2>新增与修改列</h2>
<textarea data-run="py">df = orders.copy()
df['unit_price'] = df['amount'] / df['quantity']        # 直接对整列做运算
df['month'] = df['order_date'].dt.month                 # 日期属性在 .dt 下
df.head()</textarea>
<p><code>assign</code> 可以链式新增多列，适合写成一条“流水线”：</p>
<textarea data-run="py">(orders
 .assign(unit_price=lambda d: d['amount'] / d['quantity'],
         is_refund=lambda d: d['status'] == '已退款')
 .head())</textarea>

<h2>条件列：np.where 与 np.select</h2>
<p><code>np.where(条件, 真值, 假值)</code> 相当于 Excel 的 IF；多个条件用 <code>np.select</code>，相当于 SQL 的 CASE WHEN：</p>
<textarea data-run="py">df = products.copy()
df['档位'] = np.where(df['price'] >= 500, '高价', '普通')
conds = [df['price'] < 100, df['price'] < 500]
df['档位2'] = np.select(conds, ['低价', '中价'], default='高价')
df.head(8)</textarea>

<h2>分箱：pd.cut</h2>
<div data-viz="cut"></div>
<textarea data-run="py">age_group = pd.cut(users['age'], bins=[17, 24, 34, 44, 55],
                   labels=['18-24', '25-34', '35-44', '45-55'])
age_group.value_counts().sort_index()</textarea>

<h2>映射与自定义函数：map / apply</h2>
<textarea data-run="py">level = {'应用商店': '自然流量', '微信': '社交裂变', '抖音': '付费投放', '搜索引擎': '付费投放'}
users['channel'].map(level).value_counts()      # map 按字典逐个替换</textarea>
<textarea data-run="py">def tag(row):                                     # apply(axis=1) 逐行调用函数
    if row['amount'] >= 1000 and row['quantity'] >= 2:
        return '大额多件'
    return '普通'

orders.apply(tag, axis=1).value_counts()</textarea>
<div class="warn"><code>apply(axis=1)</code> 本质是 Python 循环，数据量大时很慢。能用 <code>np.where</code>、比较运算、<code>.str</code> / <code>.dt</code> 方法实现的，优先用向量化写法。</div>

<h2>重命名与删除列</h2>
<textarea data-run="py">orders.rename(columns={'amount': '金额', 'order_date': '下单日期'}).drop(columns=['status']).head(3)</textarea>
`,
  ex: [
    { q: '<p>给订单打标签：金额 ≥ 1000 为“大单”，否则“普通”。统计两类订单各有多少笔。</p>',
      sol: `result = pd.Series(np.where(orders['amount'] >= 1000, '大单', '普通')).value_counts()`, hint: "np.where(条件, '大单', '普通')，再 value_counts()（np.where 返回数组，可包一层 pd.Series）。" },
    { q: '<p>用 <code>pd.cut</code> 把用户年龄分为 18-24、25-34、35-44、45-55 四段（bins=[17, 24, 34, 44, 55]），统计各段人数。</p>',
      sol: `result = pd.cut(users['age'], bins=[17, 24, 34, 44, 55], labels=['18-24', '25-34', '35-44', '45-55']).value_counts()`, hint: 'pd.cut(..., bins=..., labels=...).value_counts()。' },
    { q: '<p>用 <code>map</code> 把渠道映射为“付费”（抖音、搜索引擎）和“免费”（应用商店、微信），统计两类用户数。</p>',
      sol: `m = {'抖音': '付费', '搜索引擎': '付费', '应用商店': '免费', '微信': '免费'}\nresult = users['channel'].map(m).value_counts()`, hint: '先写一个字典，再 users[\'channel\'].map(字典)。' },
    { q: '<p>新增单价列 <code>unit_price = amount / quantity</code>，返回单价<b>大于 500</b> 的订单的 <code>order_id</code> 和 <code>unit_price</code> 两列。</p>',
      sol: `df = orders.assign(unit_price=orders['amount'] / orders['quantity'])\nresult = df.loc[df['unit_price'] > 500, ['order_id', 'unit_price']]`, hint: '先新增列，再用 loc[条件, 列]。' },
  ],
},
{
  id: 'p5', title: '分组聚合 groupby', sub: 'groupby · agg 多指标 · 分组筛选 · transform · 分组 TopN',
  body: `
<p><code>groupby</code> 对应 SQL 的 GROUP BY，是 pandas 分析的绝对核心。</p>
<div data-viz="groupby" data-mode="py"></div>

<h2>基本用法</h2>
<textarea data-run="py">orders.groupby('status')['amount'].sum()</textarea>
<textarea data-run="py"># 多列分组；as_index=False 让分组列保留为普通列（等价于最后 reset_index()）
users.groupby(['city', 'gender'], as_index=False)['user_id'].count().head(6)</textarea>
<div class="tip"><code>size()</code> 数每组的行数（含缺失值），<code>count()</code> 数非空值个数，<code>nunique()</code> 数不同值个数。</div>

<h2>一次算多个指标：命名聚合</h2>
<textarea data-run="py">stat = orders.groupby('user_id').agg(
    订单数=('order_id', 'count'),
    总金额=('amount', 'sum'),
    平均金额=('amount', 'mean'),
    首单日期=('order_date', 'min'),
    买过几种商品=('product_id', 'nunique'),
)
stat.head()</textarea>
<p>分组后的筛选（相当于 HAVING）就是对结果再做一次布尔索引：</p>
<textarea data-run="py">stat = orders.groupby('user_id').agg(订单数=('order_id', 'count'), 总金额=('amount', 'sum'))
stat[stat['订单数'] >= 10].sort_values('总金额', ascending=False)</textarea>

<h2>transform：把组统计量放回每一行</h2>
<div data-viz="transform"></div>
<textarea data-run="py">df = orders[['order_id', 'user_id', 'amount']].copy()
df['用户总额'] = df.groupby('user_id')['amount'].transform('sum')
df['占比'] = df['amount'] / df['用户总额']
df.sort_values('user_id').head(8)</textarea>

<h2>分组 TopN</h2>
<p>先整体排序，再每组取前 N 行——对应 SQL 的 ROW_NUMBER() 套路：</p>
<textarea data-run="py">(products.sort_values('price', ascending=False)
         .groupby('category')
         .head(2))</textarea>
`,
  ex: [
    { q: '<p>统计每个城市的<b>用户数</b>和<b>平均年龄</b>。</p>',
      sol: `result = users.groupby('city').agg(用户数=('user_id', 'count'), 平均年龄=('age', 'mean'))`, hint: "groupby('city').agg(用户数=('user_id', 'count'), 平均年龄=('age', 'mean'))。" },
    { q: '<p>统计每个用户<b>已支付</b>订单的订单数和总金额，只保留总金额 &gt; 3000 的用户。返回：user_id、订单数、总金额。</p>',
      sol: `paid = orders[orders['status'] == '已支付']\nstat = paid.groupby('user_id').agg(订单数=('order_id', 'count'), 总金额=('amount', 'sum'))\nresult = stat[stat['总金额'] > 3000]`, hint: '先筛选已支付，再 groupby + agg，最后对结果筛选。' },
    { q: '<p>计算每笔订单金额占<b>该用户全部订单金额</b>的比例。返回：order_id、user_id、ratio 三列。</p>',
      sol: `df = orders[['order_id', 'user_id']].copy()\ndf['ratio'] = orders['amount'] / orders.groupby('user_id')['amount'].transform('sum')\nresult = df`, hint: "orders.groupby('user_id')['amount'].transform('sum') 得到每行对应的用户总额。" },
    { q: '<p>找出每个品类中<b>价格最高的 2 个</b>商品，返回 <code>category、product_name、price</code>。</p>',
      sol: `result = products.sort_values('price', ascending=False).groupby('category').head(2)[['category', 'product_name', 'price']]`, hint: "sort_values 降序 → groupby('category').head(2) → 选列。" },
  ],
},
{
  id: 'p6', title: '合并数据 merge / concat', sub: 'merge 四种连接 · 多键与不同列名 · indicator · concat 拼接',
  body: `
<p><code>pd.merge</code> 对应 SQL 的 JOIN，<code>pd.concat</code> 对应 UNION ALL。</p>
<div data-viz="join" data-mode="py"></div>

<h2>merge</h2>
<textarea data-run="py">df = orders.merge(products, on='product_id', how='left')   # 也可写 pd.merge(orders, products, ...)
df[['order_id', 'product_name', 'category', 'amount']].head()</textarea>
<textarea data-code="py">pd.merge(a, b, on=['k1', 'k2'])                       # 多个键
pd.merge(a, b, left_on='uid', right_on='user_id')     # 两边列名不同
pd.merge(a, b, on='k', suffixes=('_a', '_b'))         # 同名非键列的后缀</textarea>
<p>找“没有匹配上”的记录：<code>indicator=True</code> 会多出一列 <code>_merge</code>，标明每行来自哪边：</p>
<textarea data-run="py">m = users.merge(orders[['user_id', 'order_id']], on='user_id', how='left', indicator=True)
print(m['_merge'].value_counts())
m.loc[m['_merge'] == 'left_only', ['user_id', 'city', 'register_date']].head()</textarea>
<div class="tip">更简单的写法：<code>users[~users['user_id'].isin(orders['user_id'])]</code>，对应 SQL 的 NOT IN / NOT EXISTS。</div>

<h2>连续合并多张表</h2>
<textarea data-run="py">full = (orders
        .merge(products[['product_id', 'category']], on='product_id')
        .merge(users[['user_id', 'city']], on='user_id'))
full.groupby(['city', 'category'])['amount'].sum().unstack().round()</textarea>
<div class="warn">merge 前先确认键是否唯一。一对多合并会让行数变多，多对多合并可能让行数爆炸。可以用 <code>validate='m:1'</code> 让 pandas 帮你检查：键不唯一时直接报错。</div>

<h2>concat：拼接</h2>
<div data-viz="concat"></div>
<textarea data-run="py">jan = orders[orders['order_date'].dt.month == 1]
feb = orders[orders['order_date'].dt.month == 2]
both = pd.concat([jan, feb], ignore_index=True)
print(len(jan), len(feb), len(both))</textarea>
`,
  ex: [
    { q: '<p>合并 orders 与 products，计算每个品类的<b>已支付</b>总销售额。</p>',
      sol: `df = orders[orders['status'] == '已支付'].merge(products, on='product_id')\nresult = df.groupby('category')['amount'].sum()`, hint: "先筛选或先 merge 都可以，然后 groupby('category')['amount'].sum()。" },
    { q: '<p>找出<b>从未下过单</b>的用户，返回 <code>user_id、city</code> 两列。</p>',
      sol: `result = users.loc[~users['user_id'].isin(orders['user_id']), ['user_id', 'city']]`, hint: "~users['user_id'].isin(orders['user_id'])，或 merge(indicator=True)。" },
    { q: '<p>合并 orders、products、users 三张表，统计<b>每个城市、每个品类</b>的订单数。返回长表：city、category、订单数。</p>',
      sol: `df = orders.merge(products, on='product_id').merge(users, on='user_id')\nresult = df.groupby(['city', 'category']).size()`, hint: '连续两次 merge，然后 groupby([城市, 品类]).size()。' },
    { q: '<p>分别筛选出 <b>1 月</b>和 <b>6 月</b>的订单，再纵向拼接成一张表，返回拼接后表格的 <code>order_id</code> 列。</p>',
      sol: `m = orders['order_date'].dt.month\nresult = pd.concat([orders[m == 1], orders[m == 6]], ignore_index=True)['order_id']`, hint: "pd.concat([df1, df2], ignore_index=True)['order_id']。" },
  ],
},
{
  id: 'p7', title: '透视与重塑', sub: 'pivot_table · crosstab · melt · unstack',
  body: `
<p>同样的数据，可以是“长表”（每行一条记录），也可以是“宽表”（一个维度展开成列）。报表、画图、建模需要的形状不同，pandas 让转换只需一行。</p>
<div data-viz="pivot" data-mode="py"></div>

<h2>pivot_table：数据透视表</h2>
<p>和 Excel 的数据透视表一样：<code>index</code> 放行、<code>columns</code> 放列、<code>values</code> 放值、<code>aggfunc</code> 指定聚合方式：</p>
<textarea data-run="py">df = orders.merge(products, on='product_id')
df['month'] = df['order_date'].dt.strftime('%Y-%m')
df.pivot_table(index='month', columns='category', values='amount',
               aggfunc='sum', fill_value=0, margins=True, margins_name='合计').round()</textarea>

<h2>crosstab：交叉计数</h2>
<textarea data-run="py">pd.crosstab(users['city'], users['channel'])</textarea>
<textarea data-run="py"># normalize='index'：每行加起来为 1，看每个城市的渠道构成
pd.crosstab(users['city'], users['channel'], normalize='index').round(3)</textarea>

<h2>melt：宽表变长表</h2>
<textarea data-run="py">wide = pd.crosstab(users['city'], users['channel']).reset_index()
long = wide.melt(id_vars='city', var_name='channel', value_name='users')
long.head(8)</textarea>

<h2>unstack / stack</h2>
<p>多列 groupby 的结果是“多层索引”的长 Series，<code>unstack()</code> 把最内层索引展开成列——这是 pivot_table 的另一种写法：</p>
<textarea data-run="py">users.groupby(['city', 'gender']).size().unstack()</textarea>
`,
  ex: [
    { q: '<p>用 <code>pivot_table</code> 统计每个城市（行）各渠道（列）的用户数，缺失填 0。</p>',
      sol: `result = users.pivot_table(index='city', columns='channel', values='user_id', aggfunc='count', fill_value=0)`, hint: "pivot_table(index='city', columns='channel', values='user_id', aggfunc='count', fill_value=0)，crosstab 也可以。" },
    { q: '<p>统计每月（格式 YYYY-MM）每个品类的<b>已支付</b>销售额：月份为行、品类为列。</p>',
      sol: `df = orders[orders['status'] == '已支付'].merge(products, on='product_id')\ndf['month'] = df['order_date'].dt.strftime('%Y-%m')\nresult = df.pivot_table(index='month', columns='category', values='amount', aggfunc='sum')`,
      hint: "dt.strftime('%Y-%m') 生成月份列，再 pivot_table。" },
    { q: '<p>把上一题的宽表用 <code>melt</code> 还原成长表，三列依次为：month、category、amount。</p>',
      sol: `df = orders[orders['status'] == '已支付'].merge(products, on='product_id')\ndf['month'] = df['order_date'].dt.strftime('%Y-%m')\nwide = df.pivot_table(index='month', columns='category', values='amount', aggfunc='sum')\nresult = wide.reset_index().melt(id_vars='month', var_name='category', value_name='amount')`,
      hint: '先 reset_index() 把 month 变回普通列，再 melt(id_vars=\'month\', ...)。' },
  ],
},
{
  id: 'p8', title: '时间序列', sub: '.dt 属性 · 日期运算 · resample · shift / pct_change · rolling · cumsum · rank',
  body: `
<p>业务数据几乎都带时间。pandas 的时间处理非常强大：按月汇总、计算环比、移动平均都只需一两行。</p>

<h2>.dt：日期的各种属性</h2>
<textarea data-run="py">d = orders['order_date']
pd.DataFrame({
    '日期': d, '年': d.dt.year, '月': d.dt.month, '日': d.dt.day,
    '星期几(0=周一)': d.dt.dayofweek, '年月': d.dt.strftime('%Y-%m'), '所属周': d.dt.to_period('W').astype(str),
}).head()</textarea>

<h2>日期运算</h2>
<textarea data-run="py">first = orders.groupby('user_id')['order_date'].min().rename('首单日期')
df = users.set_index('user_id').join(first, how='inner')
df['间隔天数'] = (df['首单日期'] - df['register_date']).dt.days     # 两个日期相减得到 Timedelta
df['首单后30天'] = df['首单日期'] + pd.Timedelta(days=30)
df[['register_date', '首单日期', '间隔天数', '首单后30天']].head()</textarea>

<h2>resample：按时间频率汇总</h2>
<p>把日期设为索引后，<code>resample</code> 可以按天 D、周 W、月 MS 汇总，而且<b>没有数据的日期也会补上</b>（这点比 groupby 更好）：</p>
<textarea data-run="py" data-chart="line">orders.set_index('order_date').resample('W')['amount'].sum()</textarea>

<h2>shift 与 pct_change：环比</h2>
<div data-viz="lag" data-mode="py"></div>
<textarea data-run="py" data-chart="combo">m = orders[orders['status'] == '已支付'].set_index('order_date').resample('MS')['amount'].sum().to_frame('gmv')
m['环比'] = m['gmv'].pct_change()
m.index = m.index.strftime('%Y-%m')
m</textarea>

<h2>rolling 与 cumsum：移动平均与累计</h2>
<div data-viz="rolling"></div>
<textarea data-run="py" data-chart="line">daily = orders.set_index('order_date').resample('D')['amount'].sum().to_frame('日销售额')
daily['7日均线'] = daily['日销售额'].rolling(7).mean()
daily</textarea>
<textarea data-run="py"># 每个用户的累计消费、第几次购买
df = orders.sort_values(['user_id', 'order_date', 'order_id'])
df['累计金额'] = df.groupby('user_id')['amount'].cumsum()
df['第几单'] = df.groupby('user_id').cumcount() + 1
df[['user_id', 'order_date', 'amount', '累计金额', '第几单']].head(8)</textarea>

<h2>rank：排名</h2>
<div data-viz="rank" data-mode="py"></div>
<textarea data-run="py">df = products.copy()
df['品类内价格排名'] = df.groupby('category')['price'].rank(method='dense', ascending=False)
df.sort_values(['category', '品类内价格排名']).head(8)</textarea>
`,
  ex: [
    { q: '<p>统计每月（索引或列为 YYYY-MM 格式）的<b>已支付</b>销售额，并计算环比增长率。返回三列：月份、销售额、环比。</p>',
      sol: `paid = orders[orders['status'] == '已支付']\nm = paid.groupby(paid['order_date'].dt.strftime('%Y-%m'))['amount'].sum().to_frame('销售额')\nm['环比'] = m['销售额'].pct_change()\nresult = m`,
      hint: "groupby(dt.strftime('%Y-%m')) 或 resample('MS') 汇总；再用 pct_change()。" },
    { q: '<p>用 <code>resample(\'D\')</code> 统计每天的订单数（没有订单的日子记 0），再计算 <b>7 日移动平均</b>。返回移动平均这一个 Series（日期为索引）。</p>',
      sol: `daily = orders.set_index('order_date').resample('D')['order_id'].count()\nresult = daily.rolling(7).mean()`, hint: "resample('D')['order_id'].count() 再 .rolling(7).mean()。" },
    { q: '<p>计算每个用户每笔订单后的<b>累计消费金额</b>（按 order_date、order_id 排序）。返回：order_id、user_id、cum_amount。</p>',
      sol: `df = orders.sort_values(['user_id', 'order_date', 'order_id']).copy()\ndf['cum_amount'] = df.groupby('user_id')['amount'].cumsum()\nresult = df[['order_id', 'user_id', 'cum_amount']]`, hint: "先排序，再 groupby('user_id')['amount'].cumsum()。" },
    { q: '<p>给每个用户的订单按时间编号（第几次购买，从 1 开始；同一天按 order_id）。返回：order_id、user_id、nth。</p>',
      sol: `df = orders.sort_values(['user_id', 'order_date', 'order_id']).copy()\ndf['nth'] = df.groupby('user_id').cumcount() + 1\nresult = df[['order_id', 'user_id', 'nth']]`, hint: "groupby('user_id').cumcount() + 1。" },
  ],
},
];
