# ملاحظات عامة (Backend + MongoDB)

## 1) رموز العلاقات

| الرمز | المعنى | مثال |
|---|---|---|
| `A ──1 B` | واحد لواحد | User ──1 Cart |
| `A ──< B` | واحد لكتير (B هي الكتير) | User ──< Order |
| `A >── B` | كتير لواحد | Review >── User |
| `A >──< B` | كتير لكتير | Product >──< Order |

---

## 2) Embed ولا Reference؟

| Embed (جوه الـ document) | Reference (`ref` + `_id`) |
|---|---|
| العدد قليل ومحدود | العدد كبير أو مفتوح |
| بيتقري دايماً مع الأب | بيتقري لوحده كتير |
| مالوش حياة لوحده | ليه CRUD لوحده |
| مثال: Addresses, Order items | مثال: Reviews, Variants |

**Snapshot:** انسخي البيانات وقت الحدث (سعر، اسم، عنوان) لو لازم تفضل ثابتة حتى لو الأصل اتغير.

---

## 3) الـ Indexes

| النوع | بيعمل إيه |
|---|---|
| `index: true` | يسرّع البحث، يسمح بالتكرار |
| `unique: true` | يسرّع البحث + يمنع التكرار (index تلقائي) |
| Compound `schema.index({ a: 1, b: 1 })` | على أكتر من حقل، ممكن `unique` (مثال: review واحد لكل user/product) |

- القراءة أسرع ← الكتابة (insert/update) أبطأ شوية.
- حطي index بس على الحقول اللي بتعملي بيها **filter / sort / lookup**.

---

## 4) تفاصيل العلاقات

- ممنوع array بيكبر بلا حد جوه document (reviews، orders). لو لازم ← حطي سقف.
- الـ document حده 16MB.
- **Denormalization:** نسخ قيمة محسوبة للسرعة (زي `ratingAvg`)، بس حددي مين بيحدّثها وإمتى.

---

## 5) الحالات (State machine)

لأي حاجة بتتغير مع الوقت (order، payment)، اكتبي الانتقالات المسموحة بس:

```
pending → paid → shipped → delivered
```

وامنعي أي قفزة غير منطقية (delivered → pending).

---

## 6) التزامن (Concurrency)

لو اتنين عملوا نفس العملية في نفس اللحظة (آخر قطعة في المخزون):
حطي الشرط **جوه الـ update** نفسه، مش read ثم write:

```js
updateOne({ _id, stock: { $gte: qty } }, { $inc: { stock: -qty } })
```

---

## 7) الأمان (دايماً)

| الموضوع | القاعدة |
|---|---|
| Authentication | JWT + bcrypt |
| Authorization | roles (admin / user) |
| الملكية | الـ id في الـ URL مش دليل ملكية — اتأكدي الداتا بتاعته |
| Mass assignment | متعمليش `create(req.body)` على `role`/`price`/`status` |
| Input | sanitize + validate (Joi / Zod) |
| Transactions في MongoDB | محتاجة replica set أو Atlas (مش standalone) |
