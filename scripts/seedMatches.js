const mongoose = require('mongoose');
const path = require('path');
const Match = require('../src/models/Match');
const Seat = require('../src/models/Seat');
const Venue = require('../src/models/Venue');
const User = require('../src/models/User');

const envResult = require('dotenv').config({
  path: path.join(__dirname, '../.env'),
  override: true,
});

const mongoUri = envResult.parsed?.MONGO_URI || process.env.MONGO_URI;

const TEAMS = [
  { a: 'Nepal', b: 'India' },
  { a: 'Nepal', b: 'Sri Lanka' },
  { a: 'Nepal', b: 'Bangladesh' },
  { a: 'India', b: 'Australia' },
  { a: 'India', b: 'England' },
  { a: 'Sri Lanka', b: 'Bangladesh' },
  { a: 'Australia', b: 'England' },
  { a: 'Pakistan', b: 'India' },
  { a: 'Nepal', b: 'Afghanistan' },
  { a: 'India', b: 'New Zealand' },
];

const VENUE_NAMES = [
  'Tribhuvan University International Cricket Ground',
  'Mulpani International Cricket Ground',
];

function inferGate(section) {
  if (section.gate) return section.gate;
  const label = ((section.label || '') + ' ' + (section.sectionId || '')).toLowerCase();
  if (label.includes('north')) return 'North Gate';
  if (label.includes('south')) return 'South Gate';
  if (label.includes('east')) return 'East Gate';
  if (label.includes('west')) return 'West Gate';
  if (label.includes('supporter')) return 'West Gate';
  return '';
}

function buildSeatDocuments(match) {
  const seats = [];
  if (!match.stadiumSections || match.stadiumSections.length === 0) return seats;

  for (const section of match.stadiumSections) {
    let rows = section.rows || [];
    if (!rows.length) {
      const numRows = Math.ceil(section.totalSeats / 8);
      rows = Array.from({ length: Math.max(numRows, 1) }, (_, i) => String.fromCharCode(65 + i));
    }
    const base = Math.floor(section.totalSeats / rows.length);
    const extra = section.totalSeats % rows.length;
    const gate = inferGate(section);

    for (let ri = 0; ri < rows.length; ri++) {
      const rowLabel = rows[ri];
      const price = section.pricePerTicket || 0;
      const seatsInRow = ri < extra ? base + 1 : base;
      for (let sn = 1; sn <= seatsInRow; sn++) {
        seats.push({
          match: match._id,
          sectionId: section.sectionId,
          gate,
          seatLabel: `${section.sectionId}-${rowLabel}-${sn}`,
          row: rowLabel,
          number: sn,
          category: section.category,
          price,
          status: 'available',
        });
      }
    }
  }
  return seats;
}

async function seed() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    await Match.deleteMany({});
    await Seat.deleteMany({});
    console.log('Cleared existing matches and seats');

    const venues = await Venue.find().lean();
    const venueMap = {};
    for (const v of venues) {
      venueMap[v.name] = v;
    }

    const admin = await User.findOne({ role: 'admin' }).lean();
    if (!admin) {
      console.error('No admin user found!');
      process.exit(1);
    }

    const now = new Date();
    const matches = [];

    for (let i = 0; i < 7; i++) {
      const team = TEAMS[i];
      const venueName = VENUE_NAMES[i % 2];
      const venue = venueMap[venueName];
      if (!venue) {
        console.error(`Venue not found: ${venueName}`);
        continue;
      }

      const matchDate = new Date(now);
      matchDate.setDate(matchDate.getDate() + i + 1);
      matchDate.setHours(14 + (i % 3), 0, 0, 0);

      const totalSeats = venue.stadiumSections.reduce((sum, s) => sum + (s.totalSeats || 0), 0);

      const match = await Match.create({
        title: `${team.a} vs ${team.b}`,
        teamA: team.a,
        teamB: team.b,
        venue: venue.name,
        matchDate,
        description: `${team.a} takes on ${team.b} at ${venue.name}`,
        status: 'upcoming',
        createdBy: admin._id,
        stadiumSections: venue.stadiumSections,
        venueGates: venue.gates || [],
        seatLayout: venue.seatLayout || null,
        totalSeats,
      });

      const seats = buildSeatDocuments(match);
      if (seats.length > 0) {
        await Seat.insertMany(seats);
      }

      matches.push(match);
      console.log(`Created: ${match.title} (${venue.name}, ${totalSeats} seats)`);
    }

    console.log(`\nDone — created ${matches.length} matches`);
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
}

seed();
