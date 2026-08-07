const mongoose = require('mongoose');
require('dotenv').config();
const Venue = require('./src/models/Venue');
const Match = require('./src/models/Match');
const Seat = require('./src/models/Seat');

const POLYGONS = {
  platinum: 'M110.0,67.8 A140,140 0 0,1 290.0,67.8 L257.9,106.1 A90,90 0 0,0 142.1,106.1 Z', // North
  gold: 'M110.0,282.2 A140,140 0 0,0 290.0,282.2 L257.9,243.9 A90,90 0 0,1 142.1,243.9 Z', // South
  silver: 'M307.2,85.0 A140,140 0 0,1 307.2,265.0 L268.9,232.9 A90,90 0 0,0 268.9,117.2 Z', // East
  general: 'M92.8,265.0 A140,140 0 0,1 92.8,85.0 L131.1,117.2 A90,90 0 0,0 131.1,232.9 Z' // West
};

const COLORS = {
  platinum: '#ffb300', // Gold/Yellow
  gold: '#1e88e5',     // Blue
  silver: '#43a047',   // Green
  general: '#e53935'   // Red
};

const GATES = {
  platinum: 'A',
  gold: 'B',
  silver: 'C',
  general: 'D'
};

const LABELS = {
  platinum: 'North Stand (VIP)',
  gold: 'South Stand (Premium)',
  silver: 'East Stand',
  general: 'West Stand'
};

const VENUE_CAPACITIES = [
  { platinum: 1000, gold: 3000, silver: 5000, general: 6000 },  // 15k
  { platinum: 1500, gold: 3500, silver: 6000, general: 7000 },  // 18k
  { platinum: 2000, gold: 4000, silver: 6000, general: 8000 },  // 20k
  { platinum: 2500, gold: 4500, silver: 6500, general: 8500 },  // 22k
  { platinum: 3000, gold: 5000, silver: 7000, general: 10000 }, // 25k
  { platinum: 3500, gold: 5500, silver: 8000, general: 11000 }, // 28k
  { platinum: 4000, gold: 6000, silver: 8000, general: 12000 }, // 30k
  { platinum: 5000, gold: 7000, silver: 10000, general: 13000 },// 35k
];

const SEATS_PER_ROW = {
  platinum: 40,
  gold: 50,
  silver: 60,
  general: 80
};

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-stadium');
    console.log('Connected to DB');

    // Delete all matches and seats
    const matchCount = await Match.countDocuments();
    await Match.deleteMany({});
    await Seat.deleteMany({});
    console.log(`Deleted ${matchCount} matches and all associated seats.`);

    // Update Venues with different capacities
    const venues = await Venue.find();
    
    for (let vIdx = 0; vIdx < venues.length; vIdx++) {
      const venue = venues[vIdx];
      const capacityConfig = VENUE_CAPACITIES[vIdx % VENUE_CAPACITIES.length];
      
      const sections = [];
      const pricing = venue.pricing || new Map();
      const tiers = ['platinum', 'gold', 'silver', 'general'];
      
      for (const tier of tiers) {
        let price = pricing.get(tier) || 100;
        
        const seatsPerRow = SEATS_PER_ROW[tier];
        const targetSeats = capacityConfig[tier];
        const rowCount = Math.ceil(targetSeats / seatsPerRow);
        
        const rows = [];
        for (let i = 1; i <= rowCount; i++) {
          rows.push(`R${i}`);
        }

        sections.push({
          sectionId: LABELS[tier].split(' ')[0],
          category: tier,
          label: LABELS[tier],
          color: COLORS[tier],
          polygon: POLYGONS[tier],
          pricePerTicket: price,
          totalSeats: targetSeats,
          rows: rows,
          gate: GATES[tier]
        });
      }

      venue.stadiumSections = sections;
      venue.gates = ['A', 'B', 'C', 'D'];
      await venue.save();
      
      const totalCap = Object.values(capacityConfig).reduce((a, b) => a + b, 0);
      console.log(`Updated venue "${venue.name}" with capacity ${totalCap}`);
    }

    console.log('Successfully updated all venue capacities and deleted matches.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
