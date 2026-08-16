require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('./src/models/Venue');
const User = require('./src/models/User');
const { STADIUM_SECTIONS } = require('./scripts/stadiumLayout');

const VENUE_PRICING = {
  platinum: 1000,
  gold: 500,
  silver: 400,
  bronze: 300,
  general: 200,
  supporters: 100,
};

const NPL_VENUES = [
  { name: 'Biratnagar Stadium', location: 'Biratnagar' },
  { name: 'Chitwan Cricket Ground', location: 'Chitwan' },
  { name: 'Janakpur Ram Janaki Stadium', location: 'Janakpur' },
  { name: 'Surkhet Regional Stadium', location: 'Karnali' },
  { name: 'TU Cricket Ground', location: 'Kathmandu' },
  { name: 'Lumbini International Cricket Ground', location: 'Lumbini' },
  { name: 'Pokhara Rangasala', location: 'Pokhara' },
  { name: 'Dhangadhi Fapla Ground', location: 'Dhangadhi' }
];

function getSectionsWithPricing() {
  return STADIUM_SECTIONS.map((s) => ({
    sectionId: s.sectionId,
    category: s.category,
    label: s.label,
    color: s.color,
    polygon: s.polygon,
    labelX: s.labelX,
    labelY: s.labelY,
    rows: s.rows,
    totalSeats: s.totalSeats,
    pricePerTicket: VENUE_PRICING[s.category] || 200,
  }));
}

async function seedVenues() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-stadium');
    
    const adminUser = await User.findOne({ role: { $in: ['admin', 'supervisor'] } });
    if (!adminUser) {
      console.error('No admin or supervisor user found to assign as venue creator.');
      process.exit(1);
    }
    
    console.log('Found admin:', adminUser.email);

    for (const venueData of NPL_VENUES) {
      const existing = await Venue.findOne({ location: venueData.location });
      if (existing) {
        existing.pricing = VENUE_PRICING;
        existing.stadiumSections = getSectionsWithPricing();
        await existing.save();
        console.log(`Updated: ${existing.name} (${existing.stadiumSections.length} sections)`);
      } else {
        await Venue.create({
          name: venueData.name,
          location: venueData.location,
          pricing: VENUE_PRICING,
          stadiumSections: getSectionsWithPricing(),
          createdBy: adminUser._id
        });
        console.log(`Created: ${venueData.name} (${STADIUM_SECTIONS.length} sections)`);
      }
    }
    
    console.log('Done — all venues updated with correct sections and pricing.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding venues:', error);
    process.exit(1);
  }
}

seedVenues();
