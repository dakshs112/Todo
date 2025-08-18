const Team = require('../models/Team');
const User = require('../models/User');
const Project = require('../models/Project');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get all teams for user
// @route   GET /api/v1/teams
// @access  Private
exports.getTeams = asyncHandler(async (req, res, next) => {
  let query;

  if (req.user.role === 'admin') {
    // Admin can see all teams
    query = Team.find();
  } else {
    // Users can only see teams they're part of
    query = Team.find({
      $or: [
        { owner: req.user.id },
        { 'members.user': req.user.id }
      ]
    });
  }

  const teams = await query
    .populate('owner', 'name email')
    .populate('members.user', 'name email role')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: teams.length,
    data: teams
  });
});

// @desc    Get single team
// @route   GET /api/v1/teams/:teamId
// @access  Private (Team Member)
exports.getTeam = asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.teamId)
    .populate('owner', 'name email role')
    .populate('members.user', 'name email role')
    .populate('members.invitedBy', 'name email');

  if (!team) {
    return next(new ErrorResponse('Team not found', 404));
  }

  res.status(200).json({
    success: true,
    data: team
  });
});

// @desc    Create new team
// @route   POST /api/v1/teams
// @access  Private (with canCreateTeams permission)
exports.createTeam = asyncHandler(async (req, res, next) => {
  console.log('Creating team with data:', req.body);
  console.log('User:', req.user.id);

  const { name, description, isPrivate, color } = req.body;

  // Validate required fields
  if (!name || name.trim() === '') {
    return next(new ErrorResponse('Team name is required', 400));
  }

  // Create team
  const team = await Team.create({
    name: name.trim(),
    description: description ? description.trim() : '',
    isPrivate: isPrivate || false,
    color: color || '#6366f1',
    owner: req.user.id,
    members: [{
      user: req.user.id,
      role: 'owner',
      permissions: {
        canInviteMembers: true,
        canManageProjects: true,
        canViewAllTasks: true,
        canManageTasks: true
      }
    }]
  });

  console.log('Team created:', team._id);

  // Add team to user's teams
  await User.findByIdAndUpdate(req.user.id, {
    $push: {
      teams: {
        team: team._id,
        role: 'owner'
      }
    },
    activeTeam: team._id
  });

  const populatedTeam = await Team.findById(team._id)
    .populate('owner', 'name email')
    .populate('members.user', 'name email role');

  res.status(201).json({
    success: true,
    data: populatedTeam
  });
});

// @desc    Update team
// @route   PUT /api/v1/teams/:teamId
// @access  Private (Team Manager)
exports.updateTeam = asyncHandler(async (req, res, next) => {
  const { name, description, isPrivate, color, settings } = req.body;

  const team = await Team.findByIdAndUpdate(
    req.params.teamId,
    {
      name,
      description,
      isPrivate,
      color,
      settings
    },
    {
      new: true,
      runValidators: true
    }
  ).populate('owner', 'name email')
   .populate('members.user', 'name email role');

  res.status(200).json({
    success: true,
    data: team
  });
});

// @desc    Delete team
// @route   DELETE /api/v1/teams/:teamId
// @access  Private (Team Owner or Admin)
exports.deleteTeam = asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.teamId);

  if (!team) {
    return next(new ErrorResponse('Team not found', 404));
  }

  // Only team owner or admin can delete team
  if (team.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to delete this team', 403));
  }

  // Remove team from all users
  await User.updateMany(
    { 'teams.team': team._id },
    {
      $pull: { teams: { team: team._id } },
      $unset: { activeTeam: team._id }
    }
  );

  // Delete all projects associated with this team
  await Project.deleteMany({ team: team._id });

  await team.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Join team
// @route   POST /api/v1/teams/:teamId/join
// @access  Private
exports.joinTeam = asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.teamId);

  if (!team) {
    return next(new ErrorResponse('Team not found', 404));
  }

  // Check if team is private
  if (team.isPrivate) {
    return next(new ErrorResponse('Cannot join private team without invitation', 403));
  }

  // Check if user is already a member
  if (team.isMember(req.user.id)) {
    return next(new ErrorResponse('You are already a member of this team', 400));
  }

  // Add user to team
  await team.addMember(req.user.id, 'member');

  // Add team to user's teams
  await User.findByIdAndUpdate(req.user.id, {
    $push: {
      teams: {
        team: team._id,
        role: 'member'
      }
    }
  });

  res.status(200).json({
    success: true,
    message: 'Successfully joined team'
  });
});

// @desc    Leave team
// @route   POST /api/v1/teams/:teamId/leave
// @access  Private (Team Member)
exports.leaveTeam = asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.teamId);

  if (!team) {
    return next(new ErrorResponse('Team not found', 404));
  }

  // Team owner cannot leave team
  if (team.owner.toString() === req.user.id) {
    return next(new ErrorResponse('Team owner cannot leave team. Transfer ownership first.', 400));
  }

  // Remove user from team
  await team.removeMember(req.user.id);

  // Remove team from user's teams
  await User.findByIdAndUpdate(req.user.id, {
    $pull: { teams: { team: team._id } },
    $unset: { activeTeam: team._id }
  });

  res.status(200).json({
    success: true,
    message: 'Successfully left team'
  });
});

// @desc    Invite member to team
// @route   POST /api/v1/teams/:teamId/invite
// @access  Private (Team Manager)
exports.inviteMember = asyncHandler(async (req, res, next) => {
  const { email, role = 'member' } = req.body;
  const team = await Team.findById(req.params.teamId);

  if (!team) {
    return next(new ErrorResponse('Team not found', 404));
  }

  // Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Check if user is already a member
  if (team.isMember(user._id)) {
    return next(new ErrorResponse('User is already a member of this team', 400));
  }

  // Add user to team
  await team.addMember(user._id, role, req.user.id);

  // Add team to user's teams
  await User.findByIdAndUpdate(user._id, {
    $push: {
      teams: {
        team: team._id,
        role: role
      }
    }
  });

  res.status(200).json({
    success: true,
    message: 'User invited successfully'
  });
});

// @desc    Remove member from team
// @route   DELETE /api/v1/teams/:teamId/members/:userId
// @access  Private (Team Manager)
exports.removeMember = asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.teamId);
  const { userId } = req.params;

  if (!team) {
    return next(new ErrorResponse('Team not found', 404));
  }

  // Cannot remove team owner
  if (team.owner.toString() === userId) {
    return next(new ErrorResponse('Cannot remove team owner', 400));
  }

  // Remove user from team
  await team.removeMember(userId);

  // Remove team from user's teams
  await User.findByIdAndUpdate(userId, {
    $pull: { teams: { team: team._id } },
    $unset: { activeTeam: team._id }
  });

  res.status(200).json({
    success: true,
    message: 'Member removed successfully'
  });
});

// @desc    Update member role
// @route   PUT /api/v1/teams/:teamId/members/:userId/role
// @access  Private (Team Manager)
exports.updateMemberRole = asyncHandler(async (req, res, next) => {
  const { role } = req.body;
  const team = await Team.findById(req.params.teamId);
  const { userId } = req.params;

  if (!team) {
    return next(new ErrorResponse('Team not found', 404));
  }

  // Cannot change owner role
  if (team.owner.toString() === userId) {
    return next(new ErrorResponse('Cannot change team owner role', 400));
  }

  // Update member role in team
  await team.updateMemberRole(userId, role);

  // Update role in user's teams
  await User.findOneAndUpdate(
    { _id: userId, 'teams.team': team._id },
    { $set: { 'teams.$.role': role } }
  );

  res.status(200).json({
    success: true,
    message: 'Member role updated successfully'
  });
});

// @desc    Get team members
// @route   GET /api/v1/teams/:teamId/members
// @access  Private (Team Member)
exports.getTeamMembers = asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.teamId)
    .populate('members.user', 'name email role avatar')
    .populate('members.invitedBy', 'name email');

  if (!team) {
    return next(new ErrorResponse('Team not found', 404));
  }

  res.status(200).json({
    success: true,
    data: team.members
  });
});

// @desc    Get team projects
// @route   GET /api/v1/teams/:teamId/projects
// @access  Private (Team Member)
exports.getTeamProjects = asyncHandler(async (req, res, next) => {
  const projects = await Project.find({ team: req.params.teamId })
    .populate('owner', 'name email')
    .populate('members.user', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: projects.length,
    data: projects
  });
});

// @desc    Get team statistics
// @route   GET /api/v1/teams/:teamId/stats
// @access  Private (Team Member)
exports.getTeamStats = asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.teamId);

  if (!team) {
    return next(new ErrorResponse('Team not found', 404));
  }

  // Update team stats
  await team.updateStats();

  res.status(200).json({
    success: true,
    data: team.stats
  });
});
