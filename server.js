require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const fetch = require('node-fetch');
const errorHandler = require('./middleware/error');
const connectDB = require('./config/db');

// Load env vars
const PORT = process.env.PORT || 3000;
 
// Connect to database
if (process.env.MONGO_URI) {
  connectDB();
} else {
  console.log('MongoDB URI not provided. Running in file-based mode only.');
}

// Route files 
const auth = require('./routes/auth');
const notes = require('./routes/notes');

const app = express();

// Set security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // allow any secure external script host (CDNs) and inline scripts
      scriptSrc: ["'self'", "https:", "'unsafe-inline'"],
      // allow secure external styles (CDNs), inline styles (Tailwind injects), and Google Fonts CSS
      styleSrc: ["'self'", "https:", "'unsafe-inline'"],
      // allow fonts from secure hosts (Google Fonts, CDNs)
      fontSrc: ["'self'", "https:"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https:"],
      // keep other directives as needed
    }
  }
}));
app.use(helmet.crossOriginEmbedderPolicy({ policy: 'credentialless' }));
app.use(helmet.referrerPolicy({ policy: 'no-referrer-when-downgrade' }));

// Enable CORS 
app.use(cors());

// Prevent XSS attacks
app.use(xss());
 
// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Prevent http param pollution
app.use(hpp());

// Sanitize data
app.use(mongoSanitize());

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Set view engine
try {
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
} catch (err) {
  console.error('Error setting view engine:', err);
}

// Import middleware
const { protect, optionalAuth } = require('./middleware/auth');

// Authentication routes
app.get('/auth/login', (req, res) => {
    // If user is already logged in, redirect to dashboard
    if (req.cookies.token) {
        return res.redirect('/dashboard');
    }
    res.render('login', { error: null, success: null, formData: {} });
});

app.get('/auth/register', (req, res) => {
    // If user is already logged in, redirect to dashboard
    if (req.cookies.token) {
        return res.redirect('/dashboard');
    }
    res.render('register', { error: null, formData: {} });
});

app.post('/auth/login', async (req, res) => {
    try {
        const { email, password, remember } = req.body;

        // Make API call to login endpoint
        const response = await fetch(`${req.protocol}://${req.get('host')}/api/v1/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.render('login', {
                error: data.error || 'Login failed',
                success: null,
                formData: { email }
            });
        }

        // Set cookie options
        const cookieOptions = {
            expires: remember ?
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : // 30 days
                new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        };

        res.cookie('token', data.token, cookieOptions);
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Login error:', error);
        res.render('login', {
            error: 'An error occurred during login',
            success: null,
            formData: req.body
        });
    }
});

app.post('/auth/register', async (req, res) => {
    try {
        const { name, email, password, confirmPassword, role, terms } = req.body;

        // Validate passwords match
        if (password !== confirmPassword) {
            return res.render('register', {
                error: 'Passwords do not match',
                formData: req.body
            });
        }

        // Validate terms acceptance
        if (!terms) {
            return res.render('register', {
                error: 'You must accept the terms of service',
                formData: req.body
            });
        }

        // Make API call to register endpoint
        const response = await fetch(`${req.protocol}://${req.get('host')}/api/v1/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password, role })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.render('register', {
                error: data.error || 'Registration failed',
                formData: req.body
            });
        }

        // Set cookie
        const cookieOptions = {
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        };

        res.cookie('token', data.token, cookieOptions);
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Registration error:', error);
        res.render('register', {
            error: 'An error occurred during registration',
            formData: req.body
        });
    }
});

// Logout route - placed early to avoid middleware conflicts
app.get('/logout', (req, res) => {
    try {
        console.log('=== SIMPLE LOGOUT ROUTE HIT ===');
        console.log('Request URL:', req.url);
        console.log('Request method:', req.method);

        // Clear the token cookie
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });

        // Also set it to 'none' as backup
        res.cookie('token', 'none', {
            expires: new Date(Date.now() + 10 * 1000),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });

        console.log('Cookies cleared - redirecting to login');
        res.redirect('/auth/login');
    } catch (error) {
        console.error('Logout error:', error);
        res.redirect('/auth/login');
    }
});

app.get('/auth/logout', (req, res) => {
    try {
        console.log('=== AUTH LOGOUT ROUTE HIT ===');
        console.log('Request URL:', req.url);
        console.log('Request method:', req.method);
        console.log('Current cookies:', req.cookies);

        // Clear the token cookie with multiple methods to ensure it's cleared
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });

        // Also set it to 'none' as backup
        res.cookie('token', 'none', {
            expires: new Date(Date.now() + 10 * 1000),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });

        console.log('Cookies cleared - redirecting to login');
        res.redirect('/auth/login');
    } catch (error) {
        console.error('Logout error:', error);
        res.redirect('/auth/login');
    }
});

// Dashboard route (protected)
app.get('/dashboard', protect, async (req, res) => {
    try {
        // Get user's teams and projects
        const Team = require('./models/Team');
        const Project = require('./models/Project');
        const Task = require('./models/Task');

        const teams = await Team.find({
            $or: [
                { owner: req.user.id },
                { 'members.user': req.user.id }
            ]
        }).populate('members.user', 'name email');

        const projects = await Project.find({
            $or: [
                { owner: req.user.id },
                { 'members.user': req.user.id },
                { team: { $in: teams.map(t => t._id) } }
            ]
        }).populate('team', 'name').populate('owner', 'name');

        const tasks = await Task.find({
            $or: [
                { assignedTo: req.user.id },
                { createdBy: req.user.id },
                { project: { $in: projects.map(p => p._id) } }
            ]
        }).populate('project', 'title').populate('assignedTo', 'name');

        res.render('dashboard', {
            user: req.user,
            teams,
            projects,
            tasks
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).render('error', { error: 'Failed to load dashboard' });
    }
});

// Teams page route (protected)
app.get('/teams', protect, async (req, res) => {
    try {
        const Team = require('./models/Team');

        const teams = await Team.find({
            $or: [
                { owner: req.user.id },
                { 'members.user': req.user.id }
            ]
        }).populate('members.user', 'name email').populate('owner', 'name email');

        res.render('teams', {
            user: req.user,
            teams
        });
    } catch (error) {
        console.error('Teams page error:', error);
        res.status(500).render('error', { error: 'Failed to load teams page' });
    }
});

// Projects page route (protected)
app.get('/projects', protect, async (req, res) => {
    try {
        const Team = require('./models/Team');
        const Project = require('./models/Project');

        const teams = await Team.find({
            $or: [
                { owner: req.user.id },
                { 'members.user': req.user.id }
            ]
        });

        const projects = await Project.find({
            $or: [
                { owner: req.user.id },
                { 'members.user': req.user.id },
                { team: { $in: teams.map(t => t._id) } }
            ]
        }).populate('team', 'name').populate('owner', 'name');

        res.render('projects', {
            user: req.user,
            projects,
            teams
        });
    } catch (error) {
        console.error('Projects page error:', error);
        res.status(500).render('error', { error: 'Failed to load projects page' });
    }
});

// Tasks page route (protected)
app.get('/tasks', protect, async (req, res) => {
    try {
        const Team = require('./models/Team');
        const Project = require('./models/Project');
        const Task = require('./models/Task');

        const teams = await Team.find({
            $or: [
                { owner: req.user.id },
                { 'members.user': req.user.id }
            ]
        });

        const projects = await Project.find({
            $or: [
                { owner: req.user.id },
                { 'members.user': req.user.id },
                { team: { $in: teams.map(t => t._id) } }
            ]
        }).populate('team', 'name').populate('owner', 'name');

        const tasks = await Task.find({
            $or: [
                { assignedTo: req.user.id },
                { createdBy: req.user.id },
                { project: { $in: projects.map(p => p._id) } }
            ]
        }).populate('project', 'title').populate('assignedTo', 'name').populate('createdBy', 'name');

        res.render('tasks', {
            user: req.user,
            tasks,
            projects,
            teams
        });
    } catch (error) {
        console.error('Tasks page error:', error);
        res.status(500).render('error', { error: 'Failed to load tasks page' });
    }
});

// Root route - redirect based on authentication
app.get('/', optionalAuth, function (req, res) {
    if (req.user) {
        return res.redirect('/dashboard');
    }

    // Show public landing page for non-authenticated users
    fs.readdir(`./files`, function (err, files) {
        if (err) {
            console.error('Error reading files directory:', err);
            files = [];
        }

        // For guest users, show all guest tasks and public tasks
        // (Simplified approach - show all guest tasks to any guest user)
        let displayFiles = [];

        files.forEach(file => {
            // Show all tasks (both public and guest tasks)
            displayFiles.push(file);
        });

        res.render("main", {
            files: displayFiles,
            user: req.user || null
        });
    });
});

// Legacy task routes (now with guest support)
app.post('/create', optionalAuth, function (req, res) {
    // Check if user is authenticated
    if (req.user) {
        // Authenticated user - unlimited tasks
        fs.writeFile(`./files/${req.body.title}.txt`, req.body.details, function (err) {
            if (err) {
                console.error('Error creating file:', err);
                return res.status(500).json({ success: false, error: 'Failed to create task' });
            }
            res.redirect('/dashboard');
        });
    } else {
        // Guest user - check task limit
        const guestTaskCount = parseInt(req.cookies.guestTaskCount || '0');
        const MAX_GUEST_TASKS = 2;

        if (guestTaskCount >= MAX_GUEST_TASKS) {
            // Redirect to main page with error
            return res.redirect('/?error=task_limit_reached');
        }

        // Create task for guest with simple naming
        const sanitizedTitle = req.body.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        const filename = `guest_${Date.now()}_${sanitizedTitle}`;

        fs.writeFile(`./files/${filename}.txt`, req.body.details, function (err) {
            if (err) {
                console.error('Error creating guest file:', err);
                return res.redirect('/?error=creation_failed');
            }

            // Update guest task count
            const newCount = guestTaskCount + 1;

            res.cookie('guestTaskCount', newCount, {
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
                httpOnly: false // Allow JavaScript access for counter updates
            });

            res.redirect('/?success=task_created');
        });
    }
});

app.get('/file/:filename', protect, function (req, res) {
    fs.readFile(`./files/${req.params.filename}`, "utf-8", function (err, filedata) {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(404).json({ success: false, error: 'File not found' });
        }
        res.render('show', { filename: req.params.filename, filedata: filedata, user: req.user });
    });
});

app.get('/edit/:filename', protect, function (req, res) {
    res.render('edit', { filename: req.params.filename, user: req.user });
});

app.post('/edit', protect, function (req, res) {
    fs.rename(`./files/${req.body.previous}`, `./files/${req.body.new}`, function (err) {
        if (err) {
            console.error('Error renaming file:', err);
            return res.status(500).json({ success: false, error: 'Failed to update task' });
        }
        res.redirect('/dashboard');
    });
});

app.get('/delete/:filename', protect, function (req, res) {
    fs.unlink(`./files/${req.params.filename}`, function (err) {
        if (err) {
            console.error('Error deleting file:', err);
            return res.status(500).json({ success: false, error: 'Failed to delete task' });
        }
        res.redirect('/dashboard');
    });
});

// Team management routes
const teams = require('./routes/teams');
const projects = require('./routes/projects');
const tasks = require('./routes/tasks');

// Mount API routers
app.use('/api/v1/auth', auth);
app.use('/api/v1/notes', notes);
app.use('/api/v1/teams', teams);
app.use('/api/v1/projects', projects);
app.use('/api/v1/tasks', tasks);

// Error handler middleware
app.use(errorHandler);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

const server = app.listen(
  PORT,
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`.red);
  // Close server & exit process
  server.close(() => process.exit(1));
});
