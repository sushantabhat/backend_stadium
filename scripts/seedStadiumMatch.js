/**
 * Seed a realistic stadium match with section layout.
 * Usage: node scripts/seedStadiumMatch.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Match = require('../src/models/Match');
const Seat = require('../src/models/Seat');
const { STADIUM_SECTIONS } = require('./stadiumLayout');

async function seed() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI missing in backend/.env');

  console.log('Connecting to database...');
  await mongoose.connect(mongoUri);
  console.log('Connected.\n');

  // Find or create admin
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    admin = await User.create({
      name: 'Stadium Admin',
      email: 'admin@stadium.com',
      password: 'admin123',
      role: 'admin',
    });
    console.log('Created admin user.');
  }

  // Calculate total seats
  const totalSeats = STADIUM_SECTIONS.reduce((sum, s) => sum + s.totalSeats, 0);

  // Build pricing from sections
  const pricing = {};
  for (const section of STADIUM_SECTIONS) {
    if (!pricing[section.category]) {
      pricing[section.category] = section.totalSeats > 50 ? 0 : 0;
    }
  }
  // Set default prices per category
  pricing.vip = 5000;
  pricing.category1 = 3000;
  pricing.category2 = 1500;
  pricing.category3 = 1200;
  pricing.category4 = 800;
  pricing.supporters = 500;

  // Build stadium sections with pricing
  const sections = STADIUM_SECTIONS.map((s) => ({
    ...s,
    pricePerTicket: pricing[s.category] || 1000,
    availableSeats: s.totalSeats,
  }));

  // Create match
  const match = await Match.create({
    title: 'South Africa vs Czech Republic - FIFA World Cup Qualifier',
    teamA: 'South Africa',
    teamB: 'Czech Republic',
    venue: 'FNB Stadium, Johannesburg',
    matchDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    description: 'FIFA World Cup 2026 Qualifier - Group D showdown between South Africa and the Czech Republic at the iconic FNB Stadium.',
    status: 'upcoming',
    createdBy: admin._id,
    pricing,
    stadiumSections: sections,
    totalSeats,
    imageUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800',
  });

  console.log(`Created match: "${match.title}"`);
  console.log(`Venue: ${match.venue}`);
  console.log(`Total sections: ${sections.length}`);
  console.log(`Total seats: ${totalSeats}`);

  // Generate individual seat documents
  const seatDocs = [];
  for (const section of sections) {
    const seatsPerRow = Math.ceil(section.totalSeats / section.rows.length);
    for (const rowLabel of section.rows) {
      for (let seatNum = 1; seatNum <= seatsPerRow; seatNum++) {
        seatDocs.push({
          match: match._id,
          sectionId: section.sectionId,
          seatLabel: `${section.sectionId}-${rowLabel}-${seatNum}`,
          row: rowLabel,
          number: seatNum,
          category: section.category,
          price: section.pricePerTicket,
          status: 'available',
        });
      }
    }
  }

  await Seat.insertMany(seatDocs);
  console.log(`Generated ${seatDocs.length} seat documents.\n`);

  // Print summary
  const catCounts = {};
  for (const s of seatDocs) {
    catCounts[s.category] = (catCounts[s.category] || 0) + 1;
  }
  console.log('Category breakdown:');
  for (const [cat, count] of Object.entries(catCounts).sort()) {
    console.log(`  ${cat}: ${count} seats`);
  }

  console.log(`\nMatch ID: ${match._id}`);
  console.log('\nDone! Seed complete.');
}

seed()
  .then(() => {
    mongoose.disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    mongoose.disconnect();
    process.exit(1);
  });
