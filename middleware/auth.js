const jwt = require('jsonwebtoken');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');
const Team = require('../models/Team');
const Project = require('../models/Project');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  }
  // Set token from cookie
  else if (req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).populate('teams.team');

    if (!req.user) {
      return next(new ErrorResponse('User not found', 401));
    }

    // Ensure permissions are set based on role
    req.user.setRolePermissions();

    // Update last login
    req.user.lastLogin = new Date();
    await req.user.save({ validateBeforeSave: false });

    next();
  } catch (err) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).populate('teams.team');
    } catch (err) {
      // Token is invalid, but we don't fail the request
      req.user = null;
    }
  }

  next();
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

// Check if user has specific permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user.hasPermission(permission)) {
      return next(
        new ErrorResponse(
          `You don't have permission to ${permission}`,
          403
        )
      );
    }
    next();
  };
};

// Check if user is team member
const requireTeamMember = async (req, res, next) => {
  try {
    const teamId = req.params.teamId || req.body.teamId;

    if (!teamId) {
      return next(new ErrorResponse('Team ID is required', 400));
    }

    const team = await Team.findById(teamId);

    if (!team) {
      return next(new ErrorResponse('Team not found', 404));
    }

    // Admin can access any team
    if (req.user.role === 'admin') {
      req.team = team;
      return next();
    }

    // Check if user is team member
    if (!team.isMember(req.user.id)) {
      return next(new ErrorResponse('You are not a member of this team', 403));
    }

    req.team = team;
    req.userTeamRole = team.getMemberRole(req.user.id);
    next();
  } catch (error) {
    return next(new ErrorResponse('Error checking team membership', 500));
  }
};

// Check if user can manage team
const requireTeamManager = async (req, res, next) => {
  try {
    const teamId = req.params.teamId || req.body.teamId;

    if (!teamId) {
      return next(new ErrorResponse('Team ID is required', 400));
    }

    const team = await Team.findById(teamId);

    if (!team) {
      return next(new ErrorResponse('Team not found', 404));
    }

    // Admin can manage any team
    if (req.user.role === 'admin') {
      req.team = team;
      return next();
    }

    // Check if user can manage team
    if (!team.canUserManage(req.user.id)) {
      return next(new ErrorResponse('You are not authorized to manage this team', 403));
    }

    req.team = team;
    req.userTeamRole = team.getMemberRole(req.user.id);
    next();
  } catch (error) {
    return next(new ErrorResponse('Error checking team management permissions', 500));
  }
};

// Check if user is project member
const requireProjectMember = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.body.projectId;

    if (!projectId) {
      return next(new ErrorResponse('Project ID is required', 400));
    }

    const project = await Project.findById(projectId).populate('team');

    if (!project) {
      return next(new ErrorResponse('Project not found', 404));
    }

    // Admin can access any project
    if (req.user.role === 'admin') {
      req.project = project;
      return next();
    }

    // Check if user is project member or team member
    const isProjectMember = project.isMember(req.user.id);
    const isTeamMember = project.team && project.team.isMember(req.user.id);

    if (!isProjectMember && !isTeamMember) {
      return next(new ErrorResponse('You are not authorized to access this project', 403));
    }

    req.project = project;
    req.userProjectRole = project.getMemberRole(req.user.id);
    next();
  } catch (error) {
    return next(new ErrorResponse('Error checking project access', 500));
  }
};

// Check if user can manage project
const requireProjectManager = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.body.projectId;

    if (!projectId) {
      return next(new ErrorResponse('Project ID is required', 400));
    }

    const project = await Project.findById(projectId).populate('team');

    if (!project) {
      return next(new ErrorResponse('Project not found', 404));
    }

    // Admin can manage any project
    if (req.user.role === 'admin') {
      req.project = project;
      return next();
    }

    // Check if user can manage project
    const canManageProject = project.canUserManage(req.user.id);
    const canManageTeam = project.team && project.team.canUserManage(req.user.id);

    if (!canManageProject && !canManageTeam) {
      return next(new ErrorResponse('You are not authorized to manage this project', 403));
    }

    req.project = project;
    req.userProjectRole = project.getMemberRole(req.user.id);
    next();
  } catch (error) {
    return next(new ErrorResponse('Error checking project management permissions', 500));
  }
};

module.exports = {
  protect,
  optionalAuth,
  authorize,
  requirePermission,
  requireTeamMember,
  requireTeamManager,
  requireProjectMember,
  requireProjectManager
};
