const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Match = require('../src/models/Match');
const Seat = require('../src/models/Seat');
const { STADIUM_SECTIONS } = require('./stadiumLayout');

const PRICING = {
  platinum: 5000,
  gold: 3000,
  silver: 1500,
  bronze: 1200,
  general: 800,
  supporters: 500,
};

const MATCHES = [
  {
    title: 'Biratnagar Kings vs Chitwan Rhinos - NPL 2026',
    teamA: 'Biratnagar Kings',
    teamB: 'Chitwan Rhinos',
    venue: 'Koshi Stadium, Biratnagar',
    description: 'Eastern giants clash in a high-voltage NPL opener! Sandeep Lamichhane leads the Kings against Kushal Malla\'s Rhinos at the Koshi Stadium. Expect spin-friendly conditions and electrifying local support.',
    imageUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800',
  },
  {
    title: 'Janakpur Bolts vs Karnali Yaks - NPL 2026',
    teamA: 'Janakpur Bolts',
    teamB: 'Karnali Yaks',
    venue: 'Janakpur International Stadium, Janakpur',
    description: 'Defending champions Janakpur Bolts take on the mighty Karnali Yaks. Anil Sah vs Sompal Kami — a captain\'s battle under the floodlights.',
    imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
  },
  {
    title: 'Kathmandu Gorkhas vs Lumbini Lions - NPL 2026',
    teamA: 'Kathmandu Gorkhas',
    teamB: 'Lumbini Lions',
    venue: 'Mulpani Cricket Stadium, Kathmandu',
    description: 'The capital derby! Karan KC\'s Gorkhas host Rohit Paudel\'s Lions in what promises to be a packed house at Mulpani.',
    imageUrl: 'https://images.unsplash.com/photo-1569517282132-25d22e2e36cb?w=800',
  },
  {
    title: 'Pokhara Avengers vs Sudurpaschim Royals - NPL 2026',
    teamA: 'Pokhara Avengers',
    teamB: 'Sudurpaschim Royals',
    venue: 'Pokhara Cricket Ground, Pokhara',
    description: 'Franchise cricket against the backdrop of the Annapurna range. Kushal Bhurtel vs Dipendra Singh Airee in a battle of Nepal\'s finest.',
    imageUrl: 'https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=800',
  },
  {
    title: 'Chitwan Rhinos vs Janakpur Bolts - NPL 2026',
    teamA: 'Chitwan Rhinos',
    teamB: 'Janakpur Bolts',
    venue: 'Gaida Stadium, Chitwan',
    description: 'The Rhinos charge at home against the league\'s most consistent side. A mid-table showdown with playoff implications.',
    imageUrl: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800',
  },
  {
    title: 'Karnali Yaks vs Biratnagar Kings - NPL 2026',
    teamA: 'Karnali Yaks',
    teamB: 'Biratnagar Kings',
    venue: 'Karnali High Ground, Surkhet',
    description: 'High-altitude cricket in Surkhet! Sompal Kami\'s pace vs Sandeep Lamichhane\'s spin — a classic contest in the Karnali hills.',
    imageUrl: 'https://images.unsplash.com/photo-1623401580423-1c46090d34d0?w=800',
  },
  {
    title: 'Lumbini Lions vs Pokhara Avengers - NPL 2026',
    teamA: 'Lumbini Lions',
    teamB: 'Pokhara Avengers',
    venue: 'Buddha International Stadium, Lumbini',
    description: 'The Lions roar in the birthplace of Buddha. Rohit Paudel leads from the front as the Avengers come to visit the holy city.',
    imageUrl: 'https://images.unsplash.com/photo-1471298551731-6b03eee4a635?w=800',
  },
  {
    title: 'Sudurpaschim Royals vs Kathmandu Gorkhas - NPL 2026',
    teamA: 'Sudurpaschim Royals',
    teamB: 'Kathmandu Gorkhas',
    venue: 'Dhangadhi Cricket Stadium, Dhangadhi',
    description: 'Far-west vs centre — the Royals defend their fortress against the Gorkhas. Airee and KC, two of Nepal\'s finest all-rounders, go head-to-head.',
    imageUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=800',
  },
  {
    title: 'Biratnagar Kings vs Lumbini Lions - NPL 2026',
    teamA: 'Biratnagar Kings',
    teamB: 'Lumbini Lions',
    venue: 'Koshi Stadium, Biratnagar',
    description: 'Sandeep Lamichhane faces off against Rohit Paudel in this blockbuster NPL fixture. Nepal\'s two biggest cricket stars collide!',
    imageUrl: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=800',
  },
  {
    title: 'Kathmandu Gorkhas vs Pokhara Avengers - NPL 2026',
    teamA: 'Kathmandu Gorkhas',
    teamB: 'Pokhara Avengers',
    venue: 'Dasharath Stadium, Kathmandu',
    description: 'The grand finale of NPL 2026 group stage! Kathmandu welcomes Pokhara in a match that could decide the playoff berths. Expect a full house at Dasharath!',
    imageUrl: 'https://images.unsplash.com/photo-1524893947070-d2b50b02ba09?w=800',
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

  const existingMatches = await Match.find();
  for (const m of existingMatches) {
    await Seat.deleteMany({ match: m._id });
    console.log(`Deleted seats for: "${m.title}"`);
  }
  const delCount = await Match.deleteMany({});
  console.log(`Deleted ${delCount.deletedCount} existing match(es)\n`);

  const totalSeatsPerMatch = STADIUM_SECTIONS.reduce((sum, s) => sum + s.totalSeats, 0);

  for (const matchData of MATCHES) {
    const sections = STADIUM_SECTIONS.map((s) => ({
      ...s,
      pricePerTicket: PRICING[s.category] || 1000,
      availableSeats: s.totalSeats,
    }));

    const pricing = { ...PRICING };

    const daysFromNow = Math.floor(Math.random() * 60) + 7;
    const match = await Match.create({
      ...matchData,
      matchDate: new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000),
      createdBy: admin._id,
      pricing,
      stadiumSections: sections,
      totalSeats: totalSeatsPerMatch,
    });

    console.log(`Created match: "${match.title}"`);
    console.log(`  Venue: ${match.venue}`);
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

  console.log('Done! 10 Nepali matches seeded.');
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
