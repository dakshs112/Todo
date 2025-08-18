const express = require('express');
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  updateProjectMemberRole,
  getProjectMembers,
  getProjectTasks,
  getProjectStats,
  archiveProject,
  unarchiveProject
} = require('../controllers/projects');

const { 
  protect, 
  requireProjectMember, 
  requireProjectManager,
  requireTeamMember 
} = require('../middleware/auth');

const router = express.Router();

// Public routes (with authentication)
router.use(protect);

// Project CRUD operations
router
  .route('/')
  .get(getProjects)
  .post(createProject);

router
  .route('/:projectId')
  .get(requireProjectMember, getProject)
  .put(requireProjectManager, updateProject)
  .delete(requireProjectManager, deleteProject);

// Project management routes
router.post('/:projectId/members', requireProjectManager, addProjectMember);
router.delete('/:projectId/members/:userId', requireProjectManager, removeProjectMember);
router.put('/:projectId/members/:userId/role', requireProjectManager, updateProjectMemberRole);

// Project information routes
router.get('/:projectId/members', requireProjectMember, getProjectMembers);
router.get('/:projectId/tasks', requireProjectMember, getProjectTasks);
router.get('/:projectId/stats', requireProjectMember, getProjectStats);

// Project archiving
router.post('/:projectId/archive', requireProjectManager, archiveProject);
router.post('/:projectId/unarchive', requireProjectManager, unarchiveProject);

module.exports = router;
