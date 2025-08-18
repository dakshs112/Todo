const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a project title'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters']
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot be more than 1000 characters']
    },
    // Project Organization
    team: {
      type: mongoose.Schema.ObjectId,
      ref: 'Team'
    },
    owner: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    // Project Details
    status: {
      type: String,
      enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
      default: 'planning'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    visibility: {
      type: String,
      enum: ['public', 'private', 'team'],
      default: 'team'
    },
    // Timeline
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date
    },
    deadline: {
      type: Date
    },
    // Progress Tracking
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    // Budget (optional)
    budget: {
      allocated: {
        type: Number,
        default: 0
      },
      spent: {
        type: Number,
        default: 0
      },
      currency: {
        type: String,
        default: 'USD'
      }
    },
    // Project Members
    members: [{
      user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
      },
      role: {
        type: String,
        enum: ['lead', 'developer', 'designer', 'tester', 'client'],
        default: 'developer'
      },
      assignedAt: {
        type: Date,
        default: Date.now
      },
      permissions: {
        canEditProject: {
          type: Boolean,
          default: false
        },
        canManageTasks: {
          type: Boolean,
          default: false
        },
        canInviteMembers: {
          type: Boolean,
          default: false
        }
      }
    }],
    // Project Tags
    tags: [{
      type: String,
      trim: true
    }],
    // Project Statistics
    stats: {
      totalTasks: {
        type: Number,
        default: 0
      },
      completedTasks: {
        type: Number,
        default: 0
      },
      overdueTasks: {
        type: Number,
        default: 0
      },
      totalHours: {
        type: Number,
        default: 0
      },
      loggedHours: {
        type: Number,
        default: 0
      }
    },
    // Client Information (for client projects)
    client: {
      name: {
        type: String,
        trim: true
      },
      email: {
        type: String,
        trim: true
      },
      company: {
        type: String,
        trim: true
      },
      contact: {
        type: String,
        trim: true
      }
    },
    // Project Files and Resources
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
    // Project Settings
    settings: {
      allowClientAccess: {
        type: Boolean,
        default: false
      },
      requireTaskApproval: {
        type: Boolean,
        default: false
      },
      enableTimeTracking: {
        type: Boolean,
        default: true
      },
      notifyOnDeadline: {
        type: Boolean,
        default: true
      }
    },
    // Status tracking
    isArchived: {
      type: Boolean,
      default: false
    },
    archivedAt: {
      type: Date
    },
    archivedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
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
projectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for project tasks
projectSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
  justOne: false
});

// Virtual for project deadlines
projectSchema.virtual('deadlines', {
  ref: 'Deadline',
  localField: '_id',
  foreignField: 'project',
  justOne: false
});

// Check if user is project member
projectSchema.methods.isMember = function(userId) {
  return this.members.some(member => 
    member.user.toString() === userId.toString()
  );
};

// Get user's role in project
projectSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  return member ? member.role : null;
};

// Check if user can manage project
projectSchema.methods.canUserManage = function(userId) {
  if (this.owner.toString() === userId.toString()) {
    return true;
  }
  
  const member = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  return member && (member.role === 'lead' || member.permissions.canEditProject);
};

// Add member to project
projectSchema.methods.addMember = function(userId, role = 'developer') {
  // Check if user is already a member
  if (this.isMember(userId)) {
    throw new Error('User is already a member of this project');
  }
  
  const memberData = {
    user: userId,
    role: role,
    assignedAt: new Date()
  };
  
  // Set permissions based on role
  switch (role) {
    case 'lead':
      memberData.permissions = {
        canEditProject: true,
        canManageTasks: true,
        canInviteMembers: true
      };
      break;
    case 'developer':
    case 'designer':
    case 'tester':
      memberData.permissions = {
        canEditProject: false,
        canManageTasks: false,
        canInviteMembers: false
      };
      break;
    case 'client':
      memberData.permissions = {
        canEditProject: false,
        canManageTasks: false,
        canInviteMembers: false
      };
      break;
  }
  
  this.members.push(memberData);
  return this.save();
};

// Calculate project progress
projectSchema.methods.calculateProgress = async function() {
  const Task = mongoose.model('Task');
  
  try {
    const tasks = await Task.find({ project: this._id });
    
    if (tasks.length === 0) {
      this.progress = 0;
    } else {
      const completedTasks = tasks.filter(task => task.status === 'completed');
      this.progress = Math.round((completedTasks.length / tasks.length) * 100);
    }
    
    // Update stats
    this.stats.totalTasks = tasks.length;
    this.stats.completedTasks = tasks.filter(t => t.status === 'completed').length;
    this.stats.overdueTasks = tasks.filter(t => 
      t.dueDate && t.dueDate < new Date() && t.status !== 'completed'
    ).length;
    
    return this.save();
  } catch (error) {
    console.error('Error calculating project progress:', error);
  }
};

// Check if project is overdue
projectSchema.virtual('isOverdue').get(function() {
  return this.deadline && this.deadline < new Date() && this.status !== 'completed';
});

// Check if project is due soon (within 7 days)
projectSchema.virtual('isDueSoon').get(function() {
  if (!this.deadline || this.status === 'completed') return false;
  
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  
  return this.deadline <= sevenDaysFromNow;
});

module.exports = mongoose.model('Project', projectSchema);
