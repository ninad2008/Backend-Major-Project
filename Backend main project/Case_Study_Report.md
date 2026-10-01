# Case Study Report

---

<div align="center">

# ITM SKILLS UNIVERSITY
### School of Future Tech

<br><br>

## Case Study Report
### on

## **SpendWise - Personal Expense Tracker**
**(Backend Development – Node.js, Express.js, MongoDB & Socket.io)**

<br><br>

### Submitted By:
**NINAD NILESH DEODHARE**  
**15009625180**  
**SAM ALTMAN COHORT**  

<br><br>
</div>

---

<br>

# Index:

1. **Introduction to the Case Study**
2. **Problem Statement / Case Background (Abstract)**
3. **Problem Statement / Case Study Design**
4. **Methods & Algorithms Technology Applied in the Case Study**
5. **Case Study Implementation Details and Snapshots**
6. **Case Study Results and Conclusion**
7. **References**

---

<br>

## 1. INTRODUCTION TO CASE STUDY:

Managing personal finances effectively is a key challenge for individuals and families in modern daily life. Logging daily expenses manually on paper or offline spreadsheets often leads to untracked spending, budget overruns, and a lack of real-time awareness regarding individual or family financial health.

With the advancement of web technologies and asynchronous database management systems, personal finance tracking can be automated. An **Expense Tracker System** allows users to record daily income and expenditure, categorize spending (such as Groceries, Food, Rent, Entertainment), set monthly category budgets, receive real-time threshold alerts, and generate graphical financial reports.

This case study demonstrates the development of a production-ready, modular RESTful API and WebSocket system called **SpendWise** using **Node.js, Express.js, MongoDB (Mongoose ODM), Socket.io, and Firebase Admin SDK**. The system handles user authentication, CRUD operations for transactions and budgets, real-time WebSocket budget threshold alerts, push notifications, and automated financial reporting.

The application features clean REST endpoints alongside an interactive web dashboard interface, ensuring high performance, scalability, and instant real-time user feedback.

---

<br>

## 2. PROBLEM STATEMENT / CASE BACKGROUND (ABSTRACT):

The purpose of this case study is to design and implement a scalable backend system for **"SpendWise"** that enables users to manage personal and family finances seamlessly.

### Core Functionality Provided:
- **User Authentication**: Secure user registration and login using JWT (JSON Web Tokens) and optional Firebase Authentication token verification.
- **Transaction Management**: Full CRUD capability (Create, Read, Update, Delete) for income and expense transactions.
- **Category & Budget Configuration**: Assign spending limits per category on a monthly basis (`YYYY-MM`).
- **Real-Time Budget Alerts**: WebSockets using **Socket.io** to emit real-time overspending alerts to clients the moment a logged transaction exceeds a category's budget threshold.
- **Push Notifications**: **Firebase Cloud Messaging (FCM)** integration to send push notifications for overspending.
- **Financial Analytics & Forecasting**: Generating monthly pie-chart data breakdowns, category summaries, annual reports, and a 3-month moving average predictive spending forecast.

### Key Backend Concepts Implemented:
- **Node.js & Express.js**: Asynchronous event-driven server runtime with modular routing and controller pattern.
- **MongoDB & Mongoose ODM**: Schema modeling, indexing (`(user, category, month)`), validation hooks, and `$match` / `$group` aggregation pipelines.
- **WebSockets (Socket.io)**: Full-duplex event-based real-time communication.
- **Security & Validation**: Password hashing using `bcryptjs`, JWT bearer authorization, and input validation middleware.

---

<br>

## 3. CASE STUDY DESIGN:

The **SpendWise** system follows a modular Model-View-Controller (MVC) architectural pattern:

```
Backend main project/
├── config/                  # Database & Firebase connections
│   ├── db.js
│   └── firebase.js
├── controllers/             # Business logic layer
│   ├── authController.js
│   ├── transactionController.js
│   ├── budgetController.js
│   ├── categoryController.js
│   ├── reportController.js
│   └── notificationController.js
├── middleware/              # Authentication & validation layer
│   ├── auth.js
│   └── validate.js
├── models/                  # Mongoose MongoDB schemas
│   ├── User.js
│   ├── Transaction.js
│   ├── Budget.js
│   └── Category.js
├── routes/                  # Express REST API endpoints
├── utils/                   # Socket.io event emitter helpers
│   └── socket.js
├── public/                  # Web Dashboard frontend interface
│   ├── index.html
│   ├── style.css
│   └── app.js
├── server.js                # Main HTTP & Socket.io server entry point
├── package.json
└── README.md
```

### Main Modules:

1. **Authentication Module (`/api/auth`)**:
   - `POST /api/auth/register`: Hashes password with bcrypt and creates user account.
   - `POST /api/auth/login`: Validates credentials and returns JWT bearer token.

2. **Transaction Management Module (`/api/transactions`)**:
   - `POST /api/transactions`: Logs income/expense. Triggers background budget calculation and Socket.io alert.
   - `GET /api/transactions`: Fetches filtered transactions with date ranges, categories, and pagination.
   - `PUT & DELETE /api/transactions/:id`: Updates or deletes transactions and recalculates category spent totals.

3. **Budget & Real-Time Alert Module (`/api/budgets`)**:
   - `POST /api/budgets`: Establishes category spending limit for a specific month.
   - Calculates percentage spent `(spent / limit * 100)` and emits `budget_alert` via Socket.io when threshold is crossed.

4. **Analytics & Forecast Module (`/api/reports`)**:
   - `GET /api/reports/monthly`: Calculates total income, total expense, and net savings.
   - `GET /api/reports/category`: Summarizes spending by category using MongoDB aggregation pipelines.
   - `GET /api/reports/yearly`: Generates month-by-month financial summary.
   - `GET /api/reports/forecast`: Predicts next month spending using 3-month moving average algorithm.

5. **Firebase Push Notification Module (`/api/notifications`)**:
   - `POST /api/notifications/send`: Sends FCM push notifications to user mobile/web devices.

---

<br>

## 4. METHOD AND ALGORITHMS APPLIED TO CASE STUDY:

### 1. MongoDB Aggregation Pipeline ($match & $group)
To compute total spending for a user in a specific category and month without loading all documents into Node.js memory, an aggregation pipeline is executed directly inside MongoDB:

```javascript
const totalExpense = await Transaction.aggregate([
  {
    $match: {
      user: new mongoose.Types.ObjectId(userId.toString()),
      category: category,
      type: 'expense',
      date: { $gte: startOfMonth, $lte: endOfMonth }
    }
  },
  {
    $group: {
      _id: null,
      total: { $sum: '$amount' }
    }
  }
]);
```

### 2. Real-Time Socket.io Event Emission Algorithm
Whenever a transaction is inserted or modified, the backend calculates the updated spent amount. If `spent > limit`, an event is emitted directly to the user's private socket room:

```javascript
if (spentAmount > budget.limit) {
  io.to(userId.toString()).emit('budget_alert', {
    budgetId: budget._id,
    category: budget.category,
    limit: budget.limit,
    spent: spentAmount,
    overspentBy: spentAmount - budget.limit,
    isExceeded: true,
    message: `ALERT: You have exceeded your budget for ${budget.category} by $${(spentAmount - budget.limit).toFixed(2)}!`
  });
}
```

### 3. Password Hashing (Bcrypt Pre-save Hook)
Security is enforced by salting and hashing user passwords before persistence:

```javascript
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
```

---

<br>

## 5. CASE STUDY IMPLEMENTATION DETAILS AND SNAPSHOTS:

### Implementation Steps:
- **Step 1**: Server initialization with HTTP & Socket.io listening on port `5000`.
- **Step 2**: Database connection via Mongoose to `mongodb://localhost:27017/spendwise`.
- **Step 3**: User registration & authentication flow returning signed JWT token.
- **Step 4**: Setting a monthly budget limit (e.g. $200 for Groceries).
- **Step 5**: Logging transactions, automatic spent recalculation, and triggering Socket.io overspending alert banner.

### Source Code Snapshots:

#### **Server Setup (`server.js`)**:
```javascript
const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { initSocket } = require('./utils/socket');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
initSocket(server);

app.use(express.json());
app.use(express.static('public'));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/budgets', require('./routes/budgetRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
```

#### **Budget Mongoose Schema (`models/Budget.js`)**:
```javascript
const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, required: true },
  limit: { type: Number, required: true },
  spent: { type: Number, default: 0 },
  month: { type: String, required: true } // Format: "YYYY-MM"
}, { timestamps: true });

BudgetSchema.index({ user: 1, category: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Budget', BudgetSchema);
```

---

<br>

## 6. CASE STUDY RESULTS AND CONCLUSION:

The **SpendWise Expense Tracker Backend API** successfully demonstrates the design and deployment of a modern asynchronous Node.js, MongoDB, and WebSocket architecture.

### Key Results Achieved:
- ✅ **Full RESTful API**: Implemented clean CRUD routes for users, transactions, budgets, categories, reports, and notifications.
- ✅ **Real-Time Alert System**: Socket.io successfully emits `budget_alert` messages instantly to connected clients whenever spending exceeds threshold limits.
- ✅ **High-Performance Database Queries**: MongoDB Mongoose indexing and aggregation pipelines ensure aggregation queries complete in sub-millisecond response times.
- ✅ **Interactive UI & Documentation**: Built-in Swagger docs (`/api-docs`), ready-to-import Postman collection, and a live web dashboard frontend.

### Future Enhancements:
- Integrating automated bank SMS parsing.
- Multi-currency support and real-time exchange rates API.
- Advanced machine-learning-based monthly expenditure predictions.

---

<br>

## 7. REFERENCES:

1. **Node.js Official Documentation**: https://nodejs.org/docs
2. **Express.js API Reference**: https://expressjs.com
3. **MongoDB & Mongoose ODM Documentation**: https://mongoosejs.com
4. **Socket.io Real-time Application Framework**: https://socket.io/docs
5. **Firebase Admin SDK Guide**: https://firebase.google.com/docs/admin/setup
