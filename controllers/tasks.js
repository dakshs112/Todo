const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get all tasks for user
// @route   GET /api/v1/tasks
// @access  Private
exports.getTasks = asyncHandler(async (req, res, next) => {
  let query;

  if (req.user.role === 'admin') {
    // Admin can see all tasks
    query = Task.find();
  } else {
    // Users can see tasks assigned to them or created by them
    query = Task.find({
      $or: [
        { assignedTo: req.user.id },
        { createdBy: req.user.id },
        { watchers: req.user.id }
      ]
    });
  }

  // Apply filters
  if (req.query.status) {
    query = query.where('status').equals(req.query.status);
  }

  if (req.query.priority) {
    query = query.where('priority').equals(req.query.priority);
  }

  if (req.query.project) {
    query = query.where('project').equals(req.query.project);
  }

  if (req.query.assignedTo) {
    query = query.where('assignedTo').equals(req.query.assignedTo);
  }

  const tasks = await query
    .populate('project', 'title team')
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks
  });
});

// @desc    Get single task
// @route   GET /api/v1/tasks/:taskId
// @access  Private
exports.getTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.taskId)
    .populate('project', 'title team')
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email role')
    .populate('comments.user', 'name email')
    .populate('timeEntries.user', 'name email')
    .populate('watchers', 'name email');

  if (!task) {
    return next(new ErrorResponse('Task not found', 404));
  }

  // Check if user has access to this task
  const project = await Project.findById(task.project).populate('team');
  
  const hasAccess = 
    task.assignedTo && task.assignedTo._id.toString() === req.user.id ||
    task.createdBy._id.toString() === req.user.id ||
    task.watchers.some(w => w._id.toString() === req.user.id) ||
    project.isMember(req.user.id) ||
    project.team.isMember(req.user.id) ||
    req.user.role === 'admin';

  if (!hasAccess) {
    return next(new ErrorResponse('Not authorized to access this task', 403));
  }

  res.status(200).json({
    success: true,
    data: task
  });
});

// @desc    Create new task
// @route   POST /api/v1/tasks
// @access  Private
exports.createTask = asyncHandler(async (req, res, next) => {
  console.log('Creating task with data:', req.body);
  console.log('User:', req.user.id);

  const {
    title,
    description,
    project,
    assignedTo,
    dueDate,
    priority,
    type,
    estimatedHours,
    labels
  } = req.body;

  // Validate required fields
  if (!title || title.trim() === '') {
    return next(new ErrorResponse('Task title is required', 400));
  }

  // Verify project exists and user has access (if project is specified)
  let projectDoc = null;
  if (project && project.trim() !== '') {
    projectDoc = await Project.findById(project).populate('team');
    if (!projectDoc) {
      return next(new ErrorResponse('Project not found', 404));
    }

    // Check if user has access to create tasks in this project
    const hasAccess =
      projectDoc.isMember(req.user.id) ||
      (projectDoc.team && projectDoc.team.isMember(req.user.id)) ||
      req.user.role === 'admin';

    if (!hasAccess) {
      return next(new ErrorResponse('Not authorized to create tasks in this project', 403));
    }
  }

  // Create task
  const taskData = {
    title,
    description,
    createdBy: req.user.id,
    dueDate,
    priority: priority || 'medium',
    type: type || 'task',
    estimatedHours: estimatedHours || 0,
    labels,
    watchers: [req.user.id] // Creator is automatically a watcher
  };

  // Handle assignedTo field - only add if it's specified and not empty
  if (assignedTo && assignedTo.trim() !== '') {
    taskData.assignedTo = assignedTo;
  } else {
    taskData.assignedTo = req.user.id; // Assign to creator if no assignee specified
  }

  // Only add project and team if project is specified
  if (project && project.trim() !== '') {
    taskData.project = project;
    if (projectDoc && projectDoc.team) {
      taskData.team = projectDoc.team._id;
    }
  }

  const task = await Task.create(taskData);

  const populatedTask = await Task.findById(task._id)
    .populate('project', 'title')
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email');

  res.status(201).json({
    success: true,
    data: populatedTask
  });
});

// @desc    Update task
// @route   PUT /api/v1/tasks/:taskId
// @access  Private
exports.updateTask = asyncHandler(async (req, res, next) => {
  let task = await Task.findById(req.params.taskId);

  if (!task) {
    return next(new ErrorResponse('Task not found', 404));
  }

  // Check if user can update this task
  const project = await Project.findById(task.project).populate('team');
  
  const canUpdate = 
    task.assignedTo && task.assignedTo.toString() === req.user.id ||
    task.createdBy.toString() === req.user.id ||
    project.canUserManage(req.user.id) ||
    project.team.canUserManage(req.user.id) ||
    req.user.role === 'admin';

  if (!canUpdate) {
    return next(new ErrorResponse('Not authorized to update this task', 403));
  }

  // Update task
  task = await Task.findByIdAndUpdate(
    req.params.taskId,
    req.body,
    {
      new: true,
      runValidators: true
    }
  ).populate('project', 'title')
   .populate('assignedTo', 'name email')
   .populate('createdBy', 'name email');

  res.status(200).json({
    success: true,
    data: task
  });
});

// @desc    Delete task
// @route   DELETE /api/v1/tasks/:taskId
// @access  Private
exports.deleteTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.taskId);

  if (!task) {
    return next(new ErrorResponse('Task not found', 404));
  }

  // Check if user can delete this task
  const project = await Project.findById(task.project).populate('team');
  
  const canDelete = 
    task.createdBy.toString() === req.user.id ||
    project.canUserManage(req.user.id) ||
    project.team.canUserManage(req.user.id) ||
    req.user.role === 'admin';

  if (!canDelete) {
    return next(new ErrorResponse('Not authorized to delete this task', 403));
  }

  await task.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Assign task to user
// @route   POST /api/v1/tasks/:taskId/assign
// @access  Private
exports.assignTask = asyncHandler(async (req, res, next) => {
  const { userId } = req.body;
  const task = await Task.findById(req.params.taskId);

  if (!task) {
    return next(new ErrorResponse('Task not found', 404));
  }

  // Verify user exists
  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Assign task
  await task.assignTo(userId, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Task assigned successfully'
  });
});

// @desc    Unassign task
// @route   POST /api/v1/tasks/:taskId/unassign
// @access  Private
exports.unassignTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findByIdAndUpdate(
    req.params.taskId,
    {
      $unset: { 
        assignedTo: 1, 
        assignedBy: 1, 
        assignedAt: 1 
      }
    },
    { new: true }
  );

  if (!task) {
    return next(new ErrorResponse('Task not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Task unassigned successfully'
  });
});

// @desc    Add time entry to task
// @route   POST /api/v1/tasks/:taskId/time
// @access  Private
exports.addTimeEntry = asyncHandler(async (req, res, next) => {
  const { hours, description } = req.body;
  const task = await Task.findById(req.params.taskId);

  if (!task) {
    return next(new ErrorResponse('Task not found', 404));
  }

  await task.addTimeEntry(req.user.id, hours, description);

  res.status(200).json({
    success: true,
    message: 'Time entry added successfully'
  });
});

// @desc    Add comment to task
// @route   POST /api/v1/tasks/:taskId/comments
// @access  Private
exports.addComment = asyncHandler(async (req, res, next) => {
  const { content } = req.body;
  const task = await Task.findById(req.params.taskId);

  if (!task) {
    return next(new ErrorResponse('Task not found', 404));
  }

  await task.addComment(req.user.id, content);

  res.status(200).json({
    success: true,
    message: 'Comment added successfully'
  });
});

// @desc    Add checklist item
// @route   POST /api/v1/tasks/:taskId/checklist
// @access  Private
exports.addChecklistItem = asyncHandler(async (req, res, next) => {
  const { item } = req.body;
  const task = await Task.findById(req.params.taskId);

  if (!task) {
    return next(new ErrorResponse('Task not found', 404));
  }

  await task.addChecklistItem(item);

  res.status(200).json({
    success: true,
    message: 'Checklist item added successfully'
  });
});

// @desc    Complete checklist item
// @route   PUT /api/v1/tasks/:taskId/checklist/:itemId/complete
// @access  Private
exports.completeChecklistItem = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.taskId);

  if (!task) {
    return next(new ErrorResponse('Task not found', 404));
  }

  await task.completeChecklistItem(req.params.itemId, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Checklist item completed successfully'
  });
});

// @desc    Add watcher to task
// @route   POST /api/v1/tasks/:taskId/watchers
// @access  Private
exports.addWatcher = asyncHandler(async (req, res, next) => {
  const { userId } = req.body;
  const task = await Task.findById(req.params.taskId);

  if (!task) {
    return next(new ErrorResponse('Task not found', 404));
  }

  await task.addWatcher(userId || req.user.id);

  res.status(200).json({
    success: true,
    message: 'Watcher added successfully'
  });
});

// @desc    Remove watcher from task
// @route   DELETE /api/v1/tasks/:taskId/watchers/:userId
// @access  Private
exports.removeWatcher = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.taskId);

  if (!task) {
    return next(new ErrorResponse('Task not found', 404));
  }

  await task.removeWatcher(req.params.userId);

  res.status(200).json({
    success: true,
    message: 'Watcher removed successfully'
  });
});

// @desc    Get task comments
// @route   GET /api/v1/tasks/:taskId/comments
// @access  Private
exports.getTaskComments = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.taskId)
    .populate('comments.user', 'name email avatar');

  if (!task) {
    return next(new ErrorResponse('Task not found', 404));
  }

  res.status(200).json({
    success: true,
    data: task.comments
  });
});

// @desc    Get task time entries
// @route   GET /api/v1/tasks/:taskId/time
// @access  Private
exports.getTaskTimeEntries = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.taskId)
    .populate('timeEntries.user', 'name email');

  if (!task) {
    return next(new ErrorResponse('Task not found', 404));
  }

  res.status(200).json({
    success: true,
    data: task.timeEntries
  });
});
