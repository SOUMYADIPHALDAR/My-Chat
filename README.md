# Chat Application

A real-time chat application built with Node.js, Express, Socket.io, and MongoDB.

## Features

- Real-time messaging with Socket.io
- User authentication with JWT
- File upload support with Cloudinary
- MongoDB database integration
- RESTful API endpoints

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.io** - Real-time communication
- **MongoDB** - Database
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication
- **Cloudinary** - File upload service
- **Multer** - File upload middleware
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing

### Frontend
- Client directory (to be implemented)

## Project Structure

```
My_Chat/
├── server/
│   ├── index.js                 # Main server file
│   ├── package.json             # Server dependencies
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js           # Database configuration
│   │   │   └── cloudinary.js   # Cloudinary configuration
│   │   ├── controllers/        # Route controllers
│   │   ├── middlewares/
│   │   │   └── multer.middleware.js  # File upload middleware
│   │   ├── models/             # Database models
│   │   ├── routes/             # API routes
│   │   └── utils/
│   │       ├── apiError.js     # Error handling utilities
│   │       ├── apiResponse.js  # Response utilities
│   │       └── asyncHandler.js # Async error handler
│   └── public/
│       └── temp/               # Temporary file storage
└── client/                     # Frontend application (to be implemented)
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd My_Chat
```

2. Install server dependencies:
```bash
cd server
npm install
```

3. Set up environment variables:
Create a `.env` file in the server directory with the following variables:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

4. Start the server:
```bash
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

API endpoints will be documented here as they are implemented.

## Development

- Server runs on port 3000 by default
- MongoDB connection is established on server startup
- Socket.io integration for real-time features
- File upload functionality with Cloudinary integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License.
