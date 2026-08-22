# KEMRI SACCO — Member Portal

React/Vite frontend that replaces the Holiday Savings Scheme Google Form. Calls the `sms-automation` backend for registration and (soon) payment initiation.

## Setup

```bash
npm install
```

By default it points at `http://localhost:3000` (your local backend). To change this, create a `.env` file:

```
VITE_API_URL=http://localhost:3000
```

Run it:

```bash
npm run dev
```

Opens on `http://localhost:5173`. Make sure your backend (`sms-automation`) is running at the same time — this portal is just a frontend, it has no logic of its own beyond calling the API.

## What's built so far

- Member registration form (`/`) — replaces the Google Form, submits to `POST /api/members`

## Not yet built

- Payment page (STK push trigger after registration)
- Login/member dashboard
- Any routing beyond the single registration page
