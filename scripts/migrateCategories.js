const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Match = require('../src/models/Match');
const Seat = require('../src/models/Seat');

const CATEGORY_MAP = {
  category1: 'gold',
  category2: 'silver',
  category3: 'bronze',
  category4: 'general',
  vip: 'platinum',
};

async function migrate() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI missing in backend/.env');

  console.log('Connecting to database...');
  await mongoose.connect(mongoUri);
  console.log('Connected.\n');

  // 1. Migrate Seat documents
  const seatDocs = await Seat.find({ category: { $in: Object.keys(CATEGORY_MAP) } });
  for (const seat of seatDocs) {
    const newCat = CATEGORY_MAP[seat.category];
    if (newCat) {
      seat.category = newCat;
      await seat.save();
    }
  }
  console.log(`Migrated ${seatDocs.length} seat(s)`);

  // 2. Migrate Match documents — rename pricing Map keys + section categories
  const matchDocs = await Match.find();
  let matchCount = 0;
  for (const match of matchDocs) {
    let changed = false;

    // Rename pricing keys
    if (match.pricing && match.pricing.size > 0) {
      const pricing = match.pricing;
      for (const [oldKey, newKey] of Object.entries(CATEGORY_MAP)) {
        if (pricing.has(oldKey)) {
          const val = pricing.get(oldKey);
          pricing.delete(oldKey);
          pricing.set(newKey, val);
          changed = true;
        }
      }
    }

    // Rename section categories
    if (match.stadiumSections && match.stadiumSections.length > 0) {
      for (const section of match.stadiumSections) {
        const newCat = CATEGORY_MAP[section.category];
        if (newCat) {
          section.category = newCat;
          changed = true;
        }
      }
    }

    // Rename seatLayout pricing keys if present
    if (match.seatLayout) {
      if (match.seatLayout.pricing) {
        for (const [oldKey, newKey] of Object.entries(CATEGORY_MAP)) {
          if (match.seatLayout.pricing[oldKey] !== undefined) {
            match.seatLayout.pricing[newKey] = match.seatLayout.pricing[oldKey];
            delete match.seatLayout.pricing[oldKey];
            changed = true;
          }
        }
      }
      if (match.seatLayout.seats) {
        for (const col of Object.values(match.seatLayout.seats)) {
          for (const row of Object.values(col)) {
            for (const seat of Object.values(row)) {
              if (seat && seat.category) {
                const newCat = CATEGORY_MAP[seat.category];
                if (newCat) {
                  seat.category = newCat;
                  changed = true;
                }
              }
            }
          }
        }
      }
      if (match.seatLayout.sections) {
        for (const section of Object.values(match.seatLayout.sections)) {
          if (section.category) {
            const newCat = CATEGORY_MAP[section.category];
            if (newCat) {
              section.category = newCat;
              changed = true;
            }
          }
        }
      }
    }

    if (changed) {
      await match.save();
      matchCount++;
    }
  }
  console.log(`Migrated ${matchCount} match(es)`);

  console.log('\nMigration complete!');
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
