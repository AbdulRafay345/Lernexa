# Learnexa

Learnexa is an AI-assisted study platform built with React and Express.  
It provides:
- secure user authentication with Firebase,
- a quiz generator powered by Groq (with smart fallback generation),
- and a timetable generator for structured study planning.

## Tech Stack

**Frontend**
- React (Create React App)
- React Router
- Firebase (Auth, Firestore, Storage, Analytics)
- Tailwind CSS + PostCSS
- Ant Design, Radix UI, Lucide icons

**Backend**
- Node.js + Express
- CORS + dotenv
- Groq API integration for quiz generation

## Project Structure

```txt
Learnexa/
|- src/                      # Frontend source code
|  |- Pages/
|  |  |- Auth/               # Login and Register
|  |  |- Dashboard/          # User dashboard and quiz history
|  |  |- Frontend/           # QuizGenerator and TimeTable pages
|  |- components/            # Shared UI components
|  |- firebase.js            # Firebase initialization
|  |- App.js                 # Route definitions
|
|- backend/
|  |- server.js              # Express API
|  |- package.json
|
|- public/
|- package.json              # Frontend scripts and dependencies
|- tailwind.config.js
|- postcss.config.js
```

## Features

- User authentication (login/register) with Firebase.
- Protected app sections such as dashboard, quiz, and timetable.
- AI quiz generation endpoint (`/generate-quiz`) using Groq.
- Smart fallback question generation when AI is unavailable.
- Timetable generation endpoint (`/generate-timetable`).

## Routes

Frontend routes in `src/App.js`:
- `/` - landing page
- `/auth` - login
- `/auth/register` - registration
- `/dashboard` - dashboard
- `/quiz` - quiz generator
- `/timetable` - timetable generator

## API Endpoints

Backend base URL (local): `http://localhost:4000`

- `GET /`
  - Health/status endpoint.

- `POST /generate-quiz`
  - Generates quiz questions from provided content.
  - Request body fields:
    - `documentContent` (string, required)
    - `quantity` (number, optional, max 10)
    - `quizType` (`mcq` or open ended)
    - `difficulty` (`easy`, `medium`, `hard`)

- `POST /generate-timetable`
  - Generates a timetable based on courses and available hours.

## Environment Variables

Create `backend/.env`:

```env
PORT=4000
GROQ_API_KEY=your_groq_api_key
APPS_SCRIPT_URL=optional_google_apps_script_url
```

Notes:
- Do not commit `.env` files.
- Firebase config is currently defined in `src/firebase.js`.
- Rotate keys immediately if they were ever pushed publicly.

## Local Development Setup

### 1) Clone the repository
```bash
git clone https://github.com/AbdulRafay345/Lernexa.git
cd Lernexa
```

### 2) Install frontend dependencies
```bash
npm install
```

### 3) Install backend dependencies
```bash
cd backend
npm install
cd ..
```

### 4) Add backend env file
Create `backend/.env` using the template above.

### 5) Start backend
```bash
cd backend
npm start
```
Backend runs on `http://localhost:4000`.

### 6) Start frontend (new terminal)
```bash
npm start
```
Frontend runs on `http://localhost:3000`.

## Available Scripts

From project root:
- `npm start` - run frontend in development mode
- `npm run build` - create production frontend build
- `npm test` - run frontend tests

From `backend/`:
- `npm start` - run Express API server

## Security and Git Hygiene

- Keep secrets only in local `.env` files.
- Ensure `.env` and `backend/.env` stay ignored by Git.
- If a key is exposed, revoke and regenerate it before continuing development.

## Future Improvements

- Move frontend Firebase config to environment variables.
- Replace hardcoded API URLs in frontend with a single env-based API base URL.
- Add real linting and CI checks.
- Expand automated tests for frontend pages and backend endpoints.

## License

This project is currently unlicensed. Add a license file if you plan to distribute it publicly.
