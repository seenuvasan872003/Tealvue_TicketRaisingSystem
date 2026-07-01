// ============================================================
//  server/config/db.js  —  MongoDB Connection
// ============================================================
//  COMMAND TO START SERVER:
//    cd e:\Tealvue-task\server
//    npm run dev          ← development (nodemon, auto-restart)
//    npm start            ← production  (node)
//
//  REQUIRES in .env:
//    MONGO_URI=mongodb://localhost:27017/tealVue_tickets
// ============================================================

const mongoose = require('mongoose');

// [IMPORTANT] connectDB must be called ONCE in server.js before app.listen
const connectDB = async () => {
  try {
    // [CONFIG] Uses MONGO_URI from .env — never hardcode here
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(` MongoDB connected → ${conn.connection.host} / ${conn.connection.name}`);
  } catch (err) {
    // [IMPORTANT] Exit process on DB failure — server cannot run without DB
    console.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
