require('dotenv').config();
const mongoose = require('mongoose');
const Team = require('./src/models/Team');

const NPL_TEAMS = [
  { name: 'Kathmandu Kings', shortName: 'KK', franchiseTier: 1, homeCity: 'Kathmandu' },
  { name: 'Lalitpur Patriots', shortName: 'LP', franchiseTier: 1, homeCity: 'Lalitpur' },
  { name: 'Pokhara Rhinos', shortName: 'PR', franchiseTier: 2, homeCity: 'Pokhara' },
  { name: 'Chitwan Tigers', shortName: 'CT', franchiseTier: 2, homeCity: 'Chitwan' },
  { name: 'Bhairahawa Gladiators', shortName: 'BG', franchiseTier: 2, homeCity: 'Bhairahawa' },
  { name: 'Biratnagar Warriors', shortName: 'BW', franchiseTier: 3, homeCity: 'Biratnagar' },
  { name: 'Janakpur Royals', shortName: 'JR', franchiseTier: 3, homeCity: 'Janakpur' },
  { name: 'Far West United', shortName: 'FWU', franchiseTier: 3, homeCity: 'Dhangadhi' }
];

async function seedTeams() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-stadium');
    
    // Clear all existing teams
    await Team.deleteMany({});
    console.log('Cleared old teams.');
    
    // Insert NPL teams
    await Team.insertMany(NPL_TEAMS);
    console.log('Successfully seeded NPL teams.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding teams:', error);
    process.exit(1);
  }
}

seedTeams();
