# backend/

Пълна структура: `models` + `controllers` + `routes` + `middleware` + `utils`, свързани в едно Express приложение.

```
backend/
├── app.js                     # Входна точка: Express + MongoDB connect
├── package.json
├── .env.example
├── models/                    # Mongoose схеми (виж отделния README в models/)
│   ├── User.js
│   ├── Session.js
│   ├── LoginHistory.js
│   ├── AuditLog.js
│   ├── Notification.js
│   ├── PasswordReset.js
│   └── RefreshToken.js
├── controllers/
│   ├── authController.js      # register, login, refresh, logout, verify-email, forgot/reset password, change password
│   ├── userController.js      # профил на текущия потребител + admin CRUD
│   ├── sessionController.js   # преглед/прекратяване на активни сесии
│   ├── notificationController.js
│   └── auditLogController.js  # admin преглед на одит логове
├── routes/
│   ├── index.js                # обединява всички под /api/v1
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── sessionRoutes.js
│   ├── notificationRoutes.js
│   └── auditLogRoutes.js
├── middleware/
│   ├── auth.js                # protect / optionalAuth – проверка на JWT
│   ├── restrictTo.js          # role-based access control
│   ├── validate.js            # express-validator грешки -> AppError
│   ├── rateLimiter.js         # authLimiter, apiLimiter
│   ├── errorHandler.js        # централен error handler
│   └── notFound.js            # 404 за непознати маршрути
└── utils/
    ├── AppError.js            # клас за операционни грешки
    ├── catchAsync.js          # wrapper за async контролери
    ├── jwt.js                 # генериране/проверка на access & refresh токени
    ├── tokenUtils.js          # random токени + SHA-256 хеширане (email verify, reset, refresh)
    └── sendEmail.js           # nodemailer wrapper
```

## Как се свързва всичко

1. **`app.js`** свързва Mongo, monтира `routes/index.js` под `/api/v1` и добавя `notFound` + `errorHandler` накрая.
2. **Routes** дефинират URL-и, прилагат `protect` / `restrictTo` / validation chains и викат съответния controller.
3. **Controllers** използват директно моделите от `models/` (`User`, `Session`, `RefreshToken`, `PasswordReset`, `LoginHistory`, `AuditLog`, `Notification`) за да четат/пишат в базата.
4. **Middleware** пази маршрутите (автентикация, роли, rate limiting, валидация) и централизира обработката на грешки.
5. **Utils** съдържат преизползваема логика (JWT, токени, имейли, error класове), която controllers викат.

## Основни endpoint-и

Метод    Път    Защита    Body / Query
POST    /auth/register    публичен    { email, password, firstName, lastName }
POST    /auth/login    публичен    { email, password }
POST    /auth/refresh    публичен    { refreshToken }
POST    /auth/logout    публичен    { refreshToken } (опц.)
GET    /auth/verify-email/:token    публичен    —
POST    /auth/forgot-password    публичен    { email }
POST    /auth/reset-password/:token    публичен    { password }
POST    /auth/change-password    🔒 вход    { currentPassword, newPassword }

Users (/users)
Метод    Път    Защита    Body / Query
GET    /users/me    🔒 вход    —
PATCH    /users/me    🔒 вход    { firstName, lastName, username, phone, avatar, bio, preferences, address }
DELETE    /users/me    🔒 вход    —
GET    /users    🔑 admin    query: role, status, page, limit
GET    /users/:id    🔑 admin    —
PATCH    /users/:id    🔑 admin    { role, status, firstName, lastName, phone }
DELETE    /users/:id    🔑 admin    —

Sessions (/sessions)
Метод    Път    Защита    Body / Query
GET    /sessions    🔒 вход    —
DELETE    /sessions/all    🔒 вход    —
DELETE    /sessions/:id    🔒 вход    —

Notifications (/notifications)
Метод    Път    Защита    Body / Query
GET    /notifications    🔒 вход    query: read, page, limit
PATCH    /notifications/read-all    🔒 вход    —
PATCH    /notifications/:id/read    🔒 вход    —
DELETE    /notifications/:id    🔒 вход    —

Products (/products)
Метод    Път    Защита    Body / Query
GET    /products    публичен    query: page, limit, quantityType, minPrice, maxPrice, isActive, sort, order, search
GET    /products/:id    публичен    —
POST    /products    🔑 admin    { name, description, type, features, quantityType, quantity, price }
PATCH    /products/:id    🔑 admin    { name, description, type, features, quantityType, quantity, price, isActive }
DELETE    /products/:id    🔑 admin    —
PATCH    /products/:id/restore    🔑 admin    —

Favorites (/favorites)
Метод    Път    Защита    Body / Query
GET    /favorites    🔒 вход    —
GET    /favorites/:productId    🔒 вход    —
POST    /favorites/:productId    🔒 вход    —
DELETE    /favorites/:productId    🔒 вход    —

Cart (/cart)
Метод    Път    Защита    Body / Query
GET    /cart    🔒 вход    —
POST    /cart/items    🔒 вход    { productId, quantity }
PATCH    /cart/items/:productId    🔒 вход    { quantity }
DELETE    /cart/items/:productId    🔒 вход    —
DELETE    /cart    🔒 вход    —

Audit Logs (/audit-logs)
Метод    Път    Защита    Body / Query
GET    /audit-logs    🔑 admin    query: entityType, entityId, actor, action, page, limit


## Инсталация

```bash
cd backend
npm install
cp .env.example .env   # и попълни стойностите
npm run dev
```

## Забележки

- Паролите се хешират автоматично в `User.js` (`pre("save")` хук с bcrypt).
- Refresh токените се **ротират** при всяко `/auth/refresh` извикване – старият се маркира като `revoked`, издава се нов.
- `Session`, `PasswordReset` и `RefreshToken` използват TTL индекс (`expiresAt`), така че MongoDB сама трие изтеклите записи.
- `authLimiter` ограничава login/register/forgot-password до 10 опита на 15 минути на IP, за защита срещу brute-force.
- Всички admin действия върху потребители се записват в `AuditLog`.
