const mongoose = require('mongoose');

const deadlineSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a deadline title'],
      trim: true,
      maxlength: [200, 'Title cannot be more than 200 characters']
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot be more than 1000 characters']
    },
    // Deadline Organization
    project: {
      type: mongoose.Schema.ObjectId,
      ref: 'Project'
    },
    team: {
      type: mongoose.Schema.ObjectId,
      ref: 'Team',
      required: true
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    // Deadline Details
    dueDate: {
      type: Date,
      required: [true, 'Please add a due date']
    },
    type: {
      type: String,
      enum: ['milestone', 'deliverable', 'meeting', 'review', 'launch', 'other'],
      default: 'milestone'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'overdue', 'cancelled'],
      default: 'pending'
    },
    // Assignment and Responsibility
    assignedTo: [{
      user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
      },
      role: {
        type: String,
        enum: ['responsible', 'accountable', 'consulted', 'informed'],
        default: 'responsible'
      },
      assignedAt: {
        type: Date,
        default: Date.now
      }
    }],
    // Deadline Dependencies
    dependencies: [{
      deadline: {
        type: mongoose.Schema.ObjectId,
        ref: 'Deadline'
      },
      type: {
        type: String,
        enum: ['blocks', 'blocked_by', 'related'],
        default: 'blocks'
      }
    }],
    // Related Tasks
    relatedTasks: [{
      type: mongoose.Schema.ObjectId,
      ref: 'Task'
    }],
    // Deliverables
    deliverables: [{
      name: {
        type: String,
        required: true
      },
      description: {
        type: String
      },
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed'],
        default: 'pending'
      },
      completedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      },
      completedAt: {
        type: Date
      }
    }],
    // Progress Tracking
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    // Notifications and Reminders
    reminders: [{
      type: {
        type: String,
        enum: ['email', 'push', 'sms'],
        default: 'email'
      },
      timing: {
        type: String,
        enum: ['1_hour', '1_day', '3_days', '1_week', '2_weeks'],
        required: true
      },
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: {
        type: Date
      }
    }],
    // Attachments and Resources
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
      }
    }],
    // Completion Details
    completedAt: {
      type: Date
    },
    completedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    completionNotes: {
      type: String,
      maxlength: [1000, 'Completion notes cannot be more than 1000 characters']
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
deadlineSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Auto-update status based on due date and completion
  if (this.status !== 'completed' && this.status !== 'cancelled') {
    if (this.dueDate < new Date()) {
      this.status = 'overdue';
    }
  }
  
  // Calculate progress based on deliverables
  if (this.deliverables.length > 0) {
    const completedDeliverables = this.deliverables.filter(d => d.status === 'completed');
    this.progress = Math.round((completedDeliverables.length / this.deliverables.length) * 100);
    
    // Auto-complete if all deliverables are done
    if (completedDeliverables.length === this.deliverables.length && this.status !== 'completed') {
      this.status = 'completed';
      this.completedAt = new Date();
    }
  }
  
  next();
});

// Check if deadline is overdue
deadlineSchema.virtual('isOverdue').get(function() {
  return this.dueDate < new Date() && this.status !== 'completed' && this.status !== 'cancelled';
});

// Check if deadline is due soon (within 24 hours)
deadlineSchema.virtual('isDueSoon').get(function() {
  if (this.status === 'completed' || this.status === 'cancelled') return false;
  
  const twentyFourHoursFromNow = new Date();
  twentyFourHoursFromNow.setHours(twentyFourHoursFromNow.getHours() + 24);
  
  return this.dueDate <= twentyFourHoursFromNow;
});

// Get time remaining until deadline
deadlineSchema.virtual('timeRemaining').get(function() {
  if (this.status === 'completed' || this.status === 'cancelled') return null;
  
  const now = new Date();
  const timeDiff = this.dueDate - now;
  
  if (timeDiff <= 0) return 'Overdue';
  
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
});

// Add assignee
deadlineSchema.methods.addAssignee = function(userId, role = 'responsible') {
  // Check if user is already assigned
  const existingAssignment = this.assignedTo.find(assignment => 
    assignment.user.toString() === userId.toString()
  );
  
  if (existingAssignment) {
    existingAssignment.role = role;
  } else {
    this.assignedTo.push({
      user: userId,
      role: role,
      assignedAt: new Date()
    });
  }
  
  // Add to watchers if not already watching
  if (!this.watchers.includes(userId)) {
    this.watchers.push(userId);
  }
  
  return this.save();
};

// Remove assignee
deadlineSchema.methods.removeAssignee = function(userId) {
  this.assignedTo = this.assignedTo.filter(assignment => 
    assignment.user.toString() !== userId.toString()
  );
  
  return this.save();
};

// Add deliverable
deadlineSchema.methods.addDeliverable = function(name, description = '') {
  this.deliverables.push({
    name: name,
    description: description,
    status: 'pending'
  });
  
  return this.save();
};

// Complete deliverable
deadlineSchema.methods.completeDeliverable = function(deliverableId, userId) {
  const deliverable = this.deliverables.id(deliverableId);
  if (deliverable) {
    deliverable.status = 'completed';
    deliverable.completedBy = userId;
    deliverable.completedAt = new Date();
  }
  
  return this.save();
};

// Add comment
deadlineSchema.methods.addComment = function(userId, content) {
  this.comments.push({
    user: userId,
    content: content,
    createdAt: new Date()
  });
  
  return this.save();
};

// Complete deadline
deadlineSchema.methods.complete = function(userId, notes = '') {
  this.status = 'completed';
  this.completedAt = new Date();
  this.completedBy = userId;
  this.completionNotes = notes;
  this.progress = 100;
  
  return this.save();
};

// Add watcher
deadlineSchema.methods.addWatcher = function(userId) {
  if (!this.watchers.includes(userId)) {
    this.watchers.push(userId);
  }
  
  return this.save();
};

module.exports = mongoose.model('Deadline', deadlineSchema);
