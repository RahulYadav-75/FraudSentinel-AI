# FraudSentinel AI — Database Documentation

## 1. Overview

FraudSentinel AI uses PostgreSQL for database integration. The backend uses the `psycopg` Python driver to support PostgreSQL connectivity.

The actual database schema and persistence features must be verified against the project's source code.

## 2. Technology Stack

- **Database:** PostgreSQL
- **Python driver:** psycopg
- **Backend:** FastAPI
- **Configuration:** Environment variables

## 3. Database Configuration

Database credentials should be stored in environment variables and must not be committed to GitHub.

Example configuration:

```env
DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME
```

This is an example only. Use the variable names expected by the backend code.

## 4. Database Workflow

1. The backend reads database configuration.
2. A connection to PostgreSQL is established.
3. The backend executes database queries when required.
4. Errors are handled appropriately.
5. Connections are closed or returned to the connection pool.

Verify these steps against the actual implementation before treating them as completed features.

## 5. Database Schema

The actual database name, tables, columns, primary keys, foreign keys, and constraints have not been documented here because they must be confirmed from the real schema.

For every table, document:

- Table name and purpose
- Column names and data types
- Primary and foreign keys
- Relationships and constraints
- Indexes
- Queries used by the backend

## 6. Local Setup

1. Install and start PostgreSQL.
2. Create the development database.
3. Configure the required environment variables.
4. Apply the project's schema or migrations.
5. Start the backend and verify database connectivity.

Use the actual database name and setup commands for this project.

## 7. Security

- Never upload `.env` files or database credentials.
- Ensure `.env` is included in `.gitignore`.
- Use parameterized SQL queries.
- Grant only the database permissions the application needs.
- Avoid logging sensitive transaction information.
- Back up important data regularly.

## 8. Verification Checklist

- [ ] Confirm the database name.
- [ ] Confirm connection variable names.
- [ ] Document the actual schema.
- [ ] Verify backend database queries.
- [ ] Confirm which data is persisted.
- [ ] Check that `.env` is not tracked by Git.

## 9. Related Files

- `backend/main.py`
- `backend/requirements.txt`
- `.gitignore`
- Backend environment configuration
