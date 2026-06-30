const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI;

const clearCollections = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[CLEANUP] Connected to MongoDB');

    const db = mongoose.connection.db;

    const collections = [
      'clientlogs',
      'activitylogs',
      'comments',
      'notifications',
      'ticketlogs',
      'tickets'
    ];

    for (const name of collections) {
      try {
        const result = await db.collection(name).deleteMany({});
        console.log(`[CLEANUP] Deleted ${result.deletedCount} documents from collection: "${name}"`);
      } catch (collErr) {
        console.warn(`[CLEANUP WARNING] Collection "${name}" might not exist or failed to clear:`, collErr.message);
      }
    }

    console.log('[CLEANUP] Database data purge completed successfully.');
  } catch (err) {
    console.error('[CLEANUP ERROR] Failed to connect or purge data:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('[CLEANUP] Disconnected from MongoDB.');
  }
};

clearCollections();
