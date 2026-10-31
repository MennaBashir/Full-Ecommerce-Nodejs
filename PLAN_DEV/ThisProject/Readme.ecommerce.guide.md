# 🛒 دليل بناء E-commerce Backend (Node.js + Express + Mongoose)

> تطبيق عملي للدليل العام. اتبعي نفس الخطوات بالترتيب.

---

## 1) فهم المشروع

**المشكلة:** موقع يعرض منتجات، والعميل يشتري، والأدمن يدير.

**المستخدمين:**

| النوع | بيعمل إيه |
|---|---|
| **Guest** | يتصفح المنتجات ويبحث |
| **Customer** | يسجل دخول، كارت، أوردرات، reviews، wishlist |
| **Admin** | يدير المنتجات والتصنيفات والأوردرات والكوبونات |
| **Vendor** *(اختياري)* | يدير منتجاته هو بس |

---

## 2) الـ Scope

| ✅ Must (MVP) | 🟡 Should | ⏳ Later |
|---|---|---|
| Auth + Roles | Reviews | Shipment |
| Category | Wishlist | Return / Refund |
| Product + Variant | Coupon | Notifications |
| Cart | Payment حقيقي | Multi-vendor |
| Order | Brand | Warehouse |
| | رفع الصور | Banners / Settings |

---

## 3) الـ Models والعلاقات

```
User ──< Address            (embedded)
User ──1 Cart
User ──< Order ──< OrderItem (embedded)
Order ──< Payment
Category ──< Category       (self-reference: parent)
Category ──< Product ──< Variant
Product ──< Review >── User
User ──1 Wishlist ──< Product
Coupon                      (مستقل، الأوردر يشاور عليه)
```

### Embed ولا Reference؟

| العلاقة | القرار | السبب |
|---|---|---|
| User → Addresses | **Embed** | عددها قليل وبتتقري مع اليوزر |
| Order → Items | **Embed + Snapshot** | لازم تفضل زي ما كانت وقت الشراء |
| Product → Variants | **Reference** | كتير ولها سعر ومخزون لوحدها |
| Product → Reviews | **Reference** | ممكن توصل آلاف |
| Order → Payment | **Reference** | محاولات دفع متعددة |
| Category → Parent | **Self-reference** | شجرة بمستويات غير محددة |

### الـ Schemas الأساسية

```js
// User
{
  name, email: { unique }, password: { select: false },
  role: { enum: ['customer', 'admin'], default: 'customer' },
  addresses: [{ alias, details, phone, city, postalCode }],  // _id تلقائي
  wishlist: [{ ref: 'Product' }]
}

// Category
{
  name, slug: { unique },
  parent: { ref: 'Category', default: null },
  ancestors: [{ ref: 'Category', index: true }]   // لجلب كل الأحفاد بسهولة
}

// Product
{
  name, slug: { unique }, description,
  category: { ref: 'Category', index: true },
  brand, images: [String],
  ratingAvg, ratingCount,        // denormalized للسرعة
  isActive                       // soft delete
}

// Variant
{
  product: { ref: 'Product', index: true },
  sku: { unique },               // كود فريد لكل variant
  attributes: { color, size },   // أو [{ name, value }] لو الأنواع متنوعة
  price, stock: { min: 0 }
}

// Cart
{ user: { ref: 'User', unique }, items: [{ variant, quantity }] }

// Order
{
  user: { index }, items: [{ variant, name, price, quantity }],   // snapshot
  shippingAddress: { ... },                                       // snapshot
  subtotal, discount, shippingFee, total, coupon,
  status: { enum: [pending, paid, shipped, delivered, cancelled, refunded], index }
}

// Payment
{ order: { index }, method, status, amount, transactionId }

// Review
{ product: { index }, user, rating: 1..5, comment }
// + unique compound index على (product, user)

// Coupon
{ code: { unique }, type: ['percent','fixed'], value, minOrder, expiresAt, usageLimit, usedCount }
```

---

## 4) الـ API

```
── Auth ──────────────────────────────────────
POST   /auth/register
POST   /auth/login
GET    /users/me
PATCH  /users/me
POST   /users/me/addresses
PATCH  /users/me/addresses/:addressId
DELETE /users/me/addresses/:addressId

── Categories ────────────────────────────────
GET    /categories                 (public)
GET    /categories/:id             (public)
POST   /categories                 (admin)
PATCH  /categories/:id             (admin)
DELETE /categories/:id             (admin)

── Products ──────────────────────────────────
GET    /products                   (public: ?category=&minPrice=&maxPrice=&sort=&page=&limit=&search=)
GET    /products/:id               (public)
POST   /products                   (admin)
PATCH  /products/:id               (admin)
DELETE /products/:id               (admin → soft delete)

── Variants ──────────────────────────────────
GET    /products/:productId/variants
POST   /products/:productId/variants   (admin)
PATCH  /variants/:id                   (admin)
DELETE /variants/:id                   (admin)

── Cart ──────────────────────────────────────
GET    /cart
POST   /cart/items
PATCH  /cart/items/:variantId
DELETE /cart/items/:variantId
DELETE /cart

── Orders ────────────────────────────────────
POST   /orders                     (من الكارت)
GET    /orders                     (طلباتي)
GET    /orders/:id
PATCH  /orders/:id/cancel
GET    /admin/orders               (admin)
PATCH  /admin/orders/:id/status    (admin)

── Reviews / Wishlist / Coupons ──────────────
GET    /products/:productId/reviews
POST   /products/:productId/reviews
POST   /wishlist/:productId
DELETE /wishlist/:productId
POST   /coupons/validate
```

---

## 5) هيكل المشروع

```
ecommerce-api/
├── config/        db.js, env.js
├── models/        user, category, product, variant, cart, order, payment, review, coupon
├── controllers/   auth, user, category, product, variant, cart, order, review ...
├── routes/        نفس الأسماء
├── middlewares/   auth.js (protect), role.js (restrictTo), validate.js, errorHandler.js, upload.js
├── utils/         ApiError, catchAsync, apiFeatures (filter/sort/paginate)
├── .env
└── app.js
```

---

## 6) ترتيب البناء

| # | المرحلة | تفاصيل | جرّبي قبل ما تكملي |
|---|---|---|---|
| 1 | **Setup** | Express، DB، env، error handler | السيرفر يشتغل ويتصل |
| 2 | **Auth** | register/login، bcrypt، JWT، `protect`، `restrictTo('admin')` | تسجيل ودخول وحماية route |
| 3 | **User profile + Addresses** | me، CRUD للعناوين | إضافة وتعديل ومسح عنوان |
| 4 | **Category** | CRUD + parent + ancestors | شجرة من 3 مستويات |
| 5 | **Product + Variant** | CRUD، slug، filters، pagination، search، sort | فلترة وصفحات صح |
| 6 | **رفع الصور** | Multer + Cloudinary | صورة تترفع ويتحفظ لينكها |
| 7 | **Cart** | إضافة/تعديل/مسح، التحقق من المخزون | كمية أكبر من المخزون ترفض |
| 8 | **Order** | إنشاء من الكارت داخل **transaction** | مخزون ينقص وكارت يفضى |
| 9 | **Payment** | في البداية COD، بعدين بوابة دفع | تغيير status الأوردر |
| 10 | **Reviews + Wishlist + Coupon** | وتحديث `ratingAvg` | حساب المتوسط صح |
| 11 | **Admin dashboard endpoints** | إحصائيات وإدارة الأوردرات | |
| 12 | **Tests + Swagger + Deploy** | | |

---

## 7) المنطق الحساس (انتبهي له)

### إنشاء الأوردر (Transaction إجباري)

```
1. اقري الكارت
2. لكل item:
   - تأكدي إن الـ variant موجود ومتاح (isActive)
   - تأكدي إن stock >= quantity
   - انسخي الاسم والسعر الحالي (snapshot) — السعر من الـ DB مش من الـ client!
3. طبّقي الكوبون (لو صالح: مش منتهي، usedCount < usageLimit، minOrder)
4. احسبي subtotal / discount / shippingFee / total  ← في الـ backend
5. داخل transaction:
   - نقّصي المخزون: updateOne({ _id, stock: { $gte: qty } }, { $inc: { stock: -qty } })
   - أنشئي الأوردر
   - زوّدي usedCount للكوبون
   - فضّي الكارت
```

> التحقق `stock: { $gte: qty }` جوه الـ update نفسه بيمنع إن اتنين يشتروا آخر قطعة في نفس اللحظة.

### حالات الأوردر (State machine)

```
pending → paid → shipped → delivered
   ↓        ↓
cancelled  refunded
```

متسمحيش بالقفز من حالة لحالة غير منطقية (delivered → pending).

### Reviews
- يوزر = review واحد للمنتج (unique compound index).
- بعد إضافة/حذف review حدّثي `ratingAvg` و `ratingCount` في المنتج.
- (تحسين) اسمحي بالـ review لمن اشترى المنتج فعلاً.

---

## 8) قواعد لازم تفضل في بالك

1. **لا تثقي في الـ client أبداً:** السعر والمجموع والخصم يتحسبوا في الـ backend.
2. **Snapshot** في الأوردرات (الاسم، السعر، العنوان).
3. **Soft delete** للمنتجات (`isActive: false`) عشان الأوردرات القديمة متتكسرش.
4. **Indexes** على: `slug`, `category`, `user`, `status`, `product`, `sku`.
5. **كل route لازم يتحدد:** public / user / admin.
6. **متحطيش** `password` في أي response (`select: false`).
7. **Pagination** إجباري في أي list (products, orders, reviews).
8. **Validation** لكل input (Joi/Zod) قبل ما يوصل للـ controller.
9. **Transactions** لأي عملية فيها أكتر من collection.

---

## 9) Checklist للمشروع

### Setup
- [ ] `.env` + `.gitignore`
- [ ] DB connection
- [ ] Error handler موحد
- [ ] `helmet` + `cors` + rate limit

### Features
- [ ] Auth + roles
- [ ] Addresses
- [ ] Categories (شجرة)
- [ ] Products + Variants + filters + pagination + search
- [ ] رفع الصور
- [ ] Cart
- [ ] Orders (transaction)
- [ ] Payment
- [ ] Reviews + ratingAvg
- [ ] Wishlist
- [ ] Coupons

### الجودة
- [ ] Tests للـ flows المهمة (auth، order)
- [ ] Swagger
- [ ] README للمشروع
- [ ] Deploy + رابط شغال

---

## 10) أفكار للتوسع بعدين

- **Brand** model بدل `brand: String`.
- **Shipment** (أكتر من شحنة للأوردر) و **Return/Refund**.
- **Attribute** model لتعريف خصائص كل تصنيف ديناميكياً.
- **Warehouse + Inventory** لو أكتر من مخزن.
- **Vendor** لو multi-vendor.
- **Notifications** و **AuditLog**.
- **Redis** للـ caching والـ sessions.
- **Elasticsearch** لو الـ search بقى ثقيل.

---

## 11) مصادر للرجوع لها

- Mongoose Docs: https://mongoosejs.com/docs/
- Express Docs: https://expressjs.com/
- MongoDB Manual (Indexes, Transactions): https://www.mongodb.com/docs/manual/
- JWT: https://jwt.io/introduction