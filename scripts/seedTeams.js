const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const Team = require('../src/models/Team');

const MOCK_TEAMS = [
  { name: 'Biratnagar Kings', shortName: 'BRK', logoUrl: '', globalRank: null },
  { name: 'Chitwan Rhinos', shortName: 'CHR', logoUrl: '', globalRank: null },
  { name: 'Janakpur Bolts', shortName: 'JAB', logoUrl: '', globalRank: null },
  { name: 'Karnali Yaks', shortName: 'KNY', logoUrl: '', globalRank: null },
  { name: 'Kathmandu Gurkhas', shortName: 'KAG', logoUrl: '', globalRank: null },
  { name: 'Lumbini Lions', shortName: 'LIL', logoUrl: '', globalRank: null },
  { name: 'Pokhara Avengers', shortName: 'PVA', logoUrl: '', globalRank: null },
  { name: 'Sudurpaschim Royals', shortName: 'SWR', logoUrl: '', globalRank: null },
  { name: 'Nepal', shortName: 'NEP', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Flag_of_Nepal.svg/320px-Flag_of_Nepal.svg.png', globalRank: 15 },
  { name: 'United Arab Emirates', shortName: 'UAE', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Flag_of_the_United_Arab_Emirates.svg/320px-Flag_of_the_United_Arab_Emirates.svg.png', globalRank: 16 },
  { name: 'Netherlands', shortName: 'NED', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Flag_of_the_Netherlands.svg/320px-Flag_of_the_Netherlands.svg.png', globalRank: 14 },
  { name: 'India', shortName: 'IND', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/41/Flag_of_India.svg/320px-Flag_of_India.svg.png', globalRank: 1 },
  { name: 'Australia', shortName: 'AUS', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/b9/Flag_of_Australia.svg/320px-Flag_of_Australia.svg.png', globalRank: 2 },
  { name: 'England', shortName: 'ENG', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/be/Flag_of_England.svg/320px-Flag_of_England.svg.png', globalRank: 3 },
  { name: 'West Indies', shortName: 'WI', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a4/Flag_of_the_West_Indies_Federation.svg/320px-Flag_of_the_West_Indies_Federation.svg.png', globalRank: 4 },
  { name: 'New Zealand', shortName: 'NZ', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Flag_of_New_Zealand.svg/320px-Flag_of_New_Zealand.svg.png', globalRank: 5 },
  { name: 'South Africa', shortName: 'SA', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Flag_of_South_Africa.svg/320px-Flag_of_South_Africa.svg.png', globalRank: 6 },
  { name: 'Pakistan', shortName: 'PAK', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Flag_of_Pakistan.svg/320px-Flag_of_Pakistan.svg.png', globalRank: 7 },
  { name: 'Sri Lanka', shortName: 'SL', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Flag_of_Sri_Lanka.svg/320px-Flag_of_Sri_Lanka.svg.png', globalRank: 8 },
  { name: 'Bangladesh', shortName: 'BAN', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Flag_of_Bangladesh.svg/320px-Flag_of_Bangladesh.svg.png', globalRank: 9 },
  { name: 'Afghanistan', shortName: 'AFG', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Flag_of_the_Taliban.svg/320px-Flag_of_the_Taliban.svg.png', globalRank: 10 },
  { name: 'Scotland', shortName: 'SCO', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Flag_of_Scotland.svg/320px-Flag_of_Scotland.svg.png', globalRank: 12 },
  { name: 'Namibia', shortName: 'NAM', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Flag_of_Namibia.svg/320px-Flag_of_Namibia.svg.png', globalRank: 13 },
  { name: 'Oman', shortName: 'OMA', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Flag_of_Oman.svg/320px-Flag_of_Oman.svg.png', globalRank: 17 },
  { name: 'United States', shortName: 'USA', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a4/Flag_of_the_United_States.svg/320px-Flag_of_the_United_States.svg.png', globalRank: 19 },
  { name: 'Canada', shortName: 'CAN', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Flag_of_Canada_%28Pantone%29.svg/320px-Flag_of_Canada_%28Pantone%29.svg.png', globalRank: 20 },
  { name: 'Papua New Guinea', shortName: 'PNG', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Flag_of_Papua_New_Guinea.svg/320px-Flag_of_Papua_New_Guinea.svg.png', globalRank: 21 },
  { name: 'Uganda', shortName: 'UGA', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Flag_of_Uganda.svg/320px-Flag_of_Uganda.svg.png', globalRank: 23 },
  { name: 'Kuwait', shortName: 'KUW', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Flag_of_Kuwait.svg/320px-Flag_of_Kuwait.svg.png', globalRank: 25 },
  { name: 'Qatar', shortName: 'QAT', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Flag_of_Qatar.svg/320px-Flag_of_Qatar.svg.png', globalRank: 26 },
  { name: 'Malaysia', shortName: 'MAS', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Flag_of_Malaysia.svg/320px-Flag_of_Malaysia.svg.png', globalRank: 27 },
  { name: 'Singapore', shortName: 'SIN', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Flag_of_Singapore.svg/320px-Flag_of_Singapore.svg.png', globalRank: 28 },
  { name: 'Saudi Arabia', shortName: 'KSA', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Flag_of_Saudi_Arabia.svg/320px-Flag_of_Saudi_Arabia.svg.png', globalRank: 31 },
  { name: 'Bahrain', shortName: 'BHR', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Flag_of_Bahrain.svg/320px-Flag_of_Bahrain.svg.png', globalRank: 32 }
];

async function seedTeams() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    await Team.deleteMany({});
    console.log('Cleared existing teams.');

    await Team.insertMany(MOCK_TEAMS);
    console.log(`Successfully seeded ${MOCK_TEAMS.length} teams!`);

  } catch (error) {
    console.error('Failed to seed teams:', error);
  } finally {
    mongoose.connection.close();
  }
}

seedTeams();
