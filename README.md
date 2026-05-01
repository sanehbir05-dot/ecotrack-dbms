# EcoTrack – DBMS Project

## Overview

EcoTrack is a simple web application built to manage and track environmental or material-related data. The goal of the project is to replace manual record-keeping with a structured system that allows storing, updating, and viewing data efficiently.

## Features

* Add and manage records through a web interface
* Store data securely in a PostgreSQL database
* Backend API for handling requests and database operations
* Clean frontend for basic interaction

## Tech Stack

* **Frontend:** React (Vite)
* **Backend:** Flask (Python)
* **Database:** PostgreSQL

## How It Works

The user interacts with the frontend interface.
Requests are sent to the Flask backend through API calls.
The backend processes the request, communicates with the database, and returns the result to the frontend.

## Setup Instructions

### Backend

```bash
cd "C:\dbms proj"
python ecotrack_api.py
```

Runs on: http://127.0.0.1:5000

### Frontend

```bash
cd "C:\dbms proj\ecotrack-frontend"
npm install
npm run dev
```

Runs on: http://localhost:5173

## Database Setup

Execute the provided SQL files:

* `ecotrack_schema.sql`
* `ecotrack_seed.sql`

## Notes

* Environment variables are used for database credentials
* `.env` file is not included for security reasons

## Author

Saneh
