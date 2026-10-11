
-- FraudSentinel-AI PostgreSQL Schema
-- Matches the existing backend/main.py queries.

CREATE TABLE IF NOT EXISTS fraud_predictions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transaction_type VARCHAR(30) NOT NULL,
    amount NUMERIC(18, 2) NOT NULL CHECK (amount >= 0),
    transaction_step INTEGER NOT NULL,
    old_balance_org NUMERIC(18, 2) NOT NULL,
    fraud_probability DOUBLE PRECISION NOT NULL
        CHECK (fraud_probability BETWEEN 0 AND 1),
    risk_level VARCHAR(10) NOT NULL
        CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    prediction VARCHAR(30) NOT NULL
        CHECK (prediction IN ('FLAG_FOR_REVIEW', 'NOT_FLAGGED')),
    model_name VARCHAR(100) NOT NULL,
    threshold DOUBLE PRECISION NOT NULL
        CHECK (threshold BETWEEN 0 AND 1),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fraud_investigations (
    prediction_id BIGINT PRIMARY KEY
        REFERENCES fraud_predictions(id) ON DELETE CASCADE,
    review_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    analyst_notes TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fraud_predictions_created_at
    ON fraud_predictions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fraud_predictions_prediction
    ON fraud_predictions(prediction);

CREATE INDEX IF NOT EXISTS idx_fraud_predictions_risk_level
    ON fraud_predictions(risk_level);
