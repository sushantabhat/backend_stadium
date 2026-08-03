require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Venue = require('./src/models/Venue');
const Team = require('./src/models/Team');

// We directly use matchService to create the matches
// We will mimic the payload that validateCreatePayload outputs
const matchService = require('./src/services/matchService');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-stadium');
    console.log('Connected to DB');

    const admin = await User.findOne({ email: 'admin@stadium.com' });
    if (!admin) throw new Error('Admin user not found');

    const venues = await Venue.find();
    const teams = await Team.find();

    if (venues.length === 0 || teams.length < 2) {
      throw new Error('Need venues and teams in DB first');
    }

    // Scenarios for 10 matches
    const scenarios = [
      { title: "NPL Opener: Gurkhas vs Rhinos", type: "NPL", stage: "League Stage", tA: 0, tB: 1, v: 0, days: 1 },
      { title: "Terai Derby: Bolts vs Kings", type: "NPL", stage: "League Stage", tA: 2, tB: 3, v: 1, days: 3 },
      { title: "Friendly: Royals vs Lions", type: "Friendly", stage: "League Stage", tA: 4, tB: 5, v: 2, days: 5 },
      { title: "Top Table Clash: Gurkhas vs Kings", type: "NPL", stage: "League Stage", tA: 0, tB: 3, v: 3, days: 7 },
      { title: "Mid-Season Decider: Rhinos vs Royals", type: "NPL", stage: "League Stage", tA: 1, tB: 4, v: 4, days: 9 },
      { title: "NPL Quarter Final 1", type: "NPL", stage: "Quarter-Finals", tA: 0, tB: 2, v: 5, days: 12 },
      { title: "NPL Quarter Final 2", type: "NPL", stage: "Quarter-Finals", tA: 3, tB: 5, v: 6, days: 14 },
      { title: "NPL Semi Final 1", type: "NPL", stage: "Semi-Finals", tA: 0, tB: 5, v: 0, days: 17 },
      { title: "NPL Semi Final 2", type: "NPL", stage: "Semi-Finals", tA: 1, tB: 2, v: 1, days: 18 },
      { title: "NPL GRAND FINALE 2024", type: "NPL", stage: "Finals", tA: 0, tB: 1, v: 4, days: 21 },
    ];

    for (let s of scenarios) {
      const venue = venues[s.v % venues.length];
      const tA = teams[s.tA % teams.length];
      const tB = teams[s.tB % teams.length];

      const matchDate = new Date();
      matchDate.setDate(matchDate.getDate() + s.days);
      matchDate.setHours(14, 0, 0, 0); // 2 PM

      // Mimic validateCreatePayload output
      const payload = {
        title: s.title,
        teamA: tA.name,
        teamB: tB.name,
        venue: venue.name,
        matchDate: matchDate,
        description: `Exciting ${s.type} match!`,
        imageUrl: '',
        teamALogo: tA.logoUrl || '',
        teamBLogo: tB.logoUrl || '',
        pricing: { platinum: 5000, gold: 3000, silver: 2000, bronze: 1000, general: 500, supporters: 200 },
        match_type: s.type,
        match_stage: s.stage,
        cricket_format: 'T20',
        global_stars_count: 0,
        international_stars_count: 0,
        local_stars_count: 0,
        venueGates: venue.gates || [],
        stadiumSections: (venue.stadiumSections || []).map((sec) => ({
          sectionId: sec.sectionId,
          category: sec.category,
          label: sec.label || sec.sectionId,
          color: sec.color || '#888888',
          polygon: sec.polygon || '',
          labelX: 0,
          labelY: 0,
          pricePerTicket: sec.pricePerTicket || 500,
          totalSeats: sec.totalSeats,
          availableSeats: sec.totalSeats,
          rows: sec.rows && sec.rows.length > 0 ? sec.rows : Array.from({ length: Math.max(1, Math.ceil(sec.totalSeats / 20)) }, (_, i) => `R${i + 1}`),
          gate: sec.gate || '',
        }))
      };
      
      console.log('Sample rows for section 0:', payload.stadiumSections[0].rows.slice(0, 5));

      try {
        await matchService.createMatch(admin._id, payload);
        console.log(`Created match: ${s.title}`);
      } catch (err) {
        console.error(`Failed to create ${s.title}:`, err.message);
      }
    }

    console.log('Successfully generated 10 scenario matches!');
    process.exit(0);
  } catch (e) {
    console.error('Fatal Error:', e);
    process.exit(1);
  }
}

seed();
