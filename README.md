# Semester 3 Major Project - SpendWise Expense Tracker 💰

**Course**: B.Tech Computer Science Engineering  
**Subject**: Backend Development & Database Management Systems (DBMS)  
**Project Folder**: [`Backend main project`](file:///Users/ninadnileshdeodhare/Desktop/Semester%203%20Sprint%201/DBMS/Backend%20main%20project)

---

## 📌 Quick Summary
This repository contains the complete Major Project **"SpendWise"**, a personal finance tracking system built with Node.js, Express.js, MongoDB (Mongoose ODM), Socket.io WebSockets, Firebase Admin SDK, and a clean Web Dashboard interface.

### 🚀 How to Run the Project
```bash
# Navigate to the Backend main project folder
cd "Backend main project"

# Install dependencies
npm install

# Start the application server
npm start
```

### 🔗 Live Endpoints & Port Setup
- **Web Dashboard**: [http://localhost:5000](http://localhost:5000)
- **Interactive Swagger Docs**: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
- **MongoDB Connection**: `mongodb://localhost:27017/spendwise`
- **Deployment Link: https://backend-major-project-n8pq.onrender.com

---

## 📁 Folder Structure
- `Backend main project/`
  - `config/` - MongoDB & Firebase connection initialization
  - `controllers/` - Auth, Transaction, Budget, Category, Report, Notification controllers
  - `models/` - Mongoose schemas for User, Transaction, Budget, Category
  - `routes/` - Express REST API route handlers
  - `public/` - Single-page Web Dashboard (HTML, CSS, JS, Socket.io client)
  - `utils/` - Real-time Socket.io alert helper
  - `server.js` - HTTP server entry point
  - `postman_collection.json` - Ready-to-import Postman collection
  - `README.md` - Complete technical documentation
