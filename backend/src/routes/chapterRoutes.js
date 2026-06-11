const express = require('express');

const readingHistoryController = require('../controllers/readingHistoryController');

const router = express.Router();

router.get('/:id/summary', readingHistoryController.getChapterSummary);

module.exports = router;