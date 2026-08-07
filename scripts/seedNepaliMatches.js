const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Team = require('../src/models/Team');
const Match = require('../src/models/Match');
const Seat = require('../src/models/Seat');
const { STADIUM_SECTIONS } = require('./stadiumLayout');

const PRICING = {
  platinum: 1000,
  gold: 500,
  silver: 400,
  bronze: 300,
  general: 200,
  supporters: 100,
};

const MATCHES = [
  {
    title: 'Kathmandu Gurkhas vs Chitwan Rhinos - NPL 2026',
    teamA: 'Kathmandu Gurkhas',
    teamB: 'Chitwan Rhinos',
    venue: 'TU Cricket Ground',
    match_stage: 'League Stage',
    description: 'The Bagmati Derby! Nepal\'s two biggest franchises collide in the league opener. Expect a packed house as Gurkhas host the Rhinos.',
    imageUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800',
  },
  {
    title: 'Janakpur Bolts vs Biratnagar Kings - NPL 2026',
    teamA: 'Janakpur Bolts',
    teamB: 'Biratnagar Kings',
    venue: 'Janakpur Ram Janaki Stadium',
    match_stage: 'League Stage',
    description: 'The Terai Derby! Janakpur\'s defending champions take on the Kings in a high-stakes league clash under the floodlights.',
    imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
  },
  {
    title: 'Kathmandu Gurkhas vs Janakpur Bolts - NPL Semi-Final',
    teamA: 'Kathmandu Gurkhas',
    teamB: 'Janakpur Bolts',
    venue: 'TU Cricket Ground',
    match_stage: 'Semi-Finals',
    description: 'The semi-final blockbuster! Kathmandu\'s home crowd rallies behind the Gurkhas as they face the defending champions. Winner goes to the Final.',
    imageUrl: 'https://images.unsplash.com/photo-1569517282132-25d22e2e36cb?w=800',
  },
  {
    title: 'NPL 2026 Grand Final',
    teamA: 'Kathmandu Gurkhas',
    teamB: 'Biratnagar Kings',
    venue: 'TU Cricket Ground',
    match_stage: 'Finals',
    description: 'The ultimate showdown! Kathmandu Gurkhas vs Biratnagar Kings for the NPL 2026 Championship. Every seat will be sold. Be there or miss history.',
    imageUrl: 'https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=800',
  },
];

async function seed() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI missing in backend/.env');

  console.log('Connecting to database...');
  await mongoose.connect(mongoUri);
  console.log('Connected.\n');

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
  console.log(`Using admin: ${admin.name} (${admin.email})\n`);

  const NPL_TEAMS = [
    { name: 'Kathmandu Gurkhas', shortName: 'KKG', franchiseTier: 1, homeCity: 'Kathmandu' },
    { name: 'Chitwan Rhinos', shortName: 'CHR', franchiseTier: 2, homeCity: 'Chitwan' },
    { name: 'Janakpur Bolts', shortName: 'JKB', franchiseTier: 1, homeCity: 'Janakpur' },
    { name: 'Biratnagar Kings', shortName: 'BKK', franchiseTier: 2, homeCity: 'Biratnagar' },
    { name: 'Lumbini Lions', shortName: 'LML', franchiseTier: 3, homeCity: 'Lumbini' },
    { name: 'Pokhara Avengers', shortName: 'PKA', franchiseTier: 3, homeCity: 'Pokhara' },
    { name: 'Sudurpaschim Royals', shortName: 'SPR', franchiseTier: 3, homeCity: 'Dhangadhi' },
    { name: 'Karnali Yaks', shortName: 'KNY', franchiseTier: 3, homeCity: 'Karnali' },
  ];

  await Team.deleteMany({});
  const createdTeams = await Team.insertMany(NPL_TEAMS);
  console.log(`Seeded ${createdTeams.length} teams:\n`);
  for (const t of createdTeams) {
    console.log(`  ${t.name} — Tier ${t.franchiseTier} (${t.homeCity})`);
  }
  console.log('');

  const existingMatches = await Match.find();
  for (const m of existingMatches) {
    await Seat.deleteMany({ match: m._id });
    console.log(`Deleted seats for: "${m.title}"`);
  }
  const delCount = await Match.deleteMany({});
  console.log(`Deleted ${delCount.deletedCount} existing match(es)\n`);

  const totalSeatsPerMatch = STADIUM_SECTIONS.reduce((sum, s) => sum + s.totalSeats, 0);

  for (let i = 0; i < MATCHES.length; i++) {
    const matchData = MATCHES[i];
    const sections = STADIUM_SECTIONS.map((s) => ({
      ...s,
      pricePerTicket: PRICING[s.category] || 1000,
      availableSeats: s.totalSeats,
    }));

    const pricing = { ...PRICING };

    const daysFromNow = [14, 21, 45, 60][i];
    const match = await Match.create({
      ...matchData,
      matchDate: new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000),
      createdBy: admin._id,
      pricing,
      stadiumSections: sections,
      totalSeats: totalSeatsPerMatch,
    });

    console.log(`Created match: "${match.title}"`);
    console.log(`  Stage: ${match.match_stage}`);
    console.log(`  Venue: ${match.venue}`);
    console.log(`  Date: ${match.matchDate.toDateString()}`);
    console.log(`  Sections: ${sections.length}`);
    console.log(`  Total seats: ${totalSeatsPerMatch}`);

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

  console.log('Done! 4 NPL matches seeded (2 League, 1 Semi-Final, 1 Final).');
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
