require('dotenv').config();
const mongoose = require('mongoose');
const Match = require('./src/models/Match');
const Team = require('./src/models/Team');
const Venue = require('./src/models/Venue');
const User = require('./src/models/User');
const AttendanceLog = require('./src/models/AttendanceLog');
const StaffShift = require('./src/models/StaffShift');
const Ticket = require('./src/models/Ticket');

async function seedDemoMatches() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-stadium');
    
    console.log('Clearing old data...');
    await Match.deleteMany({});
    await AttendanceLog.deleteMany({});
    await StaffShift.deleteMany({});
    await Ticket.deleteMany({});

    console.log('Fetching NPL Teams & Venues...');
    const teams = await Team.find();
    const venues = await Venue.find();

    if (teams.length < 2 || venues.length < 1) {
      console.log('Please run seed_real_npl.js and seed_venues.js first.');
      process.exit(1);
    }
    
    const adminUser = await User.findOne({ role: { $in: ['admin', 'supervisor'] } });
    if (!adminUser) {
      console.log('No admin user found to associate with matches.');
      process.exit(1);
    }

    const today = new Date();
    today.setHours(18, 0, 0, 0); // Tonight 6 PM

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const matches = [
      {
        title: 'NPL Season Opener: ' + teams[0].name + ' vs ' + teams[1].name,
        teamA: teams[0].name,
        teamB: teams[1].name,
        matchDate: today,
        venue: venues[0].name,
        status: 'live',
        totalTickets: 25000,
        createdBy: adminUser._id
      },
      {
        title: 'Rivalry Clash: ' + teams[2].name + ' vs ' + teams[3].name,
        teamA: teams[2].name,
        teamB: teams[3].name,
        matchDate: tomorrow,
        venue: venues[1].name,
        status: 'upcoming',
        totalTickets: 20000,
        createdBy: adminUser._id
      }
    ];

    await Match.insertMany(matches);
    console.log('Demo matches seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

seedDemoMatches();
