require('dotenv').config();
const mongoose = require('mongoose');
const Match = require('./src/models/Match');
const Team = require('./src/models/Team');
const Venue = require('./src/models/Venue');
const User = require('./src/models/User');
const AttendanceLog = require('./src/models/AttendanceLog');
const StaffShift = require('./src/models/StaffShift');
const Ticket = require('./src/models/Ticket');

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

async function resetDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-stadium');
    console.log('Connected to DB. Wiping old data...');
    
    await Match.deleteMany({});
    await Team.deleteMany({});
    await Venue.deleteMany({});
    await AttendanceLog.deleteMany({});
    await StaffShift.deleteMany({});
    await Ticket.deleteMany({});
    
    console.log('Seeding Teams...');
    await Team.insertMany(REAL_NPL_TEAMS);
    
    console.log('Seeding Venues...');
    const adminUser = await User.findOne({ role: { $in: ['admin', 'supervisor'] } });
    if (!adminUser) {
      console.log('No admin user found. Creating dummy admin...');
      throw new Error("No admin user found!");
    }
    
    const venuesToInsert = NPL_VENUES.map(v => ({ ...v, createdBy: adminUser._id }));
    await Venue.insertMany(venuesToInsert);
    
    console.log('Seeding Demo Matches...');
    const teams = await Team.find();
    const venues = await Venue.find();
    
    const today = new Date();
    today.setHours(18, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const matches = [
      {
        title: 'NPL Season Opener', // removed redundant team names
        teamA: 'Biratnagar Kings',
        teamB: 'Chitwan Rhinos',
        matchDate: today,
        venue: venues.find(v => v.name === 'Biratnagar Stadium').name,
        status: 'live',
        totalTickets: 25000,
        createdBy: adminUser._id
      },
      {
        title: 'Rivalry Clash', // removed redundant team names
        teamA: 'Janakpur Bolts',
        teamB: 'Karnali Yaks',
        matchDate: tomorrow,
        venue: venues.find(v => v.name === 'TU Cricket Ground').name,
        status: 'upcoming',
        totalTickets: 20000,
        createdBy: adminUser._id
      }
    ];
    
    await Match.insertMany(matches);
    console.log('Successfully reset database and seeded demo data!');
    process.exit(0);
  } catch (error) {
    console.error('Error in reset script:', error);
    process.exit(1);
  }
}

resetDB();
