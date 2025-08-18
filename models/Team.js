const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a team name'],
      trim: true,
      maxlength: [100, 'Team name cannot be more than 100 characters']
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot be more than 500 characters']
    },
    // Team Settings
    isPrivate: {
      type: Boolean,
      default: false
    },
    color: {
      type: String,
      default: '#6366f1'
    },
    avatar: {
      type: String,
      default: ''
    },
    // Team Owner
    owner: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    // Team Members
    members: [{
      user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
      },
      role: {
        type: String,
        enum: ['owner', 'manager', 'member'],
        default: 'member'
      },
      joinedAt: {
        type: Date,
        default: Date.now
      },
      invitedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      },
      permissions: {
        canInviteMembers: {
          type: Boolean,
          default: false
        },
        canManageProjects: {
          type: Boolean,
          default: false
        },
        canViewAllTasks: {
          type: Boolean,
          default: true
        },
        canManageTasks: {
          type: Boolean,
          default: false
        }
      }
    }],
    // Team Statistics
    stats: {
      totalProjects: {
        type: Number,
        default: 0
      },
      activeProjects: {
        type: Number,
        default: 0
      },
      completedProjects: {
        type: Number,
        default: 0
      },
      totalTasks: {
        type: Number,
        default: 0
      },
      completedTasks: {
        type: Number,
        default: 0
      }
    },
    // Team Settings
    settings: {
      allowMemberInvites: {
        type: Boolean,
        default: true
      },
      requireApprovalForJoin: {
        type: Boolean,
        default: false
      },
      defaultProjectVisibility: {
        type: String,
        enum: ['public', 'private', 'team'],
        default: 'team'
      },
      timezone: {
        type: String,
        default: 'UTC'
      }
    },
    // Status
    isActive: {
      type: Boolean,
      default: true
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
teamSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for team projects
teamSchema.virtual('projects', {
  ref: 'Project',
  localField: '_id',
  foreignField: 'team',
  justOne: false
});

// Virtual for team tasks
teamSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'team',
  justOne: false
});

// Check if user is team member
teamSchema.methods.isMember = function(userId) {
  return this.members.some(member => 
    member.user.toString() === userId.toString()
  );
};

// Get user's role in team
teamSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  return member ? member.role : null;
};

// Check if user can manage team
teamSchema.methods.canUserManage = function(userId) {
  if (this.owner.toString() === userId.toString()) {
    return true;
  }
  
  const member = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  return member && member.role === 'manager';
};

// Add member to team
teamSchema.methods.addMember = function(userId, role = 'member', invitedBy = null) {
  // Check if user is already a member
  if (this.isMember(userId)) {
    throw new Error('User is already a member of this team');
  }
  
  const memberData = {
    user: userId,
    role: role,
    joinedAt: new Date(),
    invitedBy: invitedBy
  };
  
  // Set permissions based on role
  switch (role) {
    case 'owner':
      memberData.permissions = {
        canInviteMembers: true,
        canManageProjects: true,
        canViewAllTasks: true,
        canManageTasks: true
      };
      break;
    case 'manager':
      memberData.permissions = {
        canInviteMembers: true,
        canManageProjects: true,
        canViewAllTasks: true,
        canManageTasks: true
      };
      break;
    case 'member':
      memberData.permissions = {
        canInviteMembers: false,
        canManageProjects: false,
        canViewAllTasks: true,
        canManageTasks: false
      };
      break;
  }
  
  this.members.push(memberData);
  return this.save();
};

// Remove member from team
teamSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => 
    member.user.toString() !== userId.toString()
  );
  return this.save();
};

// Update member role
teamSchema.methods.updateMemberRole = function(userId, newRole) {
  const member = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (!member) {
    throw new Error('User is not a member of this team');
  }
  
  member.role = newRole;
  
  // Update permissions based on new role
  switch (newRole) {
    case 'manager':
      member.permissions = {
        canInviteMembers: true,
        canManageProjects: true,
        canViewAllTasks: true,
        canManageTasks: true
      };
      break;
    case 'member':
      member.permissions = {
        canInviteMembers: false,
        canManageProjects: false,
        canViewAllTasks: true,
        canManageTasks: false
      };
      break;
  }
  
  return this.save();
};

// Update team statistics
teamSchema.methods.updateStats = async function() {
  const Project = mongoose.model('Project');
  const Task = mongoose.model('Task');
  
  try {
    const projects = await Project.find({ team: this._id });
    const tasks = await Task.find({ team: this._id });
    
    this.stats.totalProjects = projects.length;
    this.stats.activeProjects = projects.filter(p => p.status === 'active').length;
    this.stats.completedProjects = projects.filter(p => p.status === 'completed').length;
    this.stats.totalTasks = tasks.length;
    this.stats.completedTasks = tasks.filter(t => t.status === 'completed').length;
    
    return this.save();
  } catch (error) {
    console.error('Error updating team stats:', error);
  }
};

module.exports = mongoose.model('Team', teamSchema);
