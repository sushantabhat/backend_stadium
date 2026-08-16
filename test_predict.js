const mongoose = require('mongoose');
require('dotenv').config({ path: '/Users/sushant/Desktop/smart-stadium/backend/.env' });
const aiService = require('./src/services/aiService');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const Match = require('./src/models/Match');
    const match = await Match.findOne();
    const result = await aiService.predictAttendance(match._id);
    console.log(JSON.stringify(result, null, 2));
  } catch(e) {
    console.error(e);
  }
  process.exit();
});
