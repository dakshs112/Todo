const Project = require('../models/Project');
const Team = require('../models/Team');
const User = require('../models/User');
const Task = require('../models/Task');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get all projects for user
// @route   GET /api/v1/projects
// @access  Private
exports.getProjects = asyncHandler(async (req, res, next) => {
  let query;

  if (req.user.role === 'admin') {
    // Admin can see all projects
    query = Project.find();
  } else {
    // Users can see projects they're part of or from their teams
    const userTeams = req.user.teams.map(t => t.team);
    
    query = Project.find({
      $or: [
        { owner: req.user.id },
        { 'members.user': req.user.id },
        { team: { $in: userTeams } }
      ]
    });
  }

  const projects = await query
    .populate('team', 'name color')
    .populate('owner', 'name email')
    .populate('members.user', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: projects.length,
    data: projects
  });
});

// @desc    Get single project
// @route   GET /api/v1/projects/:projectId
// @access  Private (Project Member)
exports.getProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.projectId)
    .populate('team', 'name color members')
    .populate('owner', 'name email role')
    .populate('members.user', 'name email role');

  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  res.status(200).json({
    success: true,
    data: project
  });
});

// @desc    Create new project
// @route   POST /api/v1/projects
// @access  Private
exports.createProject = asyncHandler(async (req, res, next) => {
  console.log('Creating project with data:', req.body);
  console.log('User:', req.user.id);

  const {
    title,
    description,
    team,
    startDate,
    endDate,
    deadline,
    priority,
    visibility,
    budget,
    client,
    tags
  } = req.body;

  // Validate required fields
  if (!title || title.trim() === '') {
    return next(new ErrorResponse('Project title is required', 400));
  }

  // Verify team exists and user has access (if team is specified)
  let teamDoc = null;
  if (team && team.trim() !== '') {
    teamDoc = await Team.findById(team);
    if (!teamDoc) {
      return next(new ErrorResponse('Team not found', 404));
    }

    // Check if user is team member or has permission
    if (!teamDoc.isMember(req.user.id) && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to create projects in this team', 403));
    }
  }

  // Create project
  const projectData = {
    title,
    description,
    owner: req.user.id,
    startDate: startDate || new Date(), // Default to current date if not provided
    endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default to 30 days from now
    deadline,
    priority: priority || 'medium',
    visibility: visibility || 'team',
    budget,
    client,
    tags,
    members: [{
      user: req.user.id,
      role: 'lead',
      permissions: {
        canEditProject: true,
        canManageTasks: true,
        canInviteMembers: true
      }
    }]
  };

  // Only add team if it's specified and not empty
  if (team && team.trim() !== '') {
    projectData.team = team;
  }

  const project = await Project.create(projectData);

  const populatedProject = await Project.findById(project._id)
    .populate('team', 'name color')
    .populate('owner', 'name email')
    .populate('members.user', 'name email');

  res.status(201).json({
    success: true,
    data: populatedProject
  });
});

// @desc    Update project
// @route   PUT /api/v1/projects/:projectId
// @access  Private (Project Manager)
exports.updateProject = asyncHandler(async (req, res, next) => {
  const {
    title,
    description,
    startDate,
    endDate,
    deadline,
    priority,
    status,
    visibility,
    budget,
    client,
    tags,
    settings
  } = req.body;

  const project = await Project.findByIdAndUpdate(
    req.params.projectId,
    {
      title,
      description,
      startDate,
      endDate,
      deadline,
      priority,
      status,
      visibility,
      budget,
      client,
      tags,
      settings
    },
    {
      new: true,
      runValidators: true
    }
  ).populate('team', 'name color')
   .populate('owner', 'name email')
   .populate('members.user', 'name email');

  res.status(200).json({
    success: true,
    data: project
  });
});

// @desc    Delete project
// @route   DELETE /api/v1/projects/:projectId
// @access  Private (Project Owner or Admin)
exports.deleteProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.projectId);

  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Only project owner or admin can delete project
  if (project.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to delete this project', 403));
  }

  // Delete all tasks associated with this project
  await Task.deleteMany({ project: project._id });

  await project.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Add member to project
// @route   POST /api/v1/projects/:projectId/members
// @access  Private (Project Manager)
exports.addProjectMember = asyncHandler(async (req, res, next) => {
  const { userId, role = 'developer' } = req.body;
  const project = await Project.findById(req.params.projectId);

  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Verify user exists
  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Add member to project
  await project.addMember(userId, role);

  res.status(200).json({
    success: true,
    message: 'Member added successfully'
  });
});

// @desc    Remove member from project
// @route   DELETE /api/v1/projects/:projectId/members/:userId
// @access  Private (Project Manager)
exports.removeProjectMember = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.projectId);
  const { userId } = req.params;

  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Cannot remove project owner
  if (project.owner.toString() === userId) {
    return next(new ErrorResponse('Cannot remove project owner', 400));
  }

  // Remove member from project
  project.members = project.members.filter(member => 
    member.user.toString() !== userId
  );
  
  await project.save();

  res.status(200).json({
    success: true,
    message: 'Member removed successfully'
  });
});

// @desc    Update project member role
// @route   PUT /api/v1/projects/:projectId/members/:userId/role
// @access  Private (Project Manager)
exports.updateProjectMemberRole = asyncHandler(async (req, res, next) => {
  const { role } = req.body;
  const project = await Project.findById(req.params.projectId);
  const { userId } = req.params;

  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Find and update member role
  const member = project.members.find(m => m.user.toString() === userId);
  if (!member) {
    return next(new ErrorResponse('User is not a member of this project', 404));
  }

  member.role = role;
  
  // Update permissions based on role
  switch (role) {
    case 'lead':
      member.permissions = {
        canEditProject: true,
        canManageTasks: true,
        canInviteMembers: true
      };
      break;
    default:
      member.permissions = {
        canEditProject: false,
        canManageTasks: false,
        canInviteMembers: false
      };
  }

  await project.save();

  res.status(200).json({
    success: true,
    message: 'Member role updated successfully'
  });
});

// @desc    Get project members
// @route   GET /api/v1/projects/:projectId/members
// @access  Private (Project Member)
exports.getProjectMembers = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.projectId)
    .populate('members.user', 'name email role avatar');

  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  res.status(200).json({
    success: true,
    data: project.members
  });
});

// @desc    Get project tasks
// @route   GET /api/v1/projects/:projectId/tasks
// @access  Private (Project Member)
exports.getProjectTasks = asyncHandler(async (req, res, next) => {
  const tasks = await Task.find({ project: req.params.projectId })
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks
  });
});

// @desc    Get project statistics
// @route   GET /api/v1/projects/:projectId/stats
// @access  Private (Project Member)
exports.getProjectStats = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.projectId);

  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Update project stats
  await project.calculateProgress();

  res.status(200).json({
    success: true,
    data: project.stats
  });
});

// @desc    Archive project
// @route   POST /api/v1/projects/:projectId/archive
// @access  Private (Project Manager)
exports.archiveProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findByIdAndUpdate(
    req.params.projectId,
    {
      isArchived: true,
      archivedAt: new Date(),
      archivedBy: req.user.id
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    data: project
  });
});

// @desc    Unarchive project
// @route   POST /api/v1/projects/:projectId/unarchive
// @access  Private (Project Manager)
exports.unarchiveProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findByIdAndUpdate(
    req.params.projectId,
    {
      isArchived: false,
      $unset: { archivedAt: 1, archivedBy: 1 }
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    data: project
  });
});
