/**
 * Seed admin and staff users for local testing.
 * Usage: node scripts/seedUsers.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');

const SEED_USERS = [
  {
    name: 'Stadium Admin',
    email: 'admin@stadium.com',
    password: 'admin123',
    role: 'admin',
  },
  {
    name: 'Gate Staff',
    email: 'staff@stadium.com',
    password: 'staff123',
    role: 'staff',
  },
  {
    name: 'Shift Supervisor',
    email: 'supervisor@stadium.com',
    password: 'super123',
    role: 'supervisor',
  },
];

async function seedUsers() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI is missing in backend/.env');
  }

  await mongoose.connect(mongoUri);

  for (const seedUser of SEED_USERS) {
    const existing = await User.findOne({ email: seedUser.email });

    if (existing) {
      existing.name = seedUser.name;
      existing.role = seedUser.role;
      existing.password = seedUser.password;
      await existing.save();
      console.log(`Updated ${seedUser.role}: ${seedUser.email}`);
      continue;
    }

    await User.create(seedUser);
    console.log(`Created ${seedUser.role}: ${seedUser.email}`);
  }

  console.log('\nSeed complete. Test credentials:');
  console.log('Admin -> admin@stadium.com / admin123');
  console.log('Staff -> staff@stadium.com / staff123');
  console.log('Supervisor -> supervisor@stadium.com / super123');

  await mongoose.disconnect();
}

seedUsers().catch(async (error) => {
  console.error('Seed failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
