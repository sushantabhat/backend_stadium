const express = require('express');
const matchController = require('../controllers/matchController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', matchController.listMatches);
router.get('/:id/seats', matchController.getMatchSeats);
router.get('/:id', matchController.getMatch);

router.post('/', authorize('admin'), matchController.createMatch);
router.patch('/:id', authorize('admin'), matchController.updateMatch);
router.delete('/:id', authorize('admin'), matchController.cancelMatch);

module.exports = router;
