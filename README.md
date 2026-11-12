# 数析实验室 · SQL × pandas

### 👉 在线访问：**[https://patience-star.github.io/sql-pandas-lab/](https://patience-star.github.io/sql-pandas-lab/)**

电脑、手机浏览器直接打开即可学习和运行代码，无需安装任何软件。

日常数据分析必备的 SQL 与 pandas 学习站：分模块讲解 + 可视化动画 + 浏览器内直接运行代码 + 自动判题 + 业务场景实战。电脑、手机都能用，纯静态页面，部署在 GitHub Pages。

- **SQL 8 课**：查询基础、聚合分组、JOIN、CASE WHEN、子查询与 CTE、窗口函数、日期与字符串函数（附 MySQL 对照）、NULL 与常见陷阱
- **pandas 8 课**：DataFrame 入门、筛选排序、数据清洗、列运算、groupby、merge/concat、透视重塑、时间序列
- **业务实战 10 题**：DAU/MAU、GMV 环比、分组 TopN、留存、漏斗、连续登录、复购率、RFM、累计与移动平均、帕累托/ABC（SQL 与 pandas 双解法）

## 技术说明

- SQL 由 [sql.js](https://github.com/sql-js/sql.js)（SQLite 的 WebAssembly 版）执行；pandas 由 [Pyodide](https://pyodide.org) 0.29.5（pandas 2.3.3）执行。
- 所有运行库都放在 `vendor/` 中，不依赖外部 CDN，国内网络也能用。首次运行 pandas 代码需下载约 20MB，之后由浏览器缓存。
- 没有构建步骤：`index.html` + `assets/` + `content/` 即全部源码。学习进度保存在浏览器 localStorage 中。

## 本地预览

```bash
python -m http.server 8000
```

然后打开 http://localhost:8000 。（直接双击 index.html 无法加载 WebAssembly，需要通过 HTTP 服务访问。）

打开 http://localhost:8000/#/selftest 可以运行所有示例与参考答案，检查内容和判题器是否正常。

## 目录结构

```
index.html          页面外壳
assets/app.js       路由、渲染、代码运行、判题、进度
assets/viz.js       概念可视化动画、结果图表
assets/style.css    样式（浅色 / 深色、响应式）
content/*.js        课程内容：sql.js、pandas.js、cases.js
data/               模拟电商数据集（CSV + shop.db）
tools/make_data.py  数据生成脚本（固定随机种子）
vendor/             Pyodide、sql.js、CodeMirror
```

修改课程：编辑 `content/` 下的文件。`<textarea data-run="sql">` 是可运行代码块，`<div data-viz="join">` 是可视化组件，练习写在每课的 `ex` 数组中（`sol` 为参考答案）。

重新生成数据：`python tools/make_data.py`（会覆盖 `data/`）。

## 部署到 GitHub Pages

1. 推送到 GitHub 仓库的 `main` 分支。
2. 仓库 **Settings → Pages → Build and deployment**：Source 选 *Deploy from a branch*，Branch 选 `main` / `(root)`，保存。
3. 一两分钟后访问 `https://<用户名>.github.io/<仓库名>/`。
