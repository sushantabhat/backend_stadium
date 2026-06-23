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
   TU INTERNATIONAL CRICKET GROUND — 10,000 seats
   Oval ground, pavilion at south, open stands north
   ═══════════════════════════════════════════════════ */
const TU_SECTIONS = [
  {
    sectionId: 'TU-PAVILION',
    category: 'platinum',
    label: 'Pavilion Stand',
    color: CATEGORY_COLORS.platinum,
    pricePerTicket: 3500,
    totalSeats: 800,
    rows: ['A', 'B', 'C', 'D'],
    polygon: '140,170 180,160 220,160 240,170 240,210 220,220 180,220 140,210',
    gate: 'South Gate',
  },
  {
    sectionId: 'TU-MEDIA',
    category: 'gold',
    label: 'Media Stand',
    color: CATEGORY_COLORS.gold,
    pricePerTicket: 2500,
    totalSeats: 500,
    rows: ['A', 'B', 'C'],
    polygon: '240,170 280,155 310,155 330,165 330,215 310,225 280,225 240,215',
    gate: 'South Gate',
  },
  {
    sectionId: 'TU-CLUBHOUSE',
    category: 'gold',
    label: 'Club House',
    color: CATEGORY_COLORS.gold,
    pricePerTicket: 2500,
    totalSeats: 600,
    rows: ['A', 'B', 'C'],
    polygon: '100,170 140,160 140,220 100,230 75,220 75,180',
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
    polygon: '160,140 200,132 240,132 260,140 260,160 240,165 200,165 160,160',
    gate: 'South Gate',
  },
  {
    sectionId: 'TU-NORTH',
    category: 'silver',
    label: 'North Stand',
    color: CATEGORY_COLORS.silver,
    pricePerTicket: 1500,
    totalSeats: 1200,
    rows: ['A', 'B', 'C', 'D', 'E'],
    polygon: '150,50 180,35 220,35 250,50 250,95 220,110 180,110 150,95',
    gate: 'North Gate',
  },
  {
    sectionId: 'TU-SOUTH',
    category: 'silver',
    label: 'South Stand',
    color: CATEGORY_COLORS.silver,
    pricePerTicket: 1500,
    totalSeats: 1200,
    rows: ['A', 'B', 'C', 'D', 'E'],
    polygon: '150,260 180,250 220,250 250,260 250,305 220,315 180,315 150,305',
    gate: 'South Gate',
  },
  {
    sectionId: 'TU-EAST',
    category: 'bronze',
    label: 'East Stand',
    color: CATEGORY_COLORS.bronze,
    pricePerTicket: 800,
    totalSeats: 1300,
    rows: ['A', 'B', 'C', 'D', 'E', 'F'],
    polygon: '310,100 345,85 375,95 385,130 385,240 375,275 345,285 310,270 310,100',
    gate: 'East Gate',
  },
  {
    sectionId: 'TU-WEST',
    category: 'bronze',
    label: 'West Stand',
    color: CATEGORY_COLORS.bronze,
    pricePerTicket: 800,
    totalSeats: 1500,
    rows: ['A', 'B', 'C', 'D', 'E', 'F'],
    polygon: '90,100 55,85 25,95 15,130 15,240 25,275 55,285 90,270 90,100',
    gate: 'West Gate',
  },
  {
    sectionId: 'TU-GENNORTH',
    category: 'general',
    label: 'General North',
    color: CATEGORY_COLORS.general,
    pricePerTicket: 400,
    totalSeats: 1200,
    rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    polygon: '250,50 290,40 310,65 310,100 250,95',
    gate: 'North Gate',
  },
  {
    sectionId: 'TU-GENSOUTH',
    category: 'general',
    label: 'General South',
    color: CATEGORY_COLORS.general,
    pricePerTicket: 400,
    totalSeats: 800,
    rows: ['A', 'B', 'C', 'D', 'E'],
    polygon: '250,260 290,280 310,270 310,235 250,305',
    gate: 'South Gate',
  },
  {
    sectionId: 'TU-STUDENT',
    category: 'supporters',
    label: 'Student Stand',
    color: CATEGORY_COLORS.supporters,
    pricePerTicket: 200,
    totalSeats: 500,
    rows: ['A', 'B', 'C'],
    polygon: '90,50 55,40 25,65 25,100 90,95',
    gate: 'West Gate',
  },
];

/* ═══════════════════════════════════════════════════
   MULPANI INTERNATIONAL CRICKET GROUND — 13,000 seats
   Larger rectangular ground, corporate east, general west
   ═══════════════════════════════════════════════════ */
const MULPANI_SECTIONS = [
  {
    sectionId: 'MP-PAVILION',
    category: 'platinum',
    label: 'Pavilion Stand',
    color: CATEGORY_COLORS.platinum,
    pricePerTicket: 4000,
    totalSeats: 1000,
    rows: ['A', 'B', 'C', 'D', 'E'],
    polygon: '130,175 170,165 220,165 250,175 250,225 220,235 170,235 130,225',
    gate: 'South Gate',
  },
  {
    sectionId: 'MP-CORPORATE',
    category: 'platinum',
    label: 'Corporate Box',
    color: CATEGORY_COLORS.platinum,
    pricePerTicket: 4500,
    totalSeats: 600,
    rows: ['A', 'B', 'C'],
    polygon: '250,175 290,160 320,160 340,170 340,220 320,230 290,230 250,225',
    gate: 'South Gate',
  },
  {
    sectionId: 'MP-MEDIA',
    category: 'gold',
    label: 'Media Gallery',
    color: CATEGORY_COLORS.gold,
    pricePerTicket: 2800,
    totalSeats: 700,
    rows: ['A', 'B', 'C', 'D'],
    polygon: '90,175 130,165 130,225 90,235 65,225 65,185',
    gate: 'South Gate',
  },
  {
    sectionId: 'MP-VIP',
    category: 'gold',
    label: 'VIP Stand',
    color: CATEGORY_COLORS.gold,
    pricePerTicket: 3000,
    totalSeats: 900,
    rows: ['A', 'B', 'C', 'D'],
    polygon: '150,140 200,130 250,130 270,140 270,165 250,170 200,170 150,165',
    gate: 'South Gate',
  },
  {
    sectionId: 'MP-NORTH',
    category: 'silver',
    label: 'North Pavilion',
    color: CATEGORY_COLORS.silver,
    pricePerTicket: 1500,
    totalSeats: 1800,
    rows: ['A', 'B', 'C', 'D', 'E', 'F'],
    polygon: '140,45 175,30 225,30 260,45 260,100 225,115 175,115 140,100',
    gate: 'North Gate',
  },
  {
    sectionId: 'MP-SOUTH',
    category: 'silver',
    label: 'South Pavilion',
    color: CATEGORY_COLORS.silver,
    pricePerTicket: 1500,
    totalSeats: 1800,
    rows: ['A', 'B', 'C', 'D', 'E', 'F'],
    polygon: '140,275 175,265 225,265 260,275 260,330 225,345 175,345 140,330',
    gate: 'South Gate',
  },
  {
    sectionId: 'MP-EAST',
    category: 'bronze',
    label: 'East Stand',
    color: CATEGORY_COLORS.bronze,
    pricePerTicket: 900,
    totalSeats: 1700,
    rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    polygon: '320,90 360,75 395,85 405,125 405,265 395,305 360,315 320,300 320,90',
    gate: 'East Gate',
  },
  {
    sectionId: 'MP-WEST',
    category: 'bronze',
    label: 'West Stand',
    color: CATEGORY_COLORS.bronze,
    pricePerTicket: 900,
    totalSeats: 1500,
    rows: ['A', 'B', 'C', 'D', 'E', 'F'],
    polygon: '80,90 40,75 10,85 0,125 0,265 10,305 40,315 80,300 80,90',
    gate: 'West Gate',
  },
  {
    sectionId: 'MP-GENNORTH',
    category: 'general',
    label: 'General North',
    color: CATEGORY_COLORS.general,
    pricePerTicket: 500,
    totalSeats: 1000,
    rows: ['A', 'B', 'C', 'D', 'E', 'F'],
    polygon: '260,45 300,35 320,55 320,90 260,100',
    gate: 'North Gate',
  },
  {
    sectionId: 'MP-GENSOUTH',
    category: 'general',
    label: 'General South',
    color: CATEGORY_COLORS.general,
    pricePerTicket: 500,
    totalSeats: 1000,
    rows: ['A', 'B', 'C', 'D', 'E', 'F'],
    polygon: '260,275 300,295 320,285 320,250 260,330',
    gate: 'South Gate',
  },
  {
    sectionId: 'MP-GENEAST',
    category: 'general',
    label: 'General East',
    color: CATEGORY_COLORS.general,
    pricePerTicket: 400,
    totalSeats: 500,
    rows: ['A', 'B', 'C'],
    polygon: '80,45 40,35 10,55 10,90 80,100',
    gate: 'East Gate',
  },
  {
    sectionId: 'MP-SUPPORTERS',
    category: 'supporters',
    label: 'Supporters Zone',
    color: CATEGORY_COLORS.supporters,
    pricePerTicket: 250,
    totalSeats: 500,
    rows: ['A', 'B', 'C'],
    polygon: '80,275 40,295 10,285 10,250 80,330',
    gate: 'West Gate',
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
        pricing: { platinum: 4000, gold: 2800, silver: 1500, bronze: 900, general: 450, supporters: 250 },
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
