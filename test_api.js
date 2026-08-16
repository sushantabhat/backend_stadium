require('dotenv').config();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

async function test() {
  const token = jwt.sign(
    { id: new mongoose.Types.ObjectId().toString(), role: 'supervisor' }, 
    process.env.JWT_SECRET || 'fallback_secret', 
    { expiresIn: '1h' }
  );
  
  try {
    const res = await fetch('http://localhost:5009/api/admin/locked-seats', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const text = await res.text();
    console.log('STATUS:', res.status, text);
  } catch (err) {
    console.log('ERROR:', err);
  }
}
test();
