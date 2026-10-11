# ============================================================
# IMPORTS
# Required libraries for API, ML inference and database access
# ============================================================

import os
from pathlib import Path
from typing import Literal, Optional
from datetime import datetime

import joblib
import pandas as pd
import psycopg
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ============================================================
# ENVIRONMENT AND MODEL CONFIGURATION
# ============================================================

# Load environment variables from the backend directory.
BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / ".env")

# Project root is the parent directory of the backend folder.
BASE_DIR = BACKEND_DIR.parent

# Path to the trained model bundle.
MODEL_PATH = BASE_DIR / "models" / "fraudsentinel_model.pkl"


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="FraudSentinel AI",
    description="AI-Based Financial Fraud Detection System",
    version="1.0.0",
)

# Allow the local Vite frontend to communicate with the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# MODEL STATE
# ============================================================

# These variables are populated when the application starts.
model_bundle = None
model_error = None


@app.on_event("startup")
def load_model():
    """Load and validate the trained fraud detection model."""
    global model_bundle, model_error

    try:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")

        bundle = joblib.load(MODEL_PATH)

        # Ensure the bundle contains the fields required by the API.
        required = {
            "model",
            "feature_columns",
            "threshold",
            "model_name",
            "features",
        }

        if not required.issubset(bundle.keys()):
            raise ValueError("Model bundle has an unexpected format.")

        model_bundle = bundle
        model_error = None

        print("FraudSentinel AI model loaded successfully.")

    except Exception as exc:
        model_bundle = None
        model_error = str(exc)

        print(f"Model loading failed: {model_error}")


# ============================================================
# BASIC API ENDPOINTS
# ============================================================


@app.get("/")
def home():
    """Return basic application information."""
    return {
        "project": "FraudSentinel AI",
        "description": "AI-Based Financial Fraud Detection System",
        "status": "running",
    }


@app.get("/health")
def health_check():
    """Check whether the API is responding."""
    return {"status": "healthy"}


@app.get("/model-status")
def model_status():
    """Return the model's current loading status."""
    if model_bundle is None:
        return {
            "status": "not_loaded",
            "model": None,
            "error": model_error,
        }

    return {
        "status": "loaded",
        "model": model_bundle["model_name"],
        "threshold": float(model_bundle["threshold"]),
        "features": model_bundle["features"],
    }


# ============================================================
# PREDICTION INPUT VALIDATION
# ============================================================


class TransactionInput(BaseModel):
    """Validate transaction details received from the frontend."""

    step: int = Field(ge=1, le=100000)

    type: Literal[
        "CASH_IN",
        "CASH_OUT",
        "DEBIT",
        "PAYMENT",
        "TRANSFER",
    ]

    amount: float = Field(gt=0, le=1_000_000_000_000)

    oldbalanceOrg: float = Field(
        ge=0,
        le=1_000_000_000_000,
    )


# ============================================================
# FRAUD PREDICTION ENDPOINT
# ============================================================


@app.post("/predict")
def predict_fraud(transaction: TransactionInput):
    """Predict fraud probability and save the result to PostgreSQL."""

    # Do not accept predictions until the model is available.
    if model_bundle is None:
        raise HTTPException(
            status_code=503,
            detail="Fraud detection model is not loaded.",
        )

    try:
        # Build a single-row DataFrame using the input features.
        row = pd.DataFrame(
            [
                {
                    "step": transaction.step,
                    "type": transaction.type,
                    "amount": transaction.amount,
                    "oldbalanceOrg": transaction.oldbalanceOrg,
                }
            ]
        )

        # Apply one-hot encoding to the transaction type.
        row_encoded = pd.get_dummies(row, columns=["type"])

        # Align input columns with the exact training-time schema.
        row_encoded = row_encoded.reindex(
            columns=model_bundle["feature_columns"],
            fill_value=0,
        )

        # Obtain the probability associated with fraud class 1.
        model = model_bundle["model"]
        probabilities = model.predict_proba(row_encoded)[0]
        classes = list(model.classes_)

        if 1 not in classes:
            raise ValueError("Fraud class 1 was not found in the trained model.")

        fraud_index = classes.index(1)
        fraud_probability = float(probabilities[fraud_index])
        threshold = float(model_bundle["threshold"])

        # Assign a risk category using the configured thresholds.
        if fraud_probability >= threshold:
            risk_level = "HIGH"
        elif fraud_probability >= 0.5:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        # Decide whether the transaction should be flagged for review.
        prediction = (
            "FLAG_FOR_REVIEW" if fraud_probability >= threshold else "NOT_FLAGGED"
        )

        # Ensure the database connection is configured.
        database_url = os.getenv("DATABASE_URL")

        if not database_url:
            raise HTTPException(
                status_code=503,
                detail="Database connection is not configured.",
            )

        # Save the prediction. The connection context commits on success.
        try:
            with psycopg.connect(database_url) as conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO fraud_predictions (
                            transaction_type,
                            amount,
                            transaction_step,
                            old_balance_org,
                            fraud_probability,
                            risk_level,
                            prediction,
                            model_name,
                            threshold
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            transaction.type,
                            transaction.amount,
                            transaction.step,
                            transaction.oldbalanceOrg,
                            fraud_probability,
                            risk_level,
                            prediction,
                            model_bundle["model_name"],
                            threshold,
                        ),
                    )

        except Exception as db_exc:
            # Do not report success when persistence fails.
            raise HTTPException(
                status_code=503,
                detail=(
                    "Prediction could not be saved to the database. "
                    "Check the database connection and table."
                ),
            ) from db_exc

        # Return the prediction details to the frontend.
        return {
            "model": model_bundle["model_name"],
            "fraud_probability": round(fraud_probability, 6),
            "fraud_probability_percent": round(
                fraud_probability * 100,
                2,
            ),
            "threshold": threshold,
            "risk_level": risk_level,
            "prediction": prediction,
            "disclaimer": (
                "This is a model estimate, not proof of fraud. "
                "A low score does not guarantee a legitimate transaction."
            ),
        }

    except HTTPException:
        # Preserve intentional HTTP status codes and messages.
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(exc)}",
        ) from exc


# ============================================================
# TRANSACTION HISTORY ENDPOINT
# ============================================================


@app.get("/history")
def get_prediction_history(
    limit: int = 20,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
):
    """Return recent predictions, optionally filtered by date."""

    # Validate the requested number of records.
    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 100.",
        )

    # Reject an invalid date range.
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date must be before end_date.",
        )

    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise HTTPException(
            status_code=503,
            detail="Database connection is not configured.",
        )

    try:
        with psycopg.connect(database_url) as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                        id,
                        transaction_type,
                        amount,
                        transaction_step,
                        old_balance_org,
                        fraud_probability,
                        risk_level,
                        prediction,
                        model_name,
                        threshold,
                        created_at
                    FROM fraud_predictions
                    WHERE (%s IS NULL OR created_at >= %s)
                      AND (%s IS NULL OR created_at <= %s)
                    ORDER BY created_at DESC, id DESC
                    LIMIT %s
                    """,
                    (
                        start_date,
                        start_date,
                        end_date,
                        end_date,
                        limit,
                    ),
                )

                rows = cursor.fetchall()
                columns = [column.name for column in cursor.description]

        # Convert database rows into JSON-compatible dictionaries.
        return [dict(zip(columns, row)) for row in rows]

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Could not retrieve prediction history.",
        ) from exc


# ============================================================
# FRAUD ALERTS ENDPOINT
# ============================================================


@app.get("/alerts")
def get_fraud_alerts(
    limit: int = 50,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
):
    """Return flagged transactions, optionally filtered by date."""

    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 100.",
        )

    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date must be before end_date.",
        )

    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise HTTPException(
            status_code=503,
            detail="Database connection is not configured.",
        )

    try:
        with psycopg.connect(database_url) as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                        id,
                        transaction_type,
                        amount,
                        fraud_probability,
                        risk_level,
                        prediction,
                        created_at
                    FROM fraud_predictions
                    WHERE prediction = %s
                      AND (%s IS NULL OR created_at >= %s)
                      AND (%s IS NULL OR created_at <= %s)
                    ORDER BY created_at DESC, id DESC
                    LIMIT %s
                    """,
                    (
                        "FLAG_FOR_REVIEW",
                        start_date,
                        start_date,
                        end_date,
                        end_date,
                        limit,
                    ),
                )

                rows = cursor.fetchall()
                columns = [column.name for column in cursor.description]

        return [dict(zip(columns, row)) for row in rows]

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Could not retrieve fraud alerts.",
        ) from exc


# ============================================================
# DASHBOARD STATISTICS ENDPOINT
# ============================================================


@app.get("/dashboard-stats")
def get_dashboard_stats():
    """Return transaction totals and fraud probability statistics."""

    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise HTTPException(
            status_code=503,
            detail="Database connection is not configured.",
        )

    try:
        with psycopg.connect(database_url) as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        COUNT(*) AS total_transactions,
                        COUNT(*) FILTER (
                            WHERE prediction = 'FLAG_FOR_REVIEW'
                        ) AS flagged_transactions,
                        COUNT(*) FILTER (
                            WHERE risk_level = 'HIGH'
                        ) AS high_risk_transactions,
                        COALESCE(
                            AVG(fraud_probability),
                            0
                        ) AS avg_fraud_probability
                    FROM fraud_predictions;
                    """)

                row = cursor.fetchone()

        # Convert the average probability to a percentage.
        return {
            "total_transactions": row[0],
            "flagged_transactions": row[1],
            "high_risk_transactions": row[2],
            "avg_fraud_probability": round(
                float(row[3]) * 100,
                2,
            ),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Dashboard stats error: {str(exc)}",
        ) from exc


# ============================================================
# INVESTIGATION INPUT VALIDATION
# ============================================================


class InvestigationUpdate(BaseModel):
    """Validate investigation status and analyst notes."""

    review_status: Literal[
        "PENDING",
        "UNDER_REVIEW",
        "RESOLVED",
    ]

    analyst_notes: str = Field(
        default="",
        max_length=5000,
    )


# ============================================================
# UPDATE INVESTIGATION ENDPOINT
# ============================================================


@app.put("/investigations/{prediction_id}")
def update_investigation(
    prediction_id: int,
    payload: InvestigationUpdate,
):
    """Create or update an investigation for a flagged transaction."""

    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise HTTPException(
            status_code=503,
            detail="Database connection is not configured.",
        )

    try:
        with psycopg.connect(database_url) as conn:
            with conn.cursor() as cursor:

                # Confirm that the prediction exists and was flagged.
                cursor.execute(
                    """
                    SELECT id
                    FROM fraud_predictions
                    WHERE id = %s
                      AND prediction = 'FLAG_FOR_REVIEW'
                    """,
                    (prediction_id,),
                )

                if cursor.fetchone() is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Flagged transaction not found.",
                    )

                # Insert a new investigation or update the existing one.
                cursor.execute(
                    """
                    INSERT INTO fraud_investigations (
                        prediction_id,
                        review_status,
                        analyst_notes
                    )
                    VALUES (%s, %s, %s)
                    ON CONFLICT (prediction_id)
                    DO UPDATE SET
                        review_status = EXCLUDED.review_status,
                        analyst_notes = EXCLUDED.analyst_notes,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING
                        prediction_id,
                        review_status,
                        analyst_notes,
                        updated_at
                    """,
                    (
                        prediction_id,
                        payload.review_status,
                        payload.analyst_notes,
                    ),
                )

                row = cursor.fetchone()

        # Return the saved investigation details.
        return {
            "prediction_id": row[0],
            "review_status": row[1],
            "analyst_notes": row[2],
            "updated_at": row[3].isoformat(),
        }

    except HTTPException:
        # Preserve intentional HTTP errors such as 404 and 503.
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Investigation update error: {str(exc)}",
        ) from exc


# ============================================================
# FETCH INVESTIGATIONS ENDPOINT
# ============================================================


@app.get("/investigations")
def get_investigations():
    """Return flagged transactions and their investigation details."""

    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise HTTPException(
            status_code=503,
            detail="Database connection is not configured.",
        )

    try:
        with psycopg.connect(database_url) as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        p.id,
                        p.transaction_type,
                        p.amount,
                        p.fraud_probability,
                        p.risk_level,
                        COALESCE(i.review_status, 'PENDING'),
                        COALESCE(i.analyst_notes, '')
                    FROM fraud_predictions p
                    LEFT JOIN fraud_investigations i
                        ON i.prediction_id = p.id
                    WHERE p.prediction = 'FLAG_FOR_REVIEW'
                    ORDER BY p.created_at DESC;
                    """)

                rows = cursor.fetchall()

        # Convert database results into JSON-compatible objects.
        return [
            {
                "prediction_id": row[0],
                "transaction_type": row[1],
                "amount": float(row[2]),
                "fraud_probability": float(row[3]),
                "risk_level": row[4],
                "review_status": row[5],
                "analyst_notes": row[6],
            }
            for row in rows
        ]

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Investigation fetch error: {str(exc)}",
        ) from exc
