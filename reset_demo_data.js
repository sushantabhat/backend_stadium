// reset_demo_data.js
const mongoose = require('mongoose');
require('dotenv').config();
const Match = require('./src/models/Match');
const Venue = require('./src/models/Venue');
const User = require('./src/models/User');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-stadium');
  console.log('Connected to DB');
  await Match.deleteMany({});
  await Venue.deleteMany({});
  console.log('Deleted all matches and venues');
  const owner = await User.findOne();
  if (!owner) { console.error('No user found'); process.exit(1); }
  const venues = [
    {name:'Dasarath Rangasala Stadium',location:'Kathmandu, Nepal',pricing:{platinum:1500,gold:1000,silver:500,bronze:250,general:100},stadiumSections:[],gates:[],createdBy:owner._id},
    {name:'Pokhara Cricket Ground',location:'Pokhara, Nepal',pricing:{platinum:1200,gold:800,silver:400,bronze:200,general:80},stadiumSections:[],gates:[],createdBy:owner._id},
    {name:'Bharatpur International Cricket Stadium',location:'Bharatpur, Nepal',pricing:{platinum:1300,gold:900,silver:450,bronze:220,general:90},stadiumSections:[],gates:[],createdBy:owner._id},
    {name:'Dharan Cricket Stadium',location:'Dharan, Nepal',pricing:{platinum:1100,gold:750,silver:350,bronze:180,general:70},stadiumSections:[],gates:[],createdBy:owner._id},
    {name:'Biratnagar Cricket Stadium',location:'Biratnagar, Nepal',pricing:{platinum:1150,gold:770,silver:360,bronze:190,general:75},stadiumSections:[],gates:[],createdBy:owner._id},
    {name:'Janakpur Cricket Ground',location:'Janakpur, Nepal',pricing:{platinum:1000,gold:650,silver:300,bronze:150,general:60},stadiumSections:[],gates:[],createdBy:owner._id},
    {name:'Chitwan Cricket Venue',location:'Chitwan, Nepal',pricing:{platinum:1050,gold:680,silver:320,bronze:160,general:65},stadiumSections:[],gates:[],createdBy:owner._id},
    {name:'Lalitpur Sports Complex',location:'Lalitpur, Nepal',pricing:{platinum:1200,gold:800,silver:400,bronze:200,general:80},stadiumSections:[],gates:[],createdBy:owner._id}
  ];
  await Venue.insertMany(venues);
  console.log('Inserted 8 Nepal venues');
  process.exit(0);
}
run().catch(err=>{console.error('Error:',err);process.exit(1);});
