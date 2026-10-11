# FraudSentinel AI — System Architecture

## 1. Project Overview

FraudSentinel AI is a machine-learning-based application designed to identify potentially fraudulent financial transactions. It combines a React frontend, a FastAPI backend, a trained machine-learning model, and PostgreSQL database integration.

## 2. System Components

### Frontend

- **Technologies:** React, Vite, JavaScript, CSS
- Provides the user interface.
- Collects transaction information and displays prediction results returned by the backend.

### Backend API

- **Technologies:** Python, FastAPI, Uvicorn
- Receives requests from the frontend.
- Validates and prepares transaction input.
- Loads the trained model and returns prediction results through API responses.

### Machine Learning Model

- **Model artifact:** `models/fraudsentinel_model.pkl`
- Used by the backend to generate fraud predictions.
- Input fields and preprocessing must match the model's training pipeline.

### Database

- **Technology:** PostgreSQL
- Intended for structured data storage and database operations.
- Document actual tables, connections, and persistence behavior after checking the implementation.

## 3. High-Level Architecture

```text
+---------------------------+
|       User / Browser      |
+-------------+-------------+
              |
              v
+---------------------------+
|    React + Vite Frontend  |
+-------------+-------------+
              |
              | HTTP API Request
              v
+---------------------------+
|       FastAPI Backend     |
| Input Validation          |
| Data Preparation          |
| Prediction Processing     |
+-------------+-------------+
              |
              v
+---------------------------+
|  Trained ML Model (.pkl)  |
+-------------+-------------+
              |
              v
+---------------------------+
|     Prediction Response   |
+-------------+-------------+
              |
              v
+---------------------------+
|       React Frontend      |
+---------------------------+

       PostgreSQL
  Database Integration
 (as implemented/configured)
```

## 4. Prediction Workflow

1. The user enters transaction information in the frontend.
2. The frontend sends the information to a backend API endpoint.
3. The backend validates and prepares the input features.
4. The trained model generates a prediction.
5. The backend returns the result to the frontend.
6. The frontend displays the result to the user.

The exact endpoint paths, request fields, response format, and prediction labels must match the implementation in `backend/main.py`.

## 5. Technology Stack

| Component        | Technology                   |
| ---------------- | ---------------------------- |
| Frontend         | React, Vite, JavaScript, CSS |
| Backend          | Python, FastAPI, Uvicorn     |
| Machine Learning | scikit-learn, Joblib         |
| Database         | PostgreSQL                   |
| Database Driver  | psycopg                      |
| Version Control  | Git, GitHub                  |

## 6. Local Development

### Backend

From the project root, activate the virtual environment and install dependencies:

```powershell
pip install -r backend/requirements.txt
```

Start the API with:

```powershell
uvicorn backend.main:app --reload
```

If the module layout or import path differs, adjust the command to match the actual project structure.

### Frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite.

## 7. Security Considerations

- Never commit `.env` files, passwords, API keys, or database credentials.
- Validate all user-supplied transaction data.
- Keep model input features consistent with the training pipeline.
- Restrict database access using appropriate permissions.
- Treat model predictions as risk signals, not definitive proof of fraud.
- Configure production deployment, authentication, logging, and monitoring before exposing the application publicly.

## 8. Future Improvements

- Add automated model evaluation and tests.
- Record prediction history only when appropriate and with suitable safeguards.
- Add model versioning and monitoring.
- Improve API error handling and input validation.
- Add deployment documentation and architecture diagrams.

## 9. Implementation Notes

This document describes the high-level architecture. Verify endpoints, database operations, model input features, and response fields against the source code before treating them as implemented features.
