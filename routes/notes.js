const express = require('express');
const { 
  getNotes, 
  getNote, 
  createNote, 
  updateNote, 
  deleteNote 
} = require('../controllers/notes');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected and require authentication
router.use(protect);

router
  .route('/')
  .get(getNotes)
  .post(createNote);

router
  .route('/:id')
  .get(getNote)
  .put(updateNote)
  .delete(deleteNote);

module.exports = router;
