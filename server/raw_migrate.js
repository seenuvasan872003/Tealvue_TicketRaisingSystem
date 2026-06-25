const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const runRawMigration = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    const db = mongoose.connection.db;
    const ticketsCollection = db.collection('tickets');
    
    const allTickets = await ticketsCollection.find({}).toArray();
    console.log(`Raw Database Tickets Count: ${allTickets.length}`);
    
    let updatedCount = 0;
    
    for (const t of allTickets) {
      let updated = false;
      let updateDoc = {};
      
      let cat = t.category;
      if (cat === 'technical' || cat === 'feature-request' || cat === 'bug') {
        updateDoc.category = 'Technical';
        updated = true;
      } else if (cat === 'billing') {
        updateDoc.category = 'Billing';
        updated = true;
      } else if (cat === 'general') {
        updateDoc.category = 'General';
        updated = true;
      } else if (cat === 'hr') {
        updateDoc.category = 'HR';
        updated = true;
      } else if (cat === 'other') {
        updateDoc.category = 'Other';
        updated = true;
      }
      
      let prio = t.priority;
      if (prio === 'urgent') {
        updateDoc.priority = 'high';
        updated = true;
      }
      
      let approval = t.approvalStatus;
      if (approval === 'pending_approval' || !approval) {
        updateDoc.approvalStatus = 'approved';
        updated = true;
      }
      
      if (updated) {
        await ticketsCollection.updateOne({ _id: t._id }, { $set: updateDoc });
        console.log(`[RAW UPDATE] Ticket ID ${t._id} updated with:`, updateDoc);
        updatedCount++;
      }
    }
    
    console.log(`Raw migration complete. Updated ${updatedCount} tickets.`);
    process.exit(0);
  } catch (err) {
    console.error('Raw migration failed:', err);
    process.exit(1);
  }
};

runRawMigration();
