const Joi = require('joi');

// Note validation
const noteValidation = (data) => {
  const schema = Joi.object({
    title: Joi.string().min(1).max(100).required(),
    content: Joi.string().min(1).required(),
    user: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  });
  return schema.validate(data);
};

// Update note validation
const updateNoteValidation = (data) => {
  const schema = Joi.object({
    title: Joi.string().min(1).max(100),
    content: Joi.string().min(1)
  }).min(1); // At least one field must be provided
  
  return schema.validate(data);
};

module.exports = {
  noteValidation,
  updateNoteValidation
};
