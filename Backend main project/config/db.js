const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/spendwise';
    console.log(`[MongoDB] Attempting connection to: ${mongoURI.split('@').pop()}`);

    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`[MongoDB Warning] Connection failed: ${error.message}`);
    console.log('[MongoDB Fallback] Application will operate in fallback mode for cloud deployment preview.');
  }
};

module.exports = connectDB;
