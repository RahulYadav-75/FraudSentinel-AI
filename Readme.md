# 🛡️ FraudSentinel AI

### AI-Powered Financial Transaction Fraud Detection System

FraudSentinel AI is a machine learning-based application designed to analyze financial transactions, estimate fraud risk, and help users monitor suspicious activity through an interactive dashboard. It combines a machine learning model, a FastAPI backend, a React frontend, and a PostgreSQL database to support transaction analysis and fraud investigation workflows.

> **Project status:** Functional MVP — based on the implemented features and local testing. Production readiness requires additional security, deployment, and real-world validation.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Machine Learning Workflow](#-machine-learning-workflow)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation and Setup](#-installation-and-setup)
- [API Documentation](#-api-documentation)
- [Database](#-database)
- [Model Evaluation](#-model-evaluation)
- [Limitations](#-limitations)
- [Future Improvements](#-future-improvements)
- [Author](#-author)

---

## 🎯 Overview

FraudSentinel AI provides a workflow for submitting financial transactions, generating fraud predictions, reviewing prediction history, monitoring alerts, and managing investigations.

The application is organized into three main layers:

1. **Frontend:** An interactive React dashboard for transaction analysis and fraud monitoring.
2. **Backend:** A FastAPI application that validates requests, prepares model inputs, generates predictions, and exposes REST APIs.
3. **Database:** PostgreSQL storage for prediction records and investigation information.

The machine learning model is loaded from a serialized model bundle, allowing the backend to reuse the trained model during prediction requests.

## ❗ Problem Statement

Financial transaction fraud can be difficult to detect because suspicious transactions may represent only a small portion of total transaction activity. Manual review alone can be time-consuming, and reviewing every transaction equally may not be practical.

FraudSentinel AI aims to support this process by:

- Estimating the probability that a transaction belongs to the fraud class.
- Assigning a risk category based on the configured decision threshold.
- Recording predictions for subsequent review.
- Providing a dashboard for examining alerts and prediction history.
- Supporting investigation status updates and analyst notes.

**Important:** A model prediction is a risk estimate, not proof that a transaction is fraudulent.

## ✨ Key Features

### 1. Transaction Fraud Prediction

- Accepts transaction information through a REST API.
- Processes transaction type and numerical transaction attributes.
- Uses a loaded machine learning model to estimate fraud probability.
- Applies a configured decision threshold to generate a prediction.
- Returns prediction and risk information to the caller.

### 2. Fraud Monitoring Dashboard

- Provides a frontend for interacting with the application.
- Displays transaction prediction information and monitoring data.
- Supports reviewing recorded predictions and alerts.

### 3. Prediction History

- Retrieves previously recorded prediction results.
- Supports a configurable result limit.
- Supports start-date and end-date filtering where implemented.

### 4. Fraud Alerts

- Provides an API for retrieving alert records.
- Supports filtering by date range and result limit.
- Helps users review potentially suspicious activity.

### 5. Investigation Management

- Supports investigation status updates.
- Allows analyst notes to be recorded.
- Provides an API for retrieving investigation records.

### 6. REST API Documentation

- Uses FastAPI to expose documented endpoints.
- Provides an interactive Swagger UI for testing API requests.
- Includes health and model-status endpoints.

---

## 🏗️ System Architecture

```text
                 ┌────────────────────────┐
                 │     React Frontend     │
                 │    Vite Dashboard      │
                 └───────────┬────────────┘
                             │ HTTP / JSON
                             ▼
                 ┌────────────────────────┐
                 │      FastAPI Backend   │
                 │                        │
                 │ Request Validation     │
                 │ Feature Preparation    │
                 │ Prediction APIs        │
                 │ History and Alerts     │
                 │ Investigation APIs     │
                 └────────┬────────┬──────┘
                          │        │
               ┌──────────▼───┐  ┌─▼────────────────┐
               │ ML Model     │  │ PostgreSQL       │
               │ Model Bundle │  │ Prediction Data  │
               │              │  │ Investigation    │
               └──────────────┘  └──────────────────┘
```

### Prediction Flow

1. A user submits transaction details from the frontend or API documentation.
2. FastAPI validates the incoming request.
3. The backend prepares the features expected by the trained model, including transaction-type encoding and feature alignment.
4. The model calculates a fraud probability.
5. The backend applies the configured classification threshold and prepares the response.
6. The prediction is recorded in PostgreSQL.
7. The frontend can retrieve stored records and display monitoring information.

---

## 🧰 Technology Stack

| Component            | Technology                              |
| -------------------- | --------------------------------------- |
| Programming language | Python, JavaScript                      |
| Frontend             | React                                   |
| Frontend tooling     | Vite                                    |
| Backend framework    | FastAPI                                 |
| API server           | Uvicorn                                 |
| Machine learning     | Scikit-learn-compatible model interface |
| Model serialization  | Joblib                                  |
| Data processing      | Pandas                                  |
| Database             | PostgreSQL                              |
| Database driver      | Psycopg                                 |
| Configuration        | python-dotenv                           |
| API testing          | FastAPI Swagger UI                      |
| Version control      | Git and GitHub                          |

_The table describes the technologies used in the implemented setup; add any additional libraries only if they are present in the project._

---

## 🤖 Machine Learning Workflow

The model inference workflow includes the following steps:

### 1. Input Features

The prediction API currently accepts the following transaction fields:

| Feature         | Description                                   |
| --------------- | --------------------------------------------- |
| `step`          | Transaction time-step value                   |
| `type`          | Transaction type, such as `TRANSFER`          |
| `amount`        | Transaction amount                            |
| `oldbalanceOrg` | Origin account balance before the transaction |

### 2. Feature Preparation

- Transaction-type values are encoded into model-compatible columns.
- Features are aligned with the feature list used during training.
- Missing encoded columns are handled through feature reindexing as implemented in the backend.

### 3. Probability Estimation

The backend obtains the fraud-class probability from the loaded model.

### 4. Classification

The probability is compared with the configured decision threshold to determine the predicted class and risk category.

### 5. Persistence

The prediction response is recorded in the `fraud_predictions` table for subsequent retrieval and review.

### Model Evaluation

Model quality should be assessed using appropriate classification metrics, including:

- Precision
- Recall
- F1-score
- ROC-AUC
- PR-AUC
- Confusion matrix

Fraud datasets may be highly imbalanced. Therefore, accuracy alone is not sufficient to establish model effectiveness.

**Evaluation results:** Add the measured metrics from the actual evaluation output before publishing performance claims.

---

## 📁 Project Structure

The following is a representative structure based on the current application setup. Adjust filenames to match the final repository.

```text
FraudSentinel-AI/
│
├── backend/
│   ├── main.py
│   ├── .env
│   └── requirements.txt
│
├── models/
│   └── fraudsentinel_model.pkl
│
├── frontend/
│   ├── src/
│   │   └── App.jsx
│   ├── package.json
│   └── index.html
│
├── .gitignore
└── README.md
```

> The model path in the backend is configured relative to the project root as `models/fraudsentinel_model.pkl`. Confirm that the model file and frontend directory match your actual repository before committing this structure.

---

## ⚙️ Prerequisites

Install or configure the following before running the application:

- Python
- Node.js and npm
- PostgreSQL
- Git
- A trained model bundle at the configured model path
- A PostgreSQL database and the tables expected by the backend

---

## 🚀 Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/RahulYadav-75/FraudSentinel-AI.git
cd FraudSentinel-AI
```

If the repository URL or capitalization differs, replace it with the actual GitHub URL.

### 2. Set Up the Python Environment

From the project root, create and activate a virtual environment:

**Windows PowerShell**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install the backend dependencies:

```powershell
cd backend
pip install -r requirements.txt
```

Ensure `requirements.txt` contains all packages imported by the backend.

### 3. Configure Environment Variables

Create a `.env` file in the backend directory and add the database connection settings required by your implementation.

For example:

```env
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/YOUR_DATABASE
```

This is an example configuration, not a claim that the backend reads `DATABASE_URL`. Use the exact variable names expected by your database connection code.

Never commit real passwords, API keys, or other secrets to GitHub.

### 4. Configure PostgreSQL

- Start the PostgreSQL service.
- Create the database used by the application.
- Create the prediction and investigation tables with the required columns.
- Ensure the database user has the necessary permissions.
- Verify the connection settings before starting the API.

The prediction workflow uses `fraud_predictions`. Investigation management uses `fraud_investigations`; verify the table schemas and constraints against the backend SQL statements.

### 5. Add the Trained Model

Ensure the model bundle exists at:

```text
models/fraudsentinel_model.pkl
```

The backend expects the serialized bundle to contain the model and the feature and threshold information required by its loading and prediction logic.

Only use a trusted model file. Loading serialized Python objects can execute code during deserialization.

### 6. Start the Backend

From the `backend` directory, run:

```powershell
uvicorn main:app --reload
```

The API should be available at:

```text
http://127.0.0.1:8000
```

Open the interactive API documentation:

```text
http://127.0.0.1:8000/docs
```

### 7. Start the Frontend

Open a second terminal and navigate to the directory containing the frontend's `package.json`.

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

With the default Vite configuration, the frontend is typically available at:

```text
http://localhost:5173
```

Ensure that the frontend API requests point to the running backend. The backend's configured CORS origin should match the frontend origin.

---

## 🔌 API Documentation

The FastAPI Swagger interface is available at:

`http://127.0.0.1:8000/docs`

### Implemented Endpoint Groups

| Method | Endpoint                          | Purpose                           |
| ------ | --------------------------------- | --------------------------------- |
| `GET`  | `/`                               | Root endpoint                     |
| `GET`  | `/health`                         | Health check                      |
| `GET`  | `/model-status`                   | Model loading status              |
| `POST` | `/predict`                        | Generate a transaction prediction |
| `GET`  | `/history`                        | Retrieve prediction history       |
| `GET`  | `/alerts`                         | Retrieve fraud alerts             |
| `GET`  | `/dashboard-stats`                | Retrieve dashboard statistics     |
| `GET`  | `/investigations`                 | Retrieve investigation records    |
| `PUT`  | `/investigations/{prediction_id}` | Update an investigation           |

### Example Prediction Request

```json
{
  "step": 100,
  "type": "TRANSFER",
  "amount": 50000,
  "oldbalanceOrg": 50000
}
```

Submit this JSON to `POST /predict` through Swagger UI or another API client.

The response contains prediction information generated by the configured model. The exact probability, risk category, and prediction depend on the loaded model and its threshold.

This sample is for API testing only; it does not represent a verified fraud case.

### History and Alerts

The history and alert endpoints support a result limit and date filtering where implemented. Consult `/docs` for the exact query parameter names, formats, and response schemas.

### Investigation Updates

The investigation endpoint accepts an update payload defined by the backend's `InvestigationUpdate` model. Use Swagger UI to inspect the exact required fields and test an update.

---

## 🗄️ Database

PostgreSQL is used to persist application data.

### Prediction Records

The `fraud_predictions` table stores prediction records created by the prediction API.

### Investigation Records

The `fraud_investigations` table stores investigation-related information, including the associated prediction and fields used to track investigation status and analyst notes.

The investigation update query uses an `ON CONFLICT (prediction_id)` operation. Therefore, `prediction_id` must have a matching unique constraint or primary key.

The exact database schema should be maintained alongside the backend code so that table columns, types, constraints, and SQL statements remain consistent.

---

## 📊 Model Evaluation

A reliable evaluation section should report results measured on a held-out test set.

| Metric    | Result              |
| --------- | ------------------- |
| Precision | Add verified result |
| Recall    | Add verified result |
| F1-score  | Add verified result |
| ROC-AUC   | Add verified result |
| PR-AUC    | Add verified result |

For imbalanced fraud detection, precision and recall are particularly important:

- **Precision:** Of the transactions flagged as fraudulent, how many were actually fraudulent?
- **Recall:** Of the actual fraudulent transactions, how many did the model identify?
- **F1-score:** The harmonic mean of precision and recall.
- **PR-AUC:** Summarizes the precision-recall trade-off across thresholds.
- **ROC-AUC:** Measures how well the model ranks positive cases above negative cases across thresholds.

The selected threshold affects the balance between missed fraud cases and false alerts. Threshold selection should reflect the intended review process and the costs of false positives and false negatives.

Do not publish placeholder metrics as actual results.

---

## ⚠️ Limitations

- Predictions depend on the quality and representativeness of the training data.
- A model-generated fraud probability is not a guarantee of fraud or legitimate activity.
- The sample request does not establish the model's real-world performance.
- The application currently represents a locally configured MVP, not a verified production deployment.
- Production use requires authentication, authorization, secure secret management, monitoring, robust error handling, and further validation.
- Real-world performance must be evaluated on appropriately separated and representative data.

---

## 🔮 Future Improvements

- Deploy the frontend and backend to cloud infrastructure.
- Add authentication and role-based access for analysts.
- Add automated tests for API endpoints and database operations.
- Improve logging, monitoring, and error reporting.
- Add model versioning and reproducible evaluation reports.
- Monitor data drift and model performance over time.
- Add explainability tools to help analysts understand model predictions.
- Add configurable alert thresholds and analyst review workflows.
- Create a CI/CD pipeline for automated testing and deployment.

---

## 👨‍💻 Author

**Rahul Yadav**

B.Tech — Computer Science and Engineering (Data Science)

- GitHub: [RahulYadav-75](https://github.com/RahulYadav-75)
- LinkedIn: [Rahul Yadav](https://www.linkedin.com/in/rahul-yadav-a5645830a/)

---

## 📄 License

Choose a license before publishing the project for public reuse. If no license has been added, the repository's reuse permissions should not be assumed.
