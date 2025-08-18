<<<<<<< HEAD
# TaskBuddy API

A secure task management API with JWT authentication, built with Node.js, Express, and MongoDB.

## Features

- 🔐 **JWT Authentication** - Secure user authentication with JSON Web Tokens
- 🔒 **Role-Based Access Control** - Different permissions for users and admins
- 🛡️ **Security** - Helmet.js, rate limiting, data sanitization, and more
- 📝 **CRUD Operations** - Full CRUD functionality for notes
- 🎯 **Input Validation** - Request validation using Joi
- 🗄️ **MongoDB** - Optimized schema design with Mongoose

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- MongoDB (local or cloud)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd taskbuddy-api
   ```

2. Install dependencies:
=======

# 📝 Task Buddy - A Simple Todo/Task Manager

**Task Buddy** is a lightweight, full-stack task management web application built using **Node.js**, **Express.js**, and **EJS** templating. It helps users keep track of their daily tasks in a simple and organized way.

---

## 🚀 Features

- ➕ Add new tasks
- ✅ Mark tasks as complete or incomplete
- 🗑️ Delete tasks
- 📆 Sort tasks by completion status
- 📦 Data persistence using MongoDB (if implemented)
- 🎨 Server-side rendered views with EJS

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Templating:** EJS
- **Styling:** CSS (optional Bootstrap/Tailwind)
- **Database:** MongoDB (or file-based if not used)

---

## 📁 Project Structure

```

task-buddy/
├── public/             # Static assets (CSS, JS)
├── views/              # EJS templates
│   ├── index.ejs
│   └── partials/
├── routes/             # Route definitions
├── controllers/        # (Optional) Business logic
├── models/             # Mongoose models (if MongoDB used)
├── app.js              # Main Express application
└── package.json

````

---

## 🧑‍💻 Installation & Running Locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/task-buddy.git
   cd task-buddy
````

2. **Install dependencies**

>>>>>>> aa12b5504bd98f2c87746347ebab72e9e955322b
   ```bash
   npm install
   ```

<<<<<<< HEAD
3. Create a `.env` file in the root directory and add your environment variables:
   ```env
   NODE_ENV=development
   PORT=3000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRE=30d
   JWT_COOKIE_EXPIRE=30
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user
- `GET /api/v1/auth/logout` - Logout user

### Notes

- `GET /api/v1/notes` - Get all notes (authenticated)
- `GET /api/v1/notes/:id` - Get single note (authenticated)
- `POST /api/v1/notes` - Create new note (authenticated)
- `PUT /api/v1/notes/:id` - Update note (authenticated)
- `DELETE /api/v1/notes/:id` - Delete note (authenticated)

## Security Features

- **Helmet.js** - Sets various HTTP headers for security
- **Rate Limiting** - Prevents brute force attacks
- **Data Sanitization** - Protects against NoSQL injection
- **XSS Protection** - Prevents cross-site scripting attacks
- **HPP** - Protects against HTTP Parameter Pollution
- **JWT** - Secure token-based authentication
- **Password Hashing** - Bcrypt for password security

## Environment Variables

- `NODE_ENV` - Application environment (development/production)
- `PORT` - Port to run the server on
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT
- `JWT_EXPIRE` - JWT expiration time
- `JWT_COOKIE_EXPIRE` - Cookie expiration time

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.
=======
3. **(Optional) Set up environment variables**

   If you're using MongoDB or environment config:

   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/taskbuddy
   ```

4. **Run the app**

   ```bash
   npm start
   ```

5. **Visit in browser**

   ```
   http://localhost:3000
   ```

---

## ✨ Future Improvements

* 🔐 User authentication (login/signup)
* 📱 Responsive design
* 📅 Due dates and reminders
* 📊 Task analytics (completed vs pending stats)
* 🌓 Dark mode support

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to fork the repo and submit a pull request.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 🙋‍♂️ Author

Made  by **Daksh Sharma**
📧 [daksh.sharma@cmr.edu.in](mailto:daksh.sharma@cmr.edu.in)

---

## ⭐ Show your support

If you found this project helpful, please ⭐ the repository and share it!

```

Ready to upload?
```
>>>>>>> aa12b5504bd98f2c87746347ebab72e9e955322b
