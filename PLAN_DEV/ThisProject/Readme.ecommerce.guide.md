# E-commerce Backend — المرجع

> Node.js + Express + Mongoose

---

## 1) المستخدمين

| Role | الصلاحيات |
|---|---|
| Guest | تصفح + بحث |
| Customer | Auth، Cart، Orders، Reviews، Wishlist |
| Admin | إدارة Products / Categories / Brands / Orders / Coupons |

---

## 2) الـ Scope

| Must (MVP) | Should | Later |
|---|---|---|
| Auth + Roles | Reviews | Shipment |
| Category | Wishlist | Return / Refund |
| Product + Variant | Coupon | Notifications |
| Cart | Brand | Multi-vendor |
| Order | رفع الصور | Warehouse |
| Payment (COD) | Payment gateway | Redis / Elasticsearch |
| | Forgot / change password | |
| | Admin: إدارة المستخدمين | |

---

## 3) العلاقات

```
User     ──< Address        (embed)
User     ──< Product        (wishlist: array of refs في User)
User     ──1 Cart
User     ──< Order ──< OrderItem  (embed + snapshot)
Order    ──< Payment
Category ──< Category       (self-ref: parent)
Category ──< Product
Brand    ──< Product
Product  ──< Variant
Product  ──< Review >── User
Coupon   (مستقل، Order يشاور عليه)
```

| العلاقة | القرار | السبب |
|---|---|---|
| User → Addresses | Embed | قليلة وبتتقري مع اليوزر |
| Order → Items | Embed + Snapshot | تفضل زي وقت الشراء |
| Product → Variants | Reference | لكل واحد سعر ومخزون |
| Product → Reviews | Reference | ممكن توصل آلاف |
| Order → Payment | Reference | محاولات دفع متعددة |
| Category → Parent | Self-ref | شجرة غير محدودة |

---

## 4) الـ Schemas

```js
User     { name, email:unique, password:select:false, role:['customer','admin'],
           addresses:[{ alias, details, phone, city, postalCode }],
           wishlist:[ref Product] }          // سقف 100

Category { name, slug:unique, parent:ref Category|null, ancestors:[ref Category]:index }

Brand    { name:unique, slug:unique, image }

Product  { name, slug:unique, description, category:ref:index, brand:ref,
           images:[String], ratingAvg, ratingCount, isActive,
           minPrice, maxPrice }              // denormalized من الـ variants

Variant  { product:ref:index, sku:unique, attributes:{ color, size },
           price (قرش/سنت، integer), stock:min 0, isActive }

Cart     { user:ref:unique, items:[{ variant, quantity }] }

Order    { user:index, items:[{ variant, name, price, quantity }],     // snapshot
           shippingAddress:{...},                                       // snapshot
           subtotal, discount, shippingFee, total (كلها integers), coupon,
           status:[pending, paid, shipped, delivered, cancelled, refunded]:index }

Payment  { order:index, method, status, amount, transactionId }

Review   { product:index, user, rating:1..5, comment }   // unique (product, user)

Coupon   { code:unique, type:['percent','fixed'], value, minOrder,
           expiresAt, usageLimit, usedCount }
```

---

## 5) الـ API

| Resource | Endpoint | Access |
|---|---|---|
| **Auth** | `POST /auth/register` · `POST /auth/login` | public |
| | `PATCH /users/me/password` | user |
| **Me** | `GET/PATCH /users/me` | user |
| **Addresses** | `POST /users/me/addresses` · `PATCH/DELETE /users/me/addresses/:id` | user |
| **Categories** | `GET /categories` · `GET /categories/:id` | public |
| | `POST /categories` · `PATCH/DELETE /categories/:id` | admin |
| **Brands** | `GET /brands` · `GET /brands/:id` | public |
| | `POST /brands` · `PATCH/DELETE /brands/:id` | admin |
| **Products** | `GET /products?category=&brand=&minPrice=&maxPrice=&search=&sort=&page=&limit=` | public |
| | `GET /products/:id` | public |
| | `POST /products` · `PATCH /products/:id` · `DELETE /products/:id` (soft) | admin |
| **Variants** | `GET /products/:productId/variants` | public |
| | `POST /products/:productId/variants` · `PATCH/DELETE /variants/:id` | admin |
| **Cart** | `GET /cart` · `POST /cart/items` · `PATCH/DELETE /cart/items/:variantId` · `DELETE /cart` | user |
| **Orders** | `POST /orders` · `GET /orders` · `GET /orders/:id` · `PATCH /orders/:id/cancel` | user |
| | `GET /admin/orders` · `PATCH /admin/orders/:id/status` | admin |
| **Reviews** | `GET /products/:productId/reviews` | public |
| | `POST /products/:productId/reviews` | user |
| | `PATCH/DELETE /reviews/:id` | owner / admin |
| **Wishlist** | `POST/DELETE /wishlist/:productId` | user |
| **Coupons** | `POST /coupons/validate` | user |

---

## 6) هيكل المشروع

```
app.js
config/       connectDB.js
models/       *.model.js
controllers/  *.controller.js
routes/       *.route.js + index.js
middleware/   protect, restrictTo, validate, errorHandler, upload
utils/        AppError, catchAsync, apiFeatures, validation/
```

---

## 7) ترتيب البناء

| # | المرحلة | اختبار النجاح |
|---|---|---|
| 1 | Setup: Express، DB، env، error handler | السيرفر شغال ومتصل |
| 2 | Auth: bcrypt، JWT، `protect`، `restrictTo` | route محمي يرفض بدون token |
| 3 | Profile + Addresses | CRUD للعناوين |
| 4 | Category (parent + ancestors) | شجرة 3 مستويات |
| 5 | Brand | CRUD |
| 6 | Product + Variant (slug، filter، sort، pagination، search) | فلترة وصفحات صح |
| 7 | رفع الصور (Multer + Cloudinary) | اللينك يتحفظ |
| 8 | Cart + التحقق من المخزون | كمية > stock تترفض |
| 9 | Coupon (قبل الأوردر لأنه بيستخدمه) | validate صح (منتهي / حد أقصى / minOrder) |
| 10 | Order (transaction) | stock ينقص والكارت يفضى، والإلغاء يرجّع المخزون |
| 11 | Payment (COD ← gateway) | status الأوردر يتغير |
| 12 | Reviews + Wishlist | `ratingAvg` صح |
| 13 | Admin stats | — |
| 14 | Tests + Swagger + Deploy | رابط شغال |

---

## 8) المنطق الحساس

### إنشاء الأوردر

```
1. اقري الكارت
2. لكل item: variant موجود + isActive + stock >= qty
   → snapshot (name, price من الـ DB مش من الـ client)
3. الكوبون: مش منتهي + usedCount < usageLimit + subtotal >= minOrder
4. احسبي subtotal / discount / shippingFee / total في الـ backend
5. Transaction:
   - updateOne({ _id, stock: { $gte: qty } }, { $inc: { stock: -qty } })
   - create Order
   - coupon.usedCount++
   - فضّي الكارت
```

> الـ Transaction محتاجة MongoDB **replica set** (Atlas أو local replica set)، مش بتشتغل على standalone.

> شرط `stock: { $gte: qty }` جوه الـ update يمنع اتنين يشتروا آخر قطعة في نفس اللحظة.

### حالات الأوردر

```
pending → paid → shipped → delivered
   ↓        ↓
cancelled  refunded
```

ممنوع أي انتقال غير ده.

- **الإلغاء:** بيرجّع المخزون (`$inc: +qty`) وبيرجّع `usedCount` للكوبون، كله في transaction.
- أوردر `pending` بدفع أونلاين ومادفعش بعد مدة ← يتلغى تلقائياً ويرجّع المخزون.
- الإلغاء من الـ customer مسموح في `pending` بس.

### السعر في الـ Product
السعر في الـ Variant، فالفلترة بـ `minPrice/maxPrice` على Product تحتاج `minPrice` و`maxPrice` محفوظين في الـ Product. حدّثيهم كل ما variant يتضاف/يتعدل/يتمسح.

### Reviews

- review واحد لكل (user, product).
- بعد add/update/delete ← أعيدي حساب `ratingAvg` و `ratingCount` (aggregation أضمن من الزيادة اليدوية).
- (تحسين) بس اللي اشترى المنتج.

---

## 9) القواعد

1. الـ client مش مصدر للسعر أو المجموع أو الخصم.
2. Snapshot في الأوردر (اسم، سعر، عنوان).
3. Soft delete للمنتجات (`isActive: false`).
4. Indexes: `slug`, `category`, `brand`, `user`, `status`, `product`, `sku`.
5. كل route متحدد: public / user / admin.
6. `password` مايظهرش في أي response.
7. Pagination في أي list.
8. Validation (Joi/Zod) قبل الـ controller.
9. Transaction لأي عملية على أكتر من collection.
10. `helmet` + `cors` + rate limit.
11. **الملكية:** `GET/PATCH /orders/:id` و`/cart` و`/reviews/:id` لازم تتأكد إن الداتا بتاعة اليوزر.
12. **Mass assignment:** `register` ما يقبلش `role`، والـ product/order ما يقبلوش `price` أو `status` من الـ body.
13. **Category:** ممنوع مسحها لو فيها products أو children.
14. الأرقام المالية integers (أصغر وحدة).

---

## 10) Checklist

**Setup**
- [ ] `.env` + `.gitignore`
- [ ] DB connection
- [ ] Error handler موحد
- [ ] helmet + cors + rate limit

**Features**
- [ ] Auth + roles
- [ ] Addresses
- [ ] Categories
- [ ] Brands
- [ ] Products + Variants
- [ ] رفع الصور
- [ ] Cart
- [ ] Orders
- [ ] Payment
- [ ] Reviews
- [ ] Wishlist
- [ ] Coupons

**Quality**
- [ ] Tests (auth، order)
- [ ] Swagger
- [ ] README
- [ ] Deploy

---

## 11) المراجع

- Mongoose: https://mongoosejs.com/docs/
- Express: https://expressjs.com/
- MongoDB (Indexes, Transactions): https://www.mongodb.com/docs/manual/
- JWT: https://jwt.io/introduction
