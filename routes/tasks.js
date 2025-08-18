const express = require('express');
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  assignTask,
  unassignTask,
  addTimeEntry,
  addComment,
  addChecklistItem,
  completeChecklistItem,
  addWatcher,
  removeWatcher,
  getTaskComments,
  getTaskTimeEntries
} = require('../controllers/tasks');

const { 
  protect, 
  requireProjectMember 
} = require('../middleware/auth');

const router = express.Router();

// Public routes (with authentication)
router.use(protect);

// Task CRUD operations
router
  .route('/')
  .get(getTasks)
  .post(createTask);

router
  .route('/:taskId')
  .get(getTask)
  .put(updateTask)
  .delete(deleteTask);

// Task assignment
router.post('/:taskId/assign', assignTask);
router.post('/:taskId/unassign', unassignTask);

// Task time tracking
router.post('/:taskId/time', addTimeEntry);
router.get('/:taskId/time', getTaskTimeEntries);

// Task comments
router.post('/:taskId/comments', addComment);
router.get('/:taskId/comments', getTaskComments);

// Task checklist
router.post('/:taskId/checklist', addChecklistItem);
router.put('/:taskId/checklist/:itemId/complete', completeChecklistItem);

// Task watchers
router.post('/:taskId/watchers', addWatcher);
router.delete('/:taskId/watchers/:userId', removeWatcher);

module.exports = router;
