require('dotenv').config();
const mongoose = require('mongoose');
const Match = require('./src/models/Match');
const AttendanceLog = require('./src/models/AttendanceLog');
const StaffShift = require('./src/models/StaffShift');
const Ticket = require('./src/models/Ticket');

async function deleteAllMatches() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-stadium');
    console.log('Connected to DB. Deleting all matches...');
    
    const delMatches = await Match.deleteMany({});
    const delAttendance = await AttendanceLog.deleteMany({});
    const delShifts = await StaffShift.deleteMany({});
    const delTickets = await Ticket.deleteMany({});
    
    console.log(`Deleted ${delMatches.deletedCount} matches.`);
    console.log(`Deleted ${delAttendance.deletedCount} attendance logs.`);
    console.log(`Deleted ${delShifts.deletedCount} staff shifts.`);
    console.log(`Deleted ${delTickets.deletedCount} tickets.`);
    
    console.log('Successfully wiped all matches and related data!');
    process.exit(0);
  } catch (error) {
    console.error('Error deleting matches:', error);
    process.exit(1);
  }
}

deleteAllMatches();
