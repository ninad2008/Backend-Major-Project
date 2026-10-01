# SpendWise - Personal Expense Tracker Backend API 💰

**Course**: B.Tech Computer Science Engineering (Backend Development & DBMS)  
**Institution**: ITM Skills University / School of Future Tech  
**Technology Stack**: Node.js, Express.js, MongoDB (Mongoose), Socket.io, Firebase Admin SDK  

---

## 📌 Project Overview
**SpendWise** is a full-featured, scalable backend REST API for a personal finance and expense logging application. It allows users to track expenses and income, create monthly category budgets, receive real-time Socket.io alerts when budget thresholds are crossed, send Firebase Cloud Messaging (FCM) push notifications, share finance data with families, and generate financial report charts (monthly, category-wise, yearly, and predictive forecasting).

---

## 🚀 Key Features

1. **Authentication & Authorization**:
   - JWT (JSON Web Token) authentication for protected endpoints.
   - Dual authentication support: Native JWT + Firebase Auth token verification.

2. **Transaction Management (CRUD)**:
   - Record income and expense entries with amount, category, date, and notes.
   - Filter transactions by date range, type, category, with pagination support.

3. **Budget Tracking & WebSockets**:
   - Set monthly spending limits per category.
   - Automatic background recalculation of spent amounts upon adding/updating expenses.
   - **Real-time WebSockets (Socket.io)**: Emits instant `budget_alert` events to clients when an expense pushes spending over the budget limit.

4. **Firebase Cloud Messaging (FCM)**:
   - Send push notifications to user devices when overspending occurs via Firebase Admin SDK (`majorproject-30b66`).

5. **Financial Reports & Analytics**:
   - **Monthly Report**: Aggregated expense vs income pie chart data and net savings calculation.
   - **Category Breakdown**: Category-wise expenditure totals and averages.
   - **Yearly Overview**: Month-by-month financial summary.
   - **Predictive Forecast**: 3-month moving average prediction for future spending.

6. **Interactive Documentation & API Testing**:
   - Integrated **Swagger UI** interactive documentation at `/api-docs`.
   - Included ready-to-import `postman_collection.json` with all endpoints pre-configured.

---

## 📁 Project Architecture

```
Major Project DBMS/
├── config/
│   ├── db.js                     # MongoDB Mongoose connection
│   └── firebase.js               # Firebase Admin SDK initialization
├── controllers/
│   ├── authController.js         # Register & Login logic
│   ├── transactionController.js # Transaction CRUD & Budget threshold sync
│   ├── budgetController.js        # Budget limit configuration & alert triggers
│   ├── categoryController.js      # System & Custom user categories
│   ├── reportController.js        # Analytics, charts, and forecasts
│   ├── notificationController.js  # Firebase FCM push notifications
│   └── receiptController.js       # Receipt scan & item extraction
├── middleware/
│   ├── auth.js                   # JWT & Firebase token verification
│   └── validate.js               # Input validation middleware
├── models/
│   ├── User.js                   # Mongoose User model
│   ├── Transaction.js            # Mongoose Transaction model
│   ├── Budget.js                 # Mongoose Budget model
│   └── Category.js               # Mongoose Category model
├── routes/
│   ├── authRoutes.js             # /api/auth
│   ├── transactionRoutes.js      # /api/transactions
│   ├── budgetRoutes.js           # /api/budgets
│   ├── categoryRoutes.js         # /api/categories
│   ├── reportRoutes.js           # /api/reports
│   ├── notificationRoutes.js     # /api/notifications
│   └── receiptRoutes.js          # /api/receipts
├── utils/
│   └── socket.js                 # Socket.io instance & alert emission helpers
├── .env                          # Environment configurations
├── firebase-service-account.json # Firebase Admin credentials
├── package.json                  # Dependencies & scripts
├── postman_collection.json       # Ready-to-import Postman Collection
├── README.md                     # Setup instructions & API documentation
└── server.js                     # Main HTTP & Socket.io server entrypoint
```

---

## 🛠️ Environment Configuration (.env)

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/spendwise
JWT_SECRET=spendwise_super_secret_key_2026_dbms_project
NODE_ENV=development
```

---

## ⚙️ Installation & Setup Guide

### 1. Prerequisites
- **Node.js**: v18.x or higher
- **MongoDB**: Local MongoDB instance running on `mongodb://localhost:27017/` (or MongoDB Atlas connection string)

### 2. Install Dependencies
Navigate to the project root directory and run:
```bash
npm install
```

### 3. Start MongoDB Server
Ensure MongoDB is running locally:
```bash
# On macOS via Homebrew:
brew services start mongodb-community
```

### 4. Run the API Server
```bash
# Production mode:
npm start

# Development mode (with auto-reload):
npm run dev
```

The server will output:
```text
=======================================================
🚀 SpendWise Server running on http://localhost:5000
📑 Swagger Documentation available at http://localhost:5000/api-docs
⚡ WebSocket Server listening for real-time alerts
=======================================================
```

---

## 📑 API Endpoints Summary

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user | No |
| `POST` | `/api/auth/login` | Authenticate user & get JWT | No |

### Transactions (`/api/transactions`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/transactions` | Log new expense/income | Yes |
| `GET` | `/api/transactions` | Get all transactions (supports page, limit, date filters) | Yes |
| `GET` | `/api/transactions/:id` | Get single transaction | Yes |
| `PUT` | `/api/transactions/:id` | Update existing transaction | Yes |
| `DELETE`| `/api/transactions/:id` | Delete transaction | Yes |

### Budgets (`/api/budgets`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/budgets` | Create category monthly budget | Yes |
| `GET` | `/api/budgets` | Get active budgets for user | Yes |
| `GET` | `/api/budgets/:id` | Get single budget | Yes |
| `PUT` | `/api/budgets/:id` | Update budget limit | Yes |

### Categories (`/api/categories`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/categories` | Get default & custom categories | Yes |
| `POST` | `/api/categories` | Add custom category | Yes |

### Reports & Analytics (`/api/reports`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/reports/monthly` | Monthly expense vs income breakdown | Yes |
| `GET` | `/api/reports/category` | Category-wise total spending summary | Yes |
| `GET` | `/api/reports/yearly` | Month-by-month yearly summary | Yes |
| `GET` | `/api/reports/forecast` | Next month spending forecast | Yes |

### Notifications & Advanced Features
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/notifications/send` | Send Firebase FCM push notification | Yes |
| `POST` | `/api/receipts/scan` | Parse receipt image and extract line items | Yes |

---

## ⚡ Socket.io Real-Time Alert Testing

Client connection code example:
```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('Connected to SpendWise WebSocket Server:', socket.id);
});

// Listen for real-time budget threshold alerts
socket.on('global_budget_alert', (data) => {
  console.log('🚨 ALERT RECEIVED:', data.message);
});
```

---

## 📮 Postman Collection Setup

1. Open **Postman**.
2. Click **Import** and select `postman_collection.json`.
3. Set the environment variable `baseUrl` = `http://localhost:5000`.
4. Run `POST /api/auth/login` to obtain the JWT token, then set `token` in variables.

---

## 👩‍💻 Author
**Student Project Submission**  
B.Tech Computer Science Engineering  
SpendWise Backend API & Database Management System
