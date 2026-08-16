/**
 * Integration Test Script
 * Verifies End-to-End Core Ticketing, Seat Locking, QR Scans, Fraud Flags, and Analytics.
 * Usage: node scripts/testIntegration.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Match = require('../src/models/Match');
const Seat = require('../src/models/Seat');
const Booking = require('../src/models/Booking');
const Ticket = require('../src/models/Ticket');
const AttendanceLog = require('../src/models/AttendanceLog');
const FraudLog = require('../src/models/FraudLog');

const bookingService = require('../src/services/bookingService');
const ticketService = require('../src/services/ticketService');
const adminService = require('../src/services/adminService');

async function runTests() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is missing in backend/.env');
  }

  console.log('🔌 Connecting to database...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected successfully!');

  // 1. Setup Test Users
  console.log('\n--- 1. Setting Up Test Users ---');
  let fan = await User.findOne({ email: 'testfan@stadium.com' });
  if (fan) {
    await User.deleteOne({ email: 'testfan@stadium.com' });
  }
  fan = await User.create({
    name: 'Test Fan',
    email: 'testfan@stadium.com',
    password: 'password123',
    role: 'user',
  });
  console.log(`Created Test Fan: ${fan.email}`);

  let staff = await User.findOne({ email: 'staff@stadium.com' });
  if (!staff) {
    staff = await User.create({
      name: 'Gate Staff',
      email: 'staff@stadium.com',
      password: 'staff123',
      role: 'staff',
    });
  }
  console.log(`Using Gate Staff: ${staff.email}`);

  let admin = await User.findOne({ email: 'admin@stadium.com' });
  if (!admin) {
    admin = await User.create({
      name: 'Stadium Admin',
      email: 'admin@stadium.com',
      password: 'admin123',
      role: 'admin',
    });
  }
  console.log(`Using Admin: ${admin.email}`);

  // 2. Setup Test Match and Seats (using stadiumSections)
  console.log('\n--- 2. Creating Test Match & Seating Layout ---');
  const testMatch = await Match.create({
    title: 'Test Integration Match 2026',
    teamA: 'India',
    teamB: 'Australia',
    venue: 'Wankhede Stadium, Mumbai',
    matchDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    description: 'Special integration test fixture',
    status: 'upcoming',
    createdBy: admin._id,
    pricing: { vip: 1000, category1: 800, category2: 500, category3: 300, category4: 200, supporters: 150 },
    stadiumSections: [
      {
        sectionId: '318',
        category: 'category1',
        label: 'Section 318',
        color: '#FFD700',
        pricePerTicket: 800,
        totalSeats: 4,
        availableSeats: 4,
        rows: ['A', 'B'],
      },
      {
        sectionId: 'VIP1',
        category: 'vip',
        label: 'VIP Box 1',
        color: '#FFB300',
        pricePerTicket: 1000,
        totalSeats: 4,
        availableSeats: 4,
        rows: ['V'],
      },
    ],
    totalSeats: 8,
  });
  console.log(`Created Match: "${testMatch.title}"`);

  // Build seats manually for the test match
  const seats = [];
  const sections = testMatch.stadiumSections;
  for (const section of sections) {
    for (const rowLabel of section.rows) {
      const seatsPerRow = Math.ceil(section.totalSeats / section.rows.length);
      for (let seatNumber = 1; seatNumber <= seatsPerRow; seatNumber++) {
        seats.push({
          match: testMatch._id,
          sectionId: section.sectionId,
          seatLabel: `${section.sectionId}-${rowLabel}-${seatNumber}`,
          row: rowLabel,
          number: seatNumber,
          category: section.category,
          price: section.pricePerTicket,
          status: 'available',
        });
      }
    }
  }
  const createdSeats = await Seat.insertMany(seats);
  console.log(`Generated ${createdSeats.length} test seats.`);

  // 3. Test Seat Locking System
  console.log('\n--- 3. Testing Seat Locking System ---');
  const targetSeat = createdSeats[0]; // VIP1-V-1
  const seatIds = [targetSeat._id];

  console.log(`Locking seat ${targetSeat.seatLabel} for Fan...`);
  const lockedSeats = await bookingService.lockSeats(fan._id.toString(), testMatch._id.toString(), seatIds);

  const checkedSeat = await Seat.findById(targetSeat._id);
  if (checkedSeat.status !== 'locked' || checkedSeat.lockedBy.toString() !== fan._id.toString()) {
    throw new Error('Lock assert failed! Seat status is not locked or lockedBy is incorrect');
  }
  console.log('🟢 Seat locking verification passed.');

  // Try to lock the same seat with another user (should throw conflict error)
  console.log('Attempting to double lock held seat (Should throw error)...');
  try {
    await bookingService.lockSeats(staff._id.toString(), testMatch._id.toString(), seatIds);
    throw new Error('Double lock failure: allowed locking already locked seat!');
  } catch (error) {
    if (error.statusCode === 409) {
      console.log(`🟢 Successfully blocked double-lock: "${error.message}"`);
    } else {
      throw error;
    }
  }

  // 4. Test Booking Confirmation
  console.log('\n--- 4. Confirming Seat Booking ---');
  const bookingResult = await bookingService.confirmBooking(
    fan._id.toString(),
    testMatch._id.toString(),
    seatIds
  );

  const bookedSeat = await Seat.findById(targetSeat._id);
  if (bookedSeat.status !== 'booked') {
    throw new Error('Booking assert failed! Seat status is not booked');
  }
  console.log(`🟢 Seat successfully marked as booked in DB.`);
  console.log(`Generated Ticket Code: ${bookingResult.tickets[0].ticketCode}`);

  // 5. Test QR Ticket Validation
  console.log('\n--- 5. Testing QR Ticket Entry Scan ---');
  const ticketCode = bookingResult.tickets[0].ticketCode;

  console.log(`Scanning ticket ${ticketCode} at gate by staff...`);
  const scanResult = await ticketService.verifyTicket(staff._id.toString(), ticketCode);
  if (!scanResult.ticket || scanResult.ticket.status !== 'used' || !scanResult.ticket.usedAt) {
    throw new Error('Scan validation assertion failed');
  }
  console.log('🟢 Initial entry scan approved successfully.');

  // 6. Test Fraud/Duplicate Detection
  console.log('\n--- 6. Testing AI Duplicate Scan Fraud Detection ---');
  try {
    await ticketService.verifyTicket(staff._id.toString(), ticketCode);
    throw new Error('Failure: allowed entry for duplicate scan!');
  } catch (error) {
    if (error.statusCode === 409) {
      console.log(`🟢 Successfully blocked duplicate entry scan: "${error.message}"`);
    } else {
      throw error;
    }
  }

  // Assert fraud log exists
  const fraudRecord = await FraudLog.findOne({ ticketCode, reason: 'duplicate_scan' });
  if (!fraudRecord) {
    throw new Error('Fraud check failed! No fraud entry created in DB');
  }
  console.log(`🟢 AI Fraud check passed: Logged fraud log with details: "${fraudRecord.details}"`);

  // 7. Test Admin Analytics
  console.log('\n--- 7. Auditing Admin Analytics Summary ---');
  const analytics = await adminService.getAdminAnalytics();
  console.log(`Total Revenue Checked: ₹${analytics.totalRevenue}`);
  console.log(`Entry Checkin Rate: ${analytics.attendance.entryRate}%`);

  if (analytics.totalRevenue < targetSeat.price) {
    throw new Error(`Analytics revenue assert failed! Expected at least ₹${targetSeat.price}, got ₹${analytics.totalRevenue}`);
  }
  console.log('🟢 Admin analytics ledger tests passed.');

  // 8. Clean up
  console.log('\n🧹 Cleaning up test data...');
  await Ticket.deleteMany({ match: testMatch._id });
  await Seat.deleteMany({ match: testMatch._id });
  await Booking.deleteMany({ match: testMatch._id });
  await AttendanceLog.deleteMany({ match: testMatch._id });
  await FraudLog.deleteMany({ match: testMatch._id });
  await Match.findByIdAndDelete(testMatch._id);
  await User.findByIdAndDelete(fan._id);
  console.log('🟢 Cleanup complete.');

  console.log('\n🏆 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
}

runTests()
  .then(() => {
    mongoose.disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error('🚨 INTEGRATION TEST RUN FAILED:', err);
    mongoose.disconnect();
    process.exit(1);
  });
