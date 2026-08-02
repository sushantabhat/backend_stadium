require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('./src/models/Venue');
const User = require('./src/models/User');

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
      if (!existing) {
        await Venue.create({
          name: venueData.name,
          location: venueData.location,
          createdBy: adminUser._id
        });
        console.log(`Created venue for ${venueData.location}: ${venueData.name}`);
      } else {
        console.log(`Venue for ${venueData.location} already exists.`);
      }
    }
    
    console.log('Successfully seeded NPL home venues.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding venues:', error);
    process.exit(1);
  }
}

seedVenues();
