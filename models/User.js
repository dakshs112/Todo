const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email'
      ]
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
      select: false
    },
    role: {
      type: String,
      enum: ['admin', 'team_manager', 'employee', 'client'],
      default: 'team_manager'
    },
    // Profile Information
    avatar: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      trim: true
    },
    department: {
      type: String,
      trim: true
    },
    position: {
      type: String,
      trim: true
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot be more than 500 characters']
    },
    // Team Management
    teams: [{
      team: {
        type: mongoose.Schema.ObjectId,
        ref: 'Team'
      },
      role: {
        type: String,
        enum: ['owner', 'manager', 'member'],
        default: 'member'
      },
      joinedAt: {
        type: Date,
        default: Date.now
      }
    }],
    // Current active team
    activeTeam: {
      type: mongoose.Schema.ObjectId,
      ref: 'Team'
    },
    // Permissions and Settings
    permissions: {
      canCreateTeams: {
        type: Boolean,
        default: false
      },
      canManageUsers: {
        type: Boolean,
        default: false
      },
      canViewAllProjects: {
        type: Boolean,
        default: false
      },
      canManageProjects: {
        type: Boolean,
        default: false
      }
    },
    // Status and Activity
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    // Security
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    emailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: String,
    emailVerificationExpire: Date,
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
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Virtual for user's full team information
userSchema.virtual('teamInfo', {
  ref: 'Team',
  localField: 'teams.team',
  foreignField: '_id',
  justOne: false
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      activeTeam: this.activeTeam,
      permissions: this.permissions
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if user has permission
userSchema.methods.hasPermission = function(permission) {
  // Admin has all permissions
  if (this.role === 'admin') {
    return true;
  }

  // Check specific permission
  return this.permissions[permission] || false;
};

// Check if user is team owner or manager
userSchema.methods.canManageTeam = function(teamId) {
  if (this.role === 'admin') {
    return true;
  }

  const teamMembership = this.teams.find(t =>
    t.team.toString() === teamId.toString()
  );

  return teamMembership &&
    (teamMembership.role === 'owner' || teamMembership.role === 'manager');
};

// Get user's role in specific team
userSchema.methods.getTeamRole = function(teamId) {
  const teamMembership = this.teams.find(t =>
    t.team.toString() === teamId.toString()
  );

  return teamMembership ? teamMembership.role : null;
};

// Set user permissions based on role
userSchema.methods.setRolePermissions = function() {
  switch (this.role) {
    case 'admin':
      this.permissions = {
        canCreateTeams: true,
        canManageUsers: true,
        canViewAllProjects: true,
        canManageProjects: true
      };
      break;
    case 'team_manager':
      this.permissions = {
        canCreateTeams: true,
        canManageUsers: false,
        canViewAllProjects: false,
        canManageProjects: true
      };
      break;
    case 'employee':
      this.permissions = {
        canCreateTeams: false,
        canManageUsers: false,
        canViewAllProjects: false,
        canManageProjects: false
      };
      break;
    case 'client':
      this.permissions = {
        canCreateTeams: false,
        canManageUsers: false,
        canViewAllProjects: false,
        canManageProjects: false
      };
      break;
    default:
      this.permissions = {
        canCreateTeams: false,
        canManageUsers: false,
        canViewAllProjects: false,
        canManageProjects: false
      };
  }
};

// Set permissions before saving
userSchema.pre('save', function(next) {
  if (this.isModified('role') || this.isNew) {
    this.setRolePermissions();
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
