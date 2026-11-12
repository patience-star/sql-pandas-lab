"""生成模拟电商数据集：data/*.csv + data/shop.db（固定随机种子，可重复生成）。
用法：python tools/make_data.py
"""
import csv, math, random, sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path

random.seed(2024)
OUT = Path(__file__).resolve().parent.parent / "data"
OUT.mkdir(exist_ok=True)
START, END = date(2024, 1, 1), date(2024, 6, 30)
DAYS = (END - START).days + 1


def pick(weights):
    return random.choices(list(weights), list(weights.values()))[0]


# ---------- products ----------
CATS = {
    "数码": [("无线耳机", 299), ("蓝牙音箱", 199), ("充电宝", 129), ("机械键盘", 399), ("智能手表", 899), ("平板电脑", 2599), ("数据线", 29), ("无线鼠标", 89)],
    "服饰": [("纯棉T恤", 79), ("牛仔裤", 189), ("运动鞋", 459), ("羽绒服", 699), ("连帽卫衣", 229), ("连衣裙", 259), ("商务衬衫", 169), ("棒球帽", 59)],
    "美妆": [("口红", 189), ("保湿面霜", 329), ("精华液", 499), ("洗面奶", 69), ("防晒霜", 129), ("补水面膜", 99), ("香水", 599), ("眼影盘", 159)],
    "食品": [("坚果礼盒", 128), ("咖啡豆", 88), ("纯牛奶", 65), ("黑巧克力", 45), ("龙井茶叶", 238), ("零食大礼包", 99), ("土蜂蜜", 76), ("燕麦片", 39)],
    "家居": [("四件套", 359), ("收纳箱", 49), ("护眼台灯", 199), ("抱枕", 59), ("保温杯", 119), ("香薰", 89), ("纯棉毛巾", 35), ("居家拖鞋", 29)],
}
products = []
for cat, items in CATS.items():
    for name, price in items:
        products.append({"product_id": len(products) + 1, "product_name": name, "category": cat, "price": price})
# 帕累托式热度：少数商品卖得特别好
pop = [1 / (i + 1) ** 0.9 for i in range(len(products))]
random.shuffle(pop)

# ---------- users ----------
CITY = {"北京": 18, "上海": 18, "广州": 12, "深圳": 13, "杭州": 11, "成都": 10, "武汉": 9, "南京": 9}
CHANNEL = {"应用商店": 30, "抖音": 28, "微信": 25, "搜索引擎": 17}
users = []
for uid in range(1, 301):
    d = START + timedelta(days=int(DAYS * random.random() ** 1.5))
    users.append({
        "user_id": uid, "gender": random.choice("男女"),
        "age": None if random.random() < 0.04 else random.randint(18, 55),
        "city": pick(CITY), "channel": pick(CHANNEL), "register_date": d,
    })
users.sort(key=lambda u: u["register_date"])
for i, u in enumerate(users, 1):  # 让 user_id 按注册顺序编号
    u["user_id"] = i

# ---------- logins：马尔可夫链，昨天登录了今天更可能登录（产生连续登录） ----------
logins = []
for u in users:
    keep, base = random.uniform(0.35, 0.85), random.uniform(0.04, 0.3)
    d, on = u["register_date"], True
    while d <= END:
        if on:
            logins.append((u["user_id"], d))
        age = (d - u["register_date"]).days
        p = keep if on else base * math.exp(-age / 60)
        on = random.random() < p
        d += timedelta(days=1)

# ---------- orders ----------
orders = []
for u in users:
    if random.random() < 0.1:
        continue  # 一部分用户从未下单（LEFT JOIN 练习用）
    rate = random.uniform(0.02, 0.12)
    for k in range((END - u["register_date"]).days + 1):
        d = u["register_date"] + timedelta(days=k)
        # 新用户更活跃；月份季节性：2 月春节淡季，6 月 618 大促
        season = {1: 0.9, 2: 0.6, 3: 1.0, 4: 0.95, 5: 1.0, 6: 1.0}[d.month] + (0.8 if d.month == 6 and d.day <= 18 else 0)
        if random.random() > rate * season * math.exp(-k / 120):
            continue
        p = random.choices(products, pop)[0]
        q = random.choices([1, 2, 3], [75, 18, 7])[0]
        orders.append([u["user_id"], p["product_id"], q, round(p["price"] * q, 2),
                       "已退款" if random.random() < 0.08 else "已支付", d])
orders.sort(key=lambda o: (o[5], o[0]))
orders = [[i + 1] + o for i, o in enumerate(orders)]

# ---------- events：漏斗 浏览 → 加购 → 下单 → 支付 ----------
events = []
STEPS = [("浏览", 1.0), ("加购", 0.45), ("下单", 0.6), ("支付", 0.85)]
for u in users:
    for _ in range(random.randint(1, 6)):
        span = (END - u["register_date"]).days
        t = datetime.combine(u["register_date"] + timedelta(days=random.randint(0, span)), datetime.min.time())
        t += timedelta(seconds=random.randint(8 * 3600, 23 * 3600))
        for step, p in STEPS:
            if random.random() > p:
                break
            events.append((u["user_id"], step, t.strftime("%Y-%m-%d %H:%M:%S")))
            t += timedelta(seconds=random.randint(20, 900))
events.sort(key=lambda e: e[2])

# ---------- users_raw：脏数据（清洗课用） ----------
raw = []
for u in users[:40]:
    city = u["city"]
    r = random.random()
    if r < 0.15:
        city = f"  {city} "
    elif r < 0.3:
        city = city + "市"
    elif r < 0.38:
        city = ""
    d = u["register_date"]
    reg = d.strftime("%Y/%m/%d") if random.random() < 0.3 else d.isoformat()
    age = "" if random.random() < 0.15 else str(u["age"] or "")
    gender = "" if random.random() < 0.1 else u["gender"]
    raw.append([u["user_id"], gender, age, city, reg])
raw += [raw[3], raw[10], raw[25]]  # 3 行完全重复

# ---------- 写出 ----------
TABLES = {
    "users": (["user_id", "gender", "age", "city", "channel", "register_date"],
              [[u[k] for k in ("user_id", "gender", "age", "city", "channel", "register_date")] for u in users]),
    "products": (["product_id", "product_name", "category", "price"], [list(p.values()) for p in products]),
    "orders": (["order_id", "user_id", "product_id", "quantity", "amount", "status", "order_date"], orders),
    "events": (["user_id", "event_type", "event_time"], events),
    "logins": (["user_id", "login_date"], logins),
    "users_raw": (["user_id", "gender", "age", "city", "register_date"], raw),
}
TYPES = {"user_id": "INTEGER", "product_id": "INTEGER", "order_id": "INTEGER", "age": "INTEGER",
         "quantity": "INTEGER", "price": "REAL", "amount": "REAL"}

db_path = OUT / "shop.db"
db_path.unlink(missing_ok=True)
con = sqlite3.connect(db_path)
for name, (cols, rows) in TABLES.items():
    rows = [[v.isoformat() if isinstance(v, date) else v for v in r] for r in rows]
    with open(OUT / f"{name}.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(cols)
        w.writerows([["" if v is None else v for v in r] for r in rows])
    t = "TEXT" if name == "users_raw" else None
    con.execute(f"CREATE TABLE {name} ({', '.join(f'{c} {t or TYPES.get(c, 'TEXT')}' for c in cols)})")
    con.executemany(f"INSERT INTO {name} VALUES ({','.join('?' * len(cols))})", rows)
    print(f"{name:10s} {len(rows):5d} rows")
con.commit()
con.execute("VACUUM")
con.close()
