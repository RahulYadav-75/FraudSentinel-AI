
-- FraudSentinel-AI: Fraud Analysis Queries

-- 1. Total number of transactions
SELECT COUNT(*) AS total_transactions
FROM transactions;

-- 2. Fraud vs legitimate predictions
SELECT
    predicted_fraud,
    COUNT(*) AS total_predictions
FROM fraud_predictions
GROUP BY predicted_fraud;

-- 3. Average fraud probability
SELECT
    ROUND(AVG(fraud_probability), 5) AS avg_fraud_probability
FROM fraud_predictions;

-- 4. High-risk transactions (probability >= 0.80)
SELECT
    t.transaction_id,
    t.amount,
    t.transaction_type,
    p.fraud_probability,
    p.model_version,
    p.predicted_at
FROM transactions AS t
JOIN fraud_predictions AS p
    ON t.transaction_id = p.transaction_id
WHERE p.fraud_probability >= 0.80
ORDER BY p.fraud_probability DESC;

-- 5. Prediction count by model version
SELECT
    model_version,
    COUNT(*) AS total_predictions,
    ROUND(AVG(fraud_probability), 5) AS avg_probability
FROM fraud_predictions
GROUP BY model_version
ORDER BY total_predictions DESC;
