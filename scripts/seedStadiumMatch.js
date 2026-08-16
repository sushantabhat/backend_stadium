const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Match = require('../src/models/Match');
const Seat = require('../src/models/Seat');
const { STADIUM_SECTIONS } = require('./stadiumLayout');

const MATCHES = [
  {
    title: 'CSK vs MI - IPL 2026',
    teamA: 'Chennai Super Kings',
    teamB: 'Mumbai Indians',
    venue: 'M. A. Chidambaram Stadium, Chennai',
    description: 'The ultimate IPL rivalry! MS Dhoni vs Rohit Sharma in what promises to be a blockbuster encounter at Chepauk.',
    status: 'upcoming',
    imageUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800',
    teamALogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/2/2b/Chennai_Super_Kings_Logo.svg/200px-Chennai_Super_Kings_Logo.svg.png',
    teamBLogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/cd/Mumbai_Indians_Logo.svg/200px-Mumbai_Indians_Logo.svg.png',
  },
  {
    title: 'RCB vs KKR - IPL 2026',
    teamA: 'Royal Challengers Bengaluru',
    teamB: 'Kolkata Knight Riders',
    venue: 'M. Chinnaswamy Stadium, Bengaluru',
    description: 'RCB takes on KKR at the Chinnaswamy! Expect big sixes and electrifying atmosphere under the lights.',
    status: 'upcoming',
    imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
    teamALogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d4/Royal_Challengers_Bengaluru_Logo.svg/200px-Royal_Challengers_Bengaluru_Logo.svg.png',
    teamBLogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4c/Kolkata_Knight_Riders_Logo.svg/200px-Kolkata_Knight_Riders_Logo.svg.png',
  },
];

const PRICING = {
  platinum: 5000,
  gold: 3000,
  silver: 1500,
  bronze: 1200,
  general: 800,
  supporters: 500,
};

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

  // Remove existing matches and their seats
  const existingMatches = await Match.find();
  for (const m of existingMatches) {
    await Seat.deleteMany({ match: m._id });
    console.log(`Deleted seats for: "${m.title}"`);
  }
  const delCount = await Match.deleteMany({});
  console.log(`Deleted ${delCount.deletedCount} existing match(es)\n`);

  for (const matchData of MATCHES) {
    const totalSeats = STADIUM_SECTIONS.reduce((sum, s) => sum + s.totalSeats, 0);

    const sections = STADIUM_SECTIONS.map((s) => ({
      ...s,
      pricePerTicket: PRICING[s.category] || 1000,
      availableSeats: s.totalSeats,
    }));

    const pricing = { ...PRICING };

    const match = await Match.create({
      ...matchData,
      matchDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      createdBy: admin._id,
      pricing,
      stadiumSections: sections,
      totalSeats,
    });

    console.log(`Created match: "${match.title}"`);
    console.log(`  Venue: ${match.venue}`);
    console.log(`  Sections: ${sections.length}`);
    console.log(`  Total seats: ${totalSeats}`);

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

    const catCounts = {};
    for (const s of seatDocs) {
      catCounts[s.category] = (catCounts[s.category] || 0) + 1;
    }
    console.log('  Category breakdown:');
    for (const [cat, count] of Object.entries(catCounts).sort()) {
      console.log(`    ${cat}: ${count} seats`);
    }
    console.log(`  Match ID: ${match._id}\n`);
  }

  console.log('Done! Seed complete.');
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
