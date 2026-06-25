const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const run = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Collections in database:');
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`- ${col.name} (${count} documents)`);
    }
    
    const tickets = await db.collection('tickets').find({}).toArray();
    
    console.log('Printing all tickets:');
    tickets.forEach(t => {
      console.log(`ID: ${t._id}, Title: "${t.title}", Category: "${t.category}", Priority: "${t.priority}", Approval: "${t.approvalStatus}"`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
