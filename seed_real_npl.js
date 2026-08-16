require('dotenv').config();
const mongoose = require('mongoose');
const Team = require('./src/models/Team');

const REAL_NPL_TEAMS = [
  { name: 'Biratnagar Kings', shortName: 'BK', franchiseTier: 1, homeCity: 'Biratnagar' },
  { name: 'Chitwan Rhinos', shortName: 'CR', franchiseTier: 2, homeCity: 'Chitwan' },
  { name: 'Janakpur Bolts', shortName: 'JB', franchiseTier: 2, homeCity: 'Janakpur' },
  { name: 'Karnali Yaks', shortName: 'KY', franchiseTier: 3, homeCity: 'Karnali' },
  { name: 'Kathmandu Gurkhas', shortName: 'KG', franchiseTier: 1, homeCity: 'Kathmandu' },
  { name: 'Lumbini Lions', shortName: 'LL', franchiseTier: 1, homeCity: 'Lumbini' },
  { name: 'Pokhara Avengers', shortName: 'PA', franchiseTier: 2, homeCity: 'Pokhara' },
  { name: 'Sudurpaschim Royals', shortName: 'SR', franchiseTier: 3, homeCity: 'Dhangadhi' }
];

async function seedTeams() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-stadium');
    
    // Clear all existing teams
    await Team.deleteMany({});
    console.log('Cleared incorrect/old teams.');
    
    // Insert official NPL teams
    await Team.insertMany(REAL_NPL_TEAMS);
    console.log('Successfully seeded official 2024 NPL franchises.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding teams:', error);
    process.exit(1);
  }
}

seedTeams();
