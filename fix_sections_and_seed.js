// fix_sections_and_seed.js
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

const SECTION_CAPACITY = {
  platinum: 2000,
  gold: 4000,
  silver: 6000,
  general: 8000
};

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

    // Update Venues with sections
    const venues = await Venue.find();
    for (const venue of venues) {
      const sections = [];
      const pricing = venue.pricing || new Map();
      const tiers = ['platinum', 'gold', 'silver', 'general'];
      
      for (const tier of tiers) {
        let price = pricing.get(tier) || 100;
        
        // Generate rows array
        const seatsPerRow = SEATS_PER_ROW[tier];
        const rowCount = Math.ceil(SECTION_CAPACITY[tier] / seatsPerRow);
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
          totalSeats: SECTION_CAPACITY[tier],
          rows: rows,
          gate: GATES[tier]
        });
      }

      venue.stadiumSections = sections;
      venue.gates = ['A', 'B', 'C', 'D'];
      await venue.save();
    }
    console.log('Updated all venues with stadium sections (4 stands with proper pricing).');

    // Seed matches to populate seats
    await Match.deleteMany({});
    await Seat.deleteMany({});

    if (venues.length === 0) {
      console.log('No venues found, exiting');
      process.exit(0);
    }

    const teams = ['Kathmandu Kings XI', 'Lalitpur Patriots', 'Biratnagar Warriors', 'Pokhara Rhinos', 'Chitwan Tigers', 'Bhairahawa Gladiators'];
    const bannerImages = [
      'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=2000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1519315901367-f34bf9158742?q=80&w=2000&auto=format&fit=crop'
    ];

    const owner = await require('./src/models/User').findOne();

    for (let i = 0; i < 8; i++) {
      const venue = venues[i % venues.length];
      const t1 = teams[i % teams.length];
      const t2 = teams[(i + 1) % teams.length];
      
      const match = new Match({
        title: `${t1} vs ${t2}`,
        matchDate: new Date(Date.now() + (i + 1) * 86400000),
        venue: venue._id,
        teamA: t1,
        teamB: t2,
        status: 'upcoming',
        createdBy: owner._id,
        imageUrl: bannerImages[i % bannerImages.length],
        stadiumSections: venue.stadiumSections,
        totalSeats: venue.stadiumSections.reduce((sum, s) => sum + s.totalSeats, 0)
      });

      await match.save();
      
      const seatsToInsert = [];
      for (const section of venue.stadiumSections) {
        const tier = section.category;
        const seatsPerRow = SEATS_PER_ROW[tier];
        let currentSeatCount = 0;
        
        for (const row of section.rows) {
          // If we reach the target capacity for this section, stop adding seats
          if (currentSeatCount >= section.totalSeats) break;
          
          for (let s = 1; s <= seatsPerRow; s++) {
            if (currentSeatCount >= section.totalSeats) break;
            
            seatsToInsert.push({
              match: match._id,
              sectionId: section.sectionId,
              row: row,
              seatLabel: `${section.sectionId}-${row}-${s}`,
              number: s,
              category: section.category,
              status: 'available',
              price: section.pricePerTicket,
              gate: section.gate
            });
            currentSeatCount++;
          }
        }
      }
      
      await Seat.insertMany(seatsToInsert);
      console.log(`Created match ${match.title} with ${seatsToInsert.length} seats.`);
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}
run();
