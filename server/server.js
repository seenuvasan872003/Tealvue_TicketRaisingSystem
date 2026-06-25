// ============================================================
//  server/server.js  —  Express Application Entry Point
// ============================================================
//  COMMANDS:
//    npm run dev     → nodemon server.js  (auto-restart on save)
//    npm start       → node server.js     (production)
//    npm run seed    → node seedAdmin.js  (create super-admin account)
//
//  PORTS:
//    Backend  → http://localhost:5000
//    Frontend → http://localhost:5173  (Vite)
//
//  ENV FILE:  server/.env  (never commit to git)
//
//  STATIC FILES:
//    /uploads → server/uploads/ directory (ticket attachments + avatars)
// ============================================================

const express = require('express');
const cors    = require('cors');
const dotenv  = require('dotenv');
const path    = require('path');
const mongoose = require('mongoose');
const http    = require('http');
const { Server } = require('socket.io');

// [IMPORTANT] Load .env BEFORE importing anything that reads env vars
dotenv.config();

// [IMPORTANT] DB connection — extracted to config/db.js
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Attach socket.io instance to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('[SOCKET] Client connected:', socket.id);

  socket.on('joinTicket', (ticketId) => {
    socket.join(ticketId);
    console.log(`[SOCKET] Client ${socket.id} joined ticket room: ${ticketId}`);
  });

  socket.on('leaveTicket', (ticketId) => {
    socket.leave(ticketId);
    console.log(`[SOCKET] Client ${socket.id} left ticket room: ${ticketId}`);
  });

  socket.on('disconnect', () => {
    console.log('[SOCKET] Client disconnected:', socket.id);
  });
});

// ─── Middleware ───────────────────────────────────────────
// [CONFIG] Allow requests from Vite dev server (port 5173)
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

// [IMPORTANT] Parse incoming JSON bodies — required for POST/PUT routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static Files (uploaded attachments + avatars) ───────
// Accessible at: http://localhost:5000/uploads/<filename>
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── API Routes ───────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/tickets',       require('./routes/tickets'));
app.use('/api/comments',      require('./routes/comments'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/teams',         require('./routes/teams'));
app.use('/api/logs',          require('./routes/logs'));

// ─── Health Check ─────────────────────────────────────────
app.get('/', (req, res) =>
  res.json({ message: 'Tealvue API is running', version: '2.0.0', status: 'OK' })
);

// ─── Global Error Handler ─────────────────────────────────
// [IMPORTANT] Must have 4 params (err, req, res, next) to work as error middleware
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);

  // Multer-specific errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: `File too large — max ${process.env.MAX_FILE_SIZE_MB || 5}MB` });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ message: `Too many files — max ${process.env.MAX_FILES_PER_TICKET || 5}` });
  }

  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// ─── Start ────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const { seedTeams } = require('./seeders/teamSeed');
const { startTeamAdminTimeoutJob } = require('./jobs/teamAdminTimeout');

connectDB().then(async () => {
  // Seed default teams
  await seedTeams();

  // Migrate existing tickets categories, priorities, and approval status
  try {
    const db = mongoose.connection.db;
    const ticketsCollection = db.collection('tickets');
    
    // Force lowercase categories to exact capitalization enums
    await ticketsCollection.updateMany({ category: 'technical' }, { $set: { category: 'Technical' } });
    await ticketsCollection.updateMany({ category: 'billing' }, { $set: { category: 'Billing' } });
    await ticketsCollection.updateMany({ category: 'general' }, { $set: { category: 'General' } });
    await ticketsCollection.updateMany({ category: 'hr' }, { $set: { category: 'HR' } });
    await ticketsCollection.updateMany({ category: 'other' }, { $set: { category: 'Other' } });
    await ticketsCollection.updateMany({ category: 'feature-request' }, { $set: { category: 'Technical' } });
    await ticketsCollection.updateMany({ category: 'bug' }, { $set: { category: 'Technical' } });
    
    // Force old priorities to aligned low/medium/high
    await ticketsCollection.updateMany({ priority: 'urgent' }, { $set: { priority: 'high' } });
    await ticketsCollection.updateMany({ priority: { $nin: ['low', 'medium', 'high'] } }, { $set: { priority: 'medium' } });

    // Force approvalStatus compliance
    await ticketsCollection.updateMany({ approvalStatus: 'pending_approval' }, { $set: { approvalStatus: 'approved' } });
    await ticketsCollection.updateMany({ approvalStatus: { $exists: false } }, { $set: { approvalStatus: 'approved' } });
    await ticketsCollection.updateMany({ approvalStatus: null }, { $set: { approvalStatus: 'approved' } });

    console.log('[MIGRATION] Raw database enums mapping completed successfully.');
  } catch (migError) {
    console.error('[MIGRATION ERROR]', migError);
  }

  // Start Team Admin Timeout Job
  startTeamAdminTimeoutJob();

  server.listen(PORT, () =>
    console.log(`Server running with WebSockets → http://localhost:${PORT}`)
  );
});

