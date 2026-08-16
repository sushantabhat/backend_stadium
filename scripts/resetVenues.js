const mongoose = require('mongoose');
const path = require('path');
const Venue = require('../src/models/Venue');
require('../src/models/User');

const envResult = require('dotenv').config({
  path: path.join(__dirname, '../.env'),
  override: true,
});

const mongoUri = envResult.parsed?.MONGO_URI || process.env.MONGO_URI;

const CATEGORY_COLORS = {
  platinum: '#E8E8E8',
  gold: '#FFD700',
  silver: '#A8A8A8',
  bronze: '#CD7F32',
  general: '#5B9BD5',
  supporters: '#81C784',
};

function toSvgPath(coordStr) {
  const pts = coordStr.split(' ').map((p) => p.split(',').map(Number));
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ') + ' Z';
}

/* ═══════════════════════════════════════════════════
   TRIBHUVAN UNIVERSITY — 8,000 seats, 8 sections
   ViewBox: 400×350 | Pitch: 120,120 → 280,230
   Stadium outline: M50,30 Q200,0 350,30 Q380,175 350,320 Q200,350 50,320 Q20,175 50,30
   ═══════════════════════════════════════════════════ */
const TU_SECTIONS = [
  {
    sectionId: 'TU-MEDIA',
    category: 'gold',
    label: 'Media Stand',
    color: CATEGORY_COLORS.gold,
    pricePerTicket: 2500,
    totalSeats: 800,
    rows: ['A', 'B', 'C', 'D'],
    polygon: '65,50 145,50 145,95 65,95',
    gate: 'West Gate',
  },
  {
    sectionId: 'TU-CLUBHOUSE',
    category: 'gold',
    label: 'Club House',
    color: CATEGORY_COLORS.gold,
    pricePerTicket: 2500,
    totalSeats: 800,
    rows: ['A', 'B', 'C', 'D'],
    polygon: '255,50 335,50 335,95 255,95',
    gate: 'East Gate',
  },
  {
    sectionId: 'TU-NORTH',
    category: 'silver',
    label: 'North Stand',
    color: CATEGORY_COLORS.silver,
    pricePerTicket: 1500,
    totalSeats: 1200,
    rows: ['A', 'B', 'C', 'D', 'E'],
    polygon: '150,50 250,50 250,110 150,110',
    gate: 'North Gate',
  },
  {
    sectionId: 'TU-WEST',
    category: 'bronze',
    label: 'West Stand',
    color: CATEGORY_COLORS.bronze,
    pricePerTicket: 800,
    totalSeats: 1400,
    rows: ['A', 'B', 'C', 'D', 'E', 'F'],
    polygon: '55,110 145,110 145,240 55,240',
    gate: 'West Gate',
  },
  {
    sectionId: 'TU-EAST',
    category: 'bronze',
    label: 'East Stand',
    color: CATEGORY_COLORS.bronze,
    pricePerTicket: 800,
    totalSeats: 1400,
    rows: ['A', 'B', 'C', 'D', 'E', 'F'],
    polygon: '255,110 345,110 345,240 255,240',
    gate: 'East Gate',
  },
  {
    sectionId: 'TU-SOUTH',
    category: 'silver',
    label: 'South Stand',
    color: CATEGORY_COLORS.silver,
    pricePerTicket: 1500,
    totalSeats: 1200,
    rows: ['A', 'B', 'C', 'D', 'E'],
    polygon: '150,240 250,240 250,290 150,290',
    gate: 'South Gate',
  },
  {
    sectionId: 'TU-PAVILION',
    category: 'platinum',
    label: 'Pavilion Stand',
    color: CATEGORY_COLORS.platinum,
    pricePerTicket: 3500,
    totalSeats: 800,
    rows: ['A', 'B', 'C', 'D'],
    polygon: '160,295 240,295 240,325 160,325',
    gate: 'South Gate',
  },
  {
    sectionId: 'TU-CORPORATE',
    category: 'platinum',
    label: 'Corporate Box',
    color: CATEGORY_COLORS.platinum,
    pricePerTicket: 4000,
    totalSeats: 400,
    rows: ['A', 'B'],
    polygon: '170,115 230,115 230,135 170,135',
    gate: 'South Gate',
  },
];

/* ═══════════════════════════════════════════════════
   MULPANI INTERNATIONAL — 7,000 seats, 8 sections
   ViewBox: 400×350 | Pitch: 120,120 → 280,230
   Stadium outline: M50,30 Q200,0 350,30 Q380,175 350,320 Q200,350 50,320 Q20,175 50,30
   ═══════════════════════════════════════════════════ */
const MULPANI_SECTIONS = [
  {
    sectionId: 'MP-GENNORTH',
    category: 'general',
    label: 'General North',
    color: CATEGORY_COLORS.general,
    pricePerTicket: 500,
    totalSeats: 1100,
    rows: ['A', 'B', 'C', 'D', 'E', 'F'],
    polygon: '65,50 145,50 145,95 65,95',
    gate: 'North Gate',
  },
  {
    sectionId: 'MP-SUPPORTERS',
    category: 'supporters',
    label: 'Supporters Zone',
    color: CATEGORY_COLORS.supporters,
    pricePerTicket: 250,
    totalSeats: 1000,
    rows: ['A', 'B', 'C', 'D', 'E'],
    polygon: '255,50 335,50 335,95 255,95',
    gate: 'West Gate',
  },
  {
    sectionId: 'MP-NORTH',
    category: 'platinum',
    label: 'North Pavilion',
    color: CATEGORY_COLORS.platinum,
    pricePerTicket: 3500,
    totalSeats: 800,
    rows: ['A', 'B', 'C', 'D'],
    polygon: '150,50 250,50 250,110 150,110',
    gate: 'North Gate',
  },
  {
    sectionId: 'MP-WEST',
    category: 'bronze',
    label: 'West Stand',
    color: CATEGORY_COLORS.bronze,
    pricePerTicket: 900,
    totalSeats: 1000,
    rows: ['A', 'B', 'C', 'D', 'E'],
    polygon: '55,110 145,110 145,240 55,240',
    gate: 'West Gate',
  },
  {
    sectionId: 'MP-EAST',
    category: 'bronze',
    label: 'East Stand',
    color: CATEGORY_COLORS.bronze,
    pricePerTicket: 900,
    totalSeats: 1000,
    rows: ['A', 'B', 'C', 'D', 'E'],
    polygon: '255,110 345,110 345,240 255,240',
    gate: 'East Gate',
  },
  {
    sectionId: 'MP-SOUTH',
    category: 'silver',
    label: 'South Pavilion',
    color: CATEGORY_COLORS.silver,
    pricePerTicket: 1500,
    totalSeats: 1000,
    rows: ['A', 'B', 'C', 'D', 'E'],
    polygon: '150,240 250,240 250,280 150,280',
    gate: 'South Gate',
  },
  {
    sectionId: 'MP-VIP',
    category: 'gold',
    label: 'VIP Stand',
    color: CATEGORY_COLORS.gold,
    pricePerTicket: 2800,
    totalSeats: 600,
    rows: ['A', 'B', 'C'],
    polygon: '160,285 240,285 240,310 160,310',
    gate: 'South Gate',
  },
  {
    sectionId: 'MP-MEDIA',
    category: 'gold',
    label: 'Media Gallery',
    color: CATEGORY_COLORS.gold,
    pricePerTicket: 2800,
    totalSeats: 500,
    rows: ['A', 'B'],
    polygon: '170,315 230,315 230,335 170,335',
    gate: 'South Gate',
  },
];

async function resetAndSeed() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const deleteResult = await Venue.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} venues`);

    const adminUser = await mongoose.model('User').findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('No admin user found. Create an admin user first.');
      process.exit(1);
    }

    const venues = [
      {
        name: 'Tribhuvan University International Cricket Ground',
        location: 'Kirtipur, Kathmandu',
        sections: TU_SECTIONS,
        gates: ['South Gate', 'North Gate', 'East Gate', 'West Gate'],
        pricing: { platinum: 3500, gold: 2500, silver: 1500, bronze: 800, general: 400, supporters: 200 },
      },
      {
        name: 'Mulpani International Cricket Ground',
        location: 'Mulpani, Kathmandu',
        sections: MULPANI_SECTIONS,
        gates: ['South Gate', 'North Gate', 'East Gate', 'West Gate'],
        pricing: { platinum: 3500, gold: 2800, silver: 1500, bronze: 900, general: 500, supporters: 250 },
      },
    ];

    for (const v of venues) {
      const totalSeats = v.sections.reduce((sum, s) => sum + s.totalSeats, 0);
      const sections = v.sections.map((s) => ({ ...s, polygon: toSvgPath(s.polygon) }));
      await Venue.create({
        name: v.name,
        location: v.location,
        pricing: v.pricing,
        gates: v.gates,
        stadiumSections: sections,
        seatLayout: { totalSections: sections.length, totalSeats },
        createdBy: adminUser._id,
      });
      console.log(`Created: ${v.name} (${totalSeats} seats, ${v.sections.length} sections)`);
    }

    console.log('Seed complete');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

resetAndSeed();
