# FraudSentinel-AI Database

This directory contains the PostgreSQL schema, database setup instructions, and SQL queries for fraud analysis.

## Directory Structure

```text
database/
├── 01_schema.sql
├── 02_fraud_analysis_queries.sql
├── 03_database_setup.sql
└── README.md
```

## Database

- **DBMS:** PostgreSQL
- **Database name:** `fraudsentinel_db`

## Setup Instructions

1. Install PostgreSQL and start the PostgreSQL server.
2. Connect to PostgreSQL using an administrative account.
3. Create the project database using `03_database_setup.sql`, if it does not already exist.
4. Connect to `fraudsentinel_db`.
5. Execute `01_schema.sql` to create the tables and indexes.
6. Use `02_fraud_analysis_queries.sql` to explore transaction and prediction data.

## Tables

### `transactions`

Stores transaction details, including amount, transaction type, timestamp, and optional fraud label.

### `fraud_predictions`

Stores model predictions, fraud probabilities, model versions, and prediction timestamps.

## Security

- Do not commit database passwords, API keys, or private credentials.
- Keep environment variables in a local `.env` file excluded from Git.
- Use verified fraud labels when evaluating model performance.
