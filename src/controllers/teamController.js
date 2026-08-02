const Team = require('../models/Team');

exports.getAllTeams = async (req, res, next) => {
  try {
    const teams = await Team.find().sort({ name: 1 });
    res.json(teams);
  } catch (error) {
    next(error);
  }
};

exports.createTeam = async (req, res, next) => {
  try {
    const { name, shortName, logoUrl, franchiseTier, homeCity } = req.body;
    if (!name || !shortName) {
      return res.status(400).json({ message: 'Name and shortName are required.' });
    }
    const team = await Team.create({ name, shortName, logoUrl, franchiseTier, homeCity });
    res.status(201).json(team);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Team already exists.' });
    }
    next(error);
  }
};
