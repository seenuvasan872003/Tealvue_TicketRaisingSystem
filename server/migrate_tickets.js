const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const runMigration = async () => {
  await connectDB();
  
  try {
    const Ticket = require('./models/Ticket');
    const tickets = await Ticket.find();
    console.log(`Loaded ${tickets.length} tickets from the database. Checking for enums compliance...`);
    
    let updatedCount = 0;
    
    for (const t of tickets) {
      let updated = false;
      let cat = t.category;
      
      // Map category
      if (cat === 'technical') { cat = 'Technical'; updated = true; }
      else if (cat === 'billing') { cat = 'Billing'; updated = true; }
      else if (cat === 'general') { cat = 'General'; updated = true; }
      else if (cat === 'hr') { cat = 'HR'; updated = true; }
      else if (cat === 'other') { cat = 'Other'; updated = true; }
      else if (cat === 'feature-request' || cat === 'bug') { cat = 'Technical'; updated = true; }
      else if (!['General', 'Technical', 'Billing', 'HR', 'Other'].includes(cat)) { cat = 'General'; updated = true; }
      
      // Map priority
      let prio = t.priority;
      if (prio === 'urgent') { prio = 'high'; updated = true; }
      else if (!['low', 'medium', 'high'].includes(prio)) { prio = 'medium'; updated = true; }

      // Map approvalStatus
      let approval = t.approvalStatus;
      if (approval === 'pending_approval') { approval = 'approved'; updated = true; }
      else if (!['approved', 'suspended', 'rejected'].includes(approval)) { approval = 'approved'; updated = true; }
      
      if (updated) {
        t.category = cat;
        t.priority = prio;
        t.approvalStatus = approval;
        
        // Skip validation check to ensure it writes successfully
        await t.save({ validateBeforeSave: false });
        console.log(`[UPDATED] Ticket #${t._id} updated: category=${cat}, priority=${prio}, approvalStatus=${approval}`);
        updatedCount++;
      }
    }
    
    console.log(`Migration complete. Updated ${updatedCount} tickets.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

runMigration();
