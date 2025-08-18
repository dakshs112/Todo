const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a task title'],
      trim: true,
      maxlength: [200, 'Title cannot be more than 200 characters']
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot be more than 1000 characters']
    },
    // Task Organization
    project: {
      type: mongoose.Schema.ObjectId,
      ref: 'Project'
    },
    team: {
      type: mongoose.Schema.ObjectId,
      ref: 'Team'
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    // Task Assignment
    assignedTo: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    assignedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    assignedAt: {
      type: Date
    },
    // Task Details
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'review', 'completed', 'cancelled'],
      default: 'todo'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    type: {
      type: String,
      enum: ['task', 'bug', 'feature', 'improvement', 'research'],
      default: 'task'
    },
    // Timeline
    dueDate: {
      type: Date
    },
    startDate: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    // Time Tracking
    estimatedHours: {
      type: Number,
      min: 0,
      default: 0
    },
    loggedHours: {
      type: Number,
      min: 0,
      default: 0
    },
    timeEntries: [{
      user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
      },
      hours: {
        type: Number,
        required: true,
        min: 0
      },
      description: {
        type: String,
        maxlength: [500, 'Time entry description cannot be more than 500 characters']
      },
      date: {
        type: Date,
        default: Date.now
      }
    }],
    // Task Dependencies
    dependencies: [{
      task: {
        type: mongoose.Schema.ObjectId,
        ref: 'Task'
      },
      type: {
        type: String,
        enum: ['blocks', 'blocked_by', 'related'],
        default: 'blocks'
      }
    }],
    // Task Labels/Tags
    labels: [{
      name: {
        type: String,
        required: true
      },
      color: {
        type: String,
        default: '#6366f1'
      }
    }],
    // Comments and Updates
    comments: [{
      user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
      },
      content: {
        type: String,
        required: true,
        maxlength: [1000, 'Comment cannot be more than 1000 characters']
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      updatedAt: {
        type: Date,
        default: Date.now
      },
      isEdited: {
        type: Boolean,
        default: false
      }
    }],
    // Attachments
    attachments: [{
      name: {
        type: String,
        required: true
      },
      url: {
        type: String,
        required: true
      },
      type: {
        type: String,
        required: true
      },
      size: {
        type: Number
      },
      uploadedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    // Checklist
    checklist: [{
      item: {
        type: String,
        required: true
      },
      completed: {
        type: Boolean,
        default: false
      },
      completedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      },
      completedAt: {
        type: Date
      }
    }],
    // Task Progress
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    // Watchers (users who want to be notified of updates)
    watchers: [{
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }],
    // Timestamps
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
taskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Auto-complete task if all checklist items are completed
  if (this.checklist.length > 0) {
    const completedItems = this.checklist.filter(item => item.completed);
    this.progress = Math.round((completedItems.length / this.checklist.length) * 100);
    
    if (completedItems.length === this.checklist.length && this.status !== 'completed') {
      this.status = 'completed';
      this.completedAt = new Date();
    }
  }
  
  next();
});

// Check if task is overdue
taskSchema.virtual('isOverdue').get(function() {
  return this.dueDate && this.dueDate < new Date() && this.status !== 'completed';
});

// Check if task is due soon (within 24 hours)
taskSchema.virtual('isDueSoon').get(function() {
  if (!this.dueDate || this.status === 'completed') return false;
  
  const twentyFourHoursFromNow = new Date();
  twentyFourHoursFromNow.setHours(twentyFourHoursFromNow.getHours() + 24);
  
  return this.dueDate <= twentyFourHoursFromNow;
});

// Add time entry
taskSchema.methods.addTimeEntry = function(userId, hours, description = '') {
  this.timeEntries.push({
    user: userId,
    hours: hours,
    description: description,
    date: new Date()
  });
  
  // Update total logged hours
  this.loggedHours = this.timeEntries.reduce((total, entry) => total + entry.hours, 0);
  
  return this.save();
};

// Add comment
taskSchema.methods.addComment = function(userId, content) {
  this.comments.push({
    user: userId,
    content: content,
    createdAt: new Date()
  });
  
  return this.save();
};

// Add to checklist
taskSchema.methods.addChecklistItem = function(item) {
  this.checklist.push({
    item: item,
    completed: false
  });
  
  return this.save();
};

// Complete checklist item
taskSchema.methods.completeChecklistItem = function(itemId, userId) {
  const item = this.checklist.id(itemId);
  if (item) {
    item.completed = true;
    item.completedBy = userId;
    item.completedAt = new Date();
  }
  
  return this.save();
};

// Assign task to user
taskSchema.methods.assignTo = function(userId, assignedBy) {
  this.assignedTo = userId;
  this.assignedBy = assignedBy;
  this.assignedAt = new Date();
  
  // Add assignee to watchers if not already watching
  if (!this.watchers.includes(userId)) {
    this.watchers.push(userId);
  }
  
  return this.save();
};

// Add watcher
taskSchema.methods.addWatcher = function(userId) {
  if (!this.watchers.includes(userId)) {
    this.watchers.push(userId);
  }
  
  return this.save();
};

// Remove watcher
taskSchema.methods.removeWatcher = function(userId) {
  this.watchers = this.watchers.filter(watcher => 
    watcher.toString() !== userId.toString()
  );
  
  return this.save();
};

module.exports = mongoose.model('Task', taskSchema);
