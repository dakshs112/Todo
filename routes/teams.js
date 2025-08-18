const express = require('express');
const {
  getTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  joinTeam,
  leaveTeam,
  inviteMember,
  removeMember,
  updateMemberRole,
  getTeamMembers,
  getTeamProjects,
  getTeamStats
} = require('../controllers/teams');

const { 
  protect, 
  requireTeamMember, 
  requireTeamManager,
  requirePermission 
} = require('../middleware/auth');

const router = express.Router();

// Public routes (with authentication)
router.use(protect);

// Team CRUD operations
router
  .route('/')
  .get(getTeams)
  .post(createTeam);

router
  .route('/:teamId')
  .get(requireTeamMember, getTeam)
  .put(requireTeamManager, updateTeam)
  .delete(requireTeamManager, deleteTeam);

// Team membership routes
router.post('/:teamId/join', joinTeam);
router.post('/:teamId/leave', requireTeamMember, leaveTeam);

// Team management routes (require team manager permissions)
router.post('/:teamId/invite', requireTeamManager, inviteMember);
router.delete('/:teamId/members/:userId', requireTeamManager, removeMember);
router.put('/:teamId/members/:userId/role', requireTeamManager, updateMemberRole);

// Team information routes
router.get('/:teamId/members', requireTeamMember, getTeamMembers);
router.get('/:teamId/projects', requireTeamMember, getTeamProjects);
router.get('/:teamId/stats', requireTeamMember, getTeamStats);

module.exports = router;
