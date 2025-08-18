const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters']
    },
    content: {
      type: String,
      required: [true, 'Please add some content']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Update the updatedAt field before saving
noteSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Cascade delete notes when a user is deleted
noteSchema.pre('remove', async function(next) {
  console.log(`Notes being removed for user ${this.user}`);
  await this.model('User').findByIdAndUpdate(this.user, {
    $pull: { notes: this._id }
  });
  next();
});

// Reverse populate with virtuals
noteSchema.virtual('userInfo', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('Note', noteSchema);
