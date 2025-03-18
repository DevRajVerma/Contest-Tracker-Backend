# Contest Tracker - Documentation

## Project Overview

Contest Tracker is a web application built using the MERN stack (MongoDB, Express.js, React.js, Node.js) that fetches and displays upcoming, ongoing, and past programming contests from Codeforces, CodeChef, and LeetCode. Users can filter contests by platform, bookmark contests they're interested in, and access solutions for past contests from YouTube.

## Features

- **Contest Listing**: View upcoming, ongoing, and past programming contests with details including start time, duration, and time remaining.
- **Platform Filtering**: Filter contests by one or more platforms (Codeforces, CodeChef, LeetCode).
- **Bookmarking**: Save contests of interest for quick reference.
- **Solution Links**: Access solution videos for past contests from YouTube.
- **Manual Solution Management**: Administrators can manually add solution links to past contests.
- **Auto-fetch Solutions**: (Bonus) Automatically fetch solution videos from YouTube based on contest names.
- **Responsive Design**: (Bonus) Mobile and tablet-friendly interface.
- **Theme Switching**: (Bonus) Toggle between light and dark mode.

## Tech Stack

- **Frontend**:
  - React.js
  - React Router for navigation
  - React Bootstrap for UI components
  - Axios for API requests
  - Context API for state management

- **Backend**:
  - Node.js
  - Express.js
  - MongoDB with Mongoose
  - Node-cron for scheduled tasks
  - Axios for API requests to contest platforms

## API Documentation

### Contests API

#### GET /api/contests
- **Description**: Get all contests with optional filtering
- **Query Parameters**:
  - `platform` (optional): Comma-separated list of platforms (e.g., Codeforces,CodeChef)
  - `status` (optional): Contest status (upcoming, ongoing, past)
- **Response**: Array of contest objects

#### PATCH /api/contests/:id/solution
- **Description**: Update the solution link for a contest
- **Parameters**:
  - `id`: Contest ID
- **Request Body**:
  - `solutionLink`: YouTube video URL
- **Response**: Updated contest object

### Bookmarks API

#### GET /api/bookmarks/:userId
- **Description**: Get bookmarks for a specific user
- **Parameters**:
  - `userId`: User ID
- **Response**: Array of bookmark objects with populated contest information

#### POST /api/bookmarks
- **Description**: Create a new bookmark
- **Request Body**:
  - `contestId`: Contest ID
  - `userId`: User ID
- **Response**: Created bookmark object

#### DELETE /api/bookmarks/:id
- **Description**: Delete a bookmark
- **Parameters**:
  - `id`: Bookmark ID
- **Response**: Success message

## Data Models

### Contest Model
```javascript
{
  name: String,
  platform: String, // Codeforces, CodeChef, or LeetCode
  url: String,
  startTime: Date,
  endTime: Date,
  duration: Number, // in minutes
  status: String, // upcoming, ongoing, or past
  solutionLink: String // YouTube video URL (optional)
}
```

### Bookmark Model
```javascript
{
  contestId: ObjectId, // Reference to Contest model
  userId: String // User identifier
}
```

## Installation and Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- NPM or Yarn

### Backend Setup
1. Clone the repository
2. Navigate to the backend directory: `cd contest-tracker/backend`
3. Install dependencies: `npm install`
4. Create a `.env` file with the following variables:
   ```
   MONGODB_URI=mongodb://localhost:27017/contest-tracker
   PORT=5000
   YOUTUBE_API_KEY=your_youtube_api_key (optional)
   YOUTUBE_CHANNEL_ID=your_channel_id (optional)
   ```
5. Start the backend server: `npm start`

### Frontend Setup
1. Navigate to the frontend directory: `cd contest-tracker/frontend`
2. Install dependencies: `npm install`
3. Start the development server: `npm start`
4. The application will be available at: `http://localhost:3000`

## Running the Application

1. Make sure MongoDB is running
2. Start the backend server: `cd backend && npm start`
3. In a separate terminal, start the frontend server: `cd frontend && npm start`
4. Access the application in your browser at: `http://localhost:3000`