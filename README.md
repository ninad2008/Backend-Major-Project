# Semester 3 DBMS Major Project - SpendWise Expense Tracker 💰

**Course**: B.Tech Computer Science Engineering  
**Subject**: Database Management Systems (DBMS) & Backend Development  
**Project Folder**: [`DBMS main project`](file:///Users/ninadnileshdeodhare/Desktop/Semester%203%20Sprint%201/DBMS/DBMS%20main%20project)

---

## 📌 Quick Summary
This repository contains the complete DBMS Major Project **"SpendWise"**, a personal finance tracking system built with Node.js, Express.js, MongoDB (Mongoose ODM), Socket.io WebSockets, Firebase Admin SDK, and a clean Web Dashboard interface.

### 🚀 How to Run the Project
```bash
# Navigate to the DBMS main project folder
cd "DBMS main project"

# Install dependencies
npm install

# Start the application server
npm start
```

### 🔗 Live Endpoints & Port Setup
- **Web Dashboard**: [http://localhost:5000](http://localhost:5000)
- **Interactive Swagger Docs**: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
- **MongoDB Connection**: `mongodb://localhost:27017/spendwise`

---

## 📁 Folder Structure
- `DBMS main project/`
  - `config/` - MongoDB & Firebase connection initialization
  - `controllers/` - Auth, Transaction, Budget, Category, Report, Notification controllers
  - `models/` - Mongoose schemas for User, Transaction, Budget, Category
  - `routes/` - Express REST API route handlers
  - `public/` - Single-page Web Dashboard (HTML, CSS, JS, Socket.io client)
  - `utils/` - Real-time Socket.io alert helper
  - `server.js` - HTTP server entry point
  - `postman_collection.json` - Ready-to-import Postman collection
  - `README.md` - Complete technical documentation
