require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Venue = require('../src/models/Venue');
const User = require('../src/models/User');

function generateDonutSlice(cx, cy, rInner, rOuter, startAngle, endAngle, segments = 10) {
  const points = [];
  // Outer arc (forward)
  for (let i = 0; i <= segments; i++) {
    const angle = startAngle + (endAngle - startAngle) * (i / segments);
    const rad = (angle - 90) * (Math.PI / 180);
    const x = cx + rOuter * Math.cos(rad);
    const y = cy + rOuter * Math.sin(rad);
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  // Inner arc (backward)
  for (let i = segments; i >= 0; i--) {
    const angle = startAngle + (endAngle - startAngle) * (i / segments);
    const rad = (angle - 90) * (Math.PI / 180);
    const x = cx + rInner * Math.cos(rad);
    const y = cy + rInner * Math.sin(rad);
    points.push(`L${x.toFixed(1)},${y.toFixed(1)}`);
  }
  points.push('Z');
  return points.join(' ');
}

// Center of stadium is 200, 175.
const CX = 200;
const CY = 175;
const GAP = 2; // angle gap for aesthetics

// Mulpani: 4 massive curved sections (1 ring)
const MulpaniPolygons = [
  { sectionId: 'N1', category: 'platinum', label: 'North VIP Stand', color: '#FFD700', polygon: generateDonutSlice(CX, CY, 80, 150, -45 + GAP, 45 - GAP), pricePerTicket: 8000, totalSeats: 8000, rows: ['A','B','C','D','E','F'], gate: 'Gate 1' },
  { sectionId: 'E1', category: 'silver', label: 'East General', color: '#2196F3', polygon: generateDonutSlice(CX, CY, 80, 150, 45 + GAP, 135 - GAP), pricePerTicket: 3000, totalSeats: 12000, rows: ['G','H','I','J','K','L'], gate: 'Gate 2' },
  { sectionId: 'S1', category: 'platinum', label: 'South VIP Stand', color: '#FFD700', polygon: generateDonutSlice(CX, CY, 80, 150, 135 + GAP, 225 - GAP), pricePerTicket: 8000, totalSeats: 8000, rows: ['M','N','O','P','Q','R'], gate: 'Gate 3' },
  { sectionId: 'W1', category: 'silver', label: 'West General', color: '#2196F3', polygon: generateDonutSlice(CX, CY, 80, 150, 225 + GAP, 315 - GAP), pricePerTicket: 3000, totalSeats: 12000, rows: ['S','T','U','V','W','X'], gate: 'Gate 4' }
];

// Pokhara: 8 sections in 2 concentric rings
const PokharaPolygons = [
  // Lower Ring
  { sectionId: 'N-L', category: 'platinum', label: 'North Lower', color: '#E91E63', polygon: generateDonutSlice(CX, CY, 75, 110, -45 + GAP, 45 - GAP), pricePerTicket: 8000, totalSeats: 4000, rows: ['A','B','C'], gate: 'Gate 1' },
  { sectionId: 'E-L', category: 'silver', label: 'East Lower', color: '#9E9E9E', polygon: generateDonutSlice(CX, CY, 75, 110, 45 + GAP, 135 - GAP), pricePerTicket: 3000, totalSeats: 6000, rows: ['D','E','F'], gate: 'Gate 2' },
  { sectionId: 'S-L', category: 'platinum', label: 'South Lower', color: '#E91E63', polygon: generateDonutSlice(CX, CY, 75, 110, 135 + GAP, 225 - GAP), pricePerTicket: 8000, totalSeats: 4000, rows: ['G','H','I'], gate: 'Gate 3' },
  { sectionId: 'W-L', category: 'silver', label: 'West Lower', color: '#9E9E9E', polygon: generateDonutSlice(CX, CY, 75, 110, 225 + GAP, 315 - GAP), pricePerTicket: 3000, totalSeats: 6000, rows: ['J','K','L'], gate: 'Gate 4' },
  // Upper Ring
  { sectionId: 'N-U', category: 'gold', label: 'North Upper', color: '#FFC107', polygon: generateDonutSlice(CX, CY, 115, 160, -45 + GAP, 45 - GAP), pricePerTicket: 5000, totalSeats: 5000, rows: ['M','N','O'], gate: 'Gate 1' },
  { sectionId: 'E-U', category: 'bronze', label: 'East Upper', color: '#795548', polygon: generateDonutSlice(CX, CY, 115, 160, 45 + GAP, 135 - GAP), pricePerTicket: 1500, totalSeats: 7000, rows: ['P','Q','R'], gate: 'Gate 2' },
  { sectionId: 'S-U', category: 'gold', label: 'South Upper', color: '#FFC107', polygon: generateDonutSlice(CX, CY, 115, 160, 135 + GAP, 225 - GAP), pricePerTicket: 5000, totalSeats: 5000, rows: ['S','T','U'], gate: 'Gate 3' },
  { sectionId: 'W-U', category: 'bronze', label: 'West Upper', color: '#795548', polygon: generateDonutSlice(CX, CY, 115, 160, 225 + GAP, 315 - GAP), pricePerTicket: 1500, totalSeats: 7000, rows: ['V','W','X'], gate: 'Gate 4' }
];

// TU: 12 beautiful slices (clock face)
const TUPolygons = [];
const tuCategories = ['platinum', 'gold', 'silver', 'bronze', 'silver', 'gold', 'platinum', 'gold', 'silver', 'bronze', 'silver', 'gold'];
const tuColors = ['#9C27B0', '#FF9800', '#2196F3', '#795548', '#2196F3', '#FF9800', '#9C27B0', '#FF9800', '#2196F3', '#795548', '#2196F3', '#FF9800'];
for (let i = 0; i < 12; i++) {
  const startAngle = (i * 30) - 15;
  const endAngle = ((i + 1) * 30) - 15;
  TUPolygons.push({
    sectionId: `S${i+1}`,
    category: tuCategories[i],
    label: `Section ${i+1}`,
    color: tuColors[i],
    polygon: generateDonutSlice(CX, CY, 70, 150, startAngle + GAP, endAngle - GAP),
    pricePerTicket: 2000,
    totalSeats: 3500,
    rows: ['A','B','C','D'],
    gate: `Gate ${(i % 4) + 1}` // evenly divide into 4 gates
  });
}

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const admin = await User.findOne({ role: 'admin' });
    if (!admin) throw new Error('No admin user found to assign createdBy');

    await Venue.deleteMany({});
    console.log('Cleared existing venues.');

    const gates = ['Gate 1', 'Gate 2', 'Gate 3', 'Gate 4'];

    const v1 = await Venue.create({
      name: 'Mulpani Cricket Ground',
      location: 'Mulpani, Kathmandu',
      gates: gates,
      stadiumSections: MulpaniPolygons,
      createdBy: admin._id
    });

    const v2 = await Venue.create({
      name: 'Pokhara Cricket Ground',
      location: 'Pokhara, Kaski',
      gates: gates,
      stadiumSections: PokharaPolygons,
      createdBy: admin._id
    });

    const v3 = await Venue.create({
      name: 'TU Cricket Ground',
      location: 'Kirtipur, Kathmandu',
      gates: gates,
      stadiumSections: TUPolygons,
      createdBy: admin._id
    });

    console.log('Successfully created curved stadium layouts:', v1.name, v2.name, v3.name);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

seed();
