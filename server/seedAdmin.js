// ============================================================
//  server/seedAdmin.js  —  Seed Super Admin Account
// ============================================================
//  RUN:   node seedAdmin.js   (from server/ directory)
//    or:  npm run seed         (from root e:\Tealvue-task\)
//
//  CREATES:
//    Email:    admine@gmail.com
//    Password: Admin@1234
//    Role:     super-admin
//    Status:   approved + active
//
//  SAFE:  Will not create a duplicate if email already exists.
//         Run as many times as you want.
// ============================================================

const dotenv   = require('dotenv');
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const path     = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI;

const userSchema = new mongoose.Schema({
  name:       String,
  email:      { type: String, unique: true, lowercase: true },
  password:   String,
  role:       { type: String, enum: ['user', 'admin', 'super-admin'], default: 'user' },
  isApproved: { type: Boolean, default: true },
  isActive:   { type: Boolean, default: true },
  avatar:     String,
  department: String,
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');

    const email = 'admine@gmail.com';
    const existing = await User.findOne({ email });

    if (existing) {
      // Upgrade existing account to super-admin if not already
      if (existing.role !== 'super-admin') {
        existing.role = 'super-admin';
        existing.isApproved = true;
        existing.isActive = true;
        await existing.save();
        console.log('Existing account upgraded to super-admin:', email);
      } else {
        console.log('Super Admin already exists:', email);
      }
    } else {
      const salt     = await bcrypt.genSalt(10);
      const hashedPw = await bcrypt.hash('Admin@1234', salt);

      await User.create({
        name:       'Super Admin',
        email,
        password:   hashedPw,
        role:       'super-admin',
        isApproved: true,
        isActive:   true,
      });
      console.log('Super Admin created:', email);
    }

    console.log('');
    console.log('Login credentials:');
    console.log('  Email:    admine@gmail.com');
    console.log('  Password: Admin@1234');
    console.log('  Role:     super-admin');

  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Done.');
  }
};

seed();
