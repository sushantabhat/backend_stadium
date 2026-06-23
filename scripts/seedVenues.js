const mongoose = require('mongoose');
const path = require('path');
const Venue = require('../src/models/Venue');
require('../src/models/User');

const envResult = require('dotenv').config({
  path: path.join(__dirname, '../.env'),
  override: true,
});

const mongoUri = envResult.parsed?.MONGO_URI || process.env.MONGO_URI;

const CATEGORIES = ['platinum', 'gold', 'silver', 'bronze', 'general', 'supporters'];
const CATEGORY_COLORS = {
  platinum: '#E8E8E8',
  gold: '#FFD700',
  silver: '#A8A8A8',
  bronze: '#CD7F32',
  general: '#5B9BD5',
  supporters: '#81C784',
};

const DEFAULT_PRICING = {
  platinum: 3500,
  gold: 2500,
  silver: 1500,
  bronze: 800,
  general: 300,
  supporters: 150,
};

function generateSections(venueName) {
  return CATEGORIES.map((cat, i) => ({
    sectionId: `${venueName.substring(0, 3).toUpperCase()}-${cat.toUpperCase()}`,
    category: cat,
    label: `${cat.charAt(0).toUpperCase() + cat.slice(1)} Section`,
    color: CATEGORY_COLORS[cat],
    pricePerTicket: DEFAULT_PRICING[cat],
    totalSeats: cat === 'platinum' ? 50 : cat === 'gold' ? 100 : cat === 'silver' ? 150 : cat === 'bronze' ? 200 : cat === 'general' ? 300 : 100,
    rows: cat === 'platinum' ? ['A', 'B'] : cat === 'gold' ? ['A', 'B', 'C'] : cat === 'silver' ? ['A', 'B', 'C', 'D'] : cat === 'bronze' ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    polygon: '',
  }));
}

const VENUES = [
  {
    name: 'Tribhuvan University International Cricket Ground',
    location: 'Kirtipur, Kathmandu',
  },
  {
    name: 'Mulpani International Cricket Ground',
    location: 'Mulpani, Kathmandu',
  },
];

async function seed() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    for (const v of VENUES) {
      const existing = await Venue.findOne({ name: v.name });
      if (existing) {
        console.log(`Venue already exists: ${v.name}`);
        continue;
      }

      const sections = generateSections(v.name);
      const pricing = {};
      for (const [key, val] of Object.entries(DEFAULT_PRICING)) {
        pricing[key] = val;
      }

      const adminUser = await mongoose.model('User').findOne({ role: 'admin' });
      if (!adminUser) {
        console.log('No admin user found. Create an admin user first.');
        process.exit(1);
      }

      await Venue.create({
        name: v.name,
        location: v.location,
        pricing,
        stadiumSections: sections,
        seatLayout: { rows: 10, seatsPerRow: 20, vipRows: 2, premiumRows: 3 },
        createdBy: adminUser._id,
      });
      console.log(`Created venue: ${v.name}`);
    }

    console.log('Seed complete');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seed();
