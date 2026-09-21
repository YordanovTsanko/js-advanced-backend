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

| Метод | Път | Защита | Описание |
|---|---|---|---|
| POST | `/api/v1/auth/register` | публичен | Регистрация + изпращане на verification имейл |
| POST | `/api/v1/auth/login` | публичен | Вход, връща access + refresh token |
| POST | `/api/v1/auth/refresh` | публичен (изисква refresh token) | Ротация на токени |
| POST | `/api/v1/auth/logout` | публичен | Отменя refresh token / сесия |
| GET | `/api/v1/auth/verify-email/:token` | публичен | Потвърждава имейл |
| POST | `/api/v1/auth/forgot-password` | публичен | Изпраща линк за нулиране |
| POST | `/api/v1/auth/reset-password/:token` | публичен | Задава нова парола |
| POST | `/api/v1/auth/change-password` | вход | Смяна на парола от логнат потребител |
| GET/PATCH/DELETE | `/api/v1/users/me` | вход | Профил на текущия потребител |
| GET/PATCH/DELETE | `/api/v1/users/:id` | admin | Управление на потребители |
| GET/DELETE | `/api/v1/sessions` | вход | Активни сесии + прекратяване |
| GET/PATCH/DELETE | `/api/v1/notifications` | вход | Известия |
| GET | `/api/v1/audit-logs` | admin | Одит лог |

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
