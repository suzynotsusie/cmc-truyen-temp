const express = require('express');

const storyController = require('../controllers/storyController');
const chapterController = require('../controllers/chapterController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRole } = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', storyController.getAllStories);
router.get('/mine', authenticateToken, authorizeRole('Uploader', 'Admin'), storyController.getMyStories);
router.get('/search', storyController.searchStories);
router.get('/:id', storyController.getStoryById);
router.post('/', authenticateToken, authorizeRole('Uploader', 'Admin'), storyController.createStory);
router.put('/:id', authenticateToken, authorizeRole('Uploader', 'Admin'), storyController.updateStory);
router.delete('/:id', authenticateToken, authorizeRole('Uploader', 'Admin'), storyController.deleteStory);

router.get('/:storyId/chapters', chapterController.getChapters);
router.get('/:storyId/chapters/:chapterId', chapterController.getChapterById);
router.post('/:storyId/chapters', authenticateToken, authorizeRole('Uploader', 'Admin'), chapterController.createChapter);
router.put('/:storyId/chapters/:chapterId', authenticateToken, authorizeRole('Uploader', 'Admin'), chapterController.updateChapter);
router.delete('/:storyId/chapters/:chapterId', authenticateToken, authorizeRole('Uploader', 'Admin'), chapterController.deleteChapter);

module.exports = router;