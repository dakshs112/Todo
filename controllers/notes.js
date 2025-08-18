const Note = require('../models/Note');
const ErrorResponse = require('../utils/errorResponse');
const { noteValidation, updateNoteValidation } = require('../validators/note');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get all notes
// @route   GET /api/v1/notes
// @access  Private
exports.getNotes = asyncHandler(async (req, res, next) => {
  // Only return notes for the logged in user
  const notes = await Note.find({ user: req.user.id });
  
  res.status(200).json({
    success: true,
    count: notes.length,
    data: notes
  });
});

// @desc    Get single note
// @route   GET /api/v1/notes/:id
// @access  Private
exports.getNote = asyncHandler(async (req, res, next) => {
  const note = await Note.findById(req.params.id);

  if (!note) {
    return next(
      new ErrorResponse(`Note not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the note
  if (note.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(`Not authorized to access this note`, 401)
    );
  }

  res.status(200).json({
    success: true,
    data: note
  });
});

// @desc    Create new note
// @route   POST /api/v1/notes
// @access  Private
exports.createNote = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.user = req.user.id;

  // Validate request body
  const { error } = noteValidation(req.body);
  if (error) {
    return next(new ErrorResponse(error.details[0].message, 400));
  }

  const note = await Note.create(req.body);

  res.status(201).json({
    success: true,
    data: note
  });
});

// @desc    Update note
// @route   PUT /api/v1/notes/:id
// @access  Private
exports.updateNote = asyncHandler(async (req, res, next) => {
  // Validate request body
  const { error } = updateNoteValidation(req.body);
  if (error) {
    return next(new ErrorResponse(error.details[0].message, 400));
  }

  let note = await Note.findById(req.params.id);

  if (!note) {
    return next(
      new ErrorResponse(`Note not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the note or is admin
  if (note.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(`Not authorized to update this note`, 401)
    );
  }

  // Update the note
  note = await Note.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: note
  });
});

// @desc    Delete note
// @route   DELETE /api/v1/notes/:id
// @access  Private
exports.deleteNote = asyncHandler(async (req, res, next) => {
  const note = await Note.findById(req.params.id);

  if (!note) {
    return next(
      new ErrorResponse(`Note not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the note or is admin
  if (note.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(`Not authorized to delete this note`, 401)
    );
  }

  await note.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});
