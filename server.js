const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const authRoutes = require('./src/routes/authRoutes');
const matchRoutes = require('./src/routes/matchRoutes');
const errorMiddleware = require('./src/middlewares/errorMiddleware');

const envResult = require('dotenv').config({
  path: path.join(__dirname, '.env'),
  override: true,
});

const app = express();
const port = Number(process.env.PORT || 5001);
const mongoUri = envResult.parsed?.MONGO_URI || process.env.MONGO_URI;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Smart Stadium backend is running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(errorMiddleware);

async function startServer() {
  try {
    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined in the environment');
    }

    await mongoose.connect(mongoUri);
    console.log('🚀 Successfully connected to MongoDB Atlas cloud database!');

    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`📡 Server is live and listening on port ${port}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. macOS may reserve 5000 for AirPlay/AirTunes. Set PORT to an available port if needed.`);
      } else {
        console.error('Server error:', err);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to start backend server:', error.message);
    process.exit(1);
  }
}

startServer();