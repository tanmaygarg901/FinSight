# FinSight Financial Analytics Platform

A comprehensive financial analytics platform built with **Python** and **SQL**, demonstrating advanced data science and engineering techniques for financial data processing and analysis.

## Project Overview

FinSight is designed to showcase advanced **Python programming** and **SQL database management** skills for data science and engineering roles. The platform provides sophisticated financial analytics through:

- **Advanced SQL Analytics**: Complex queries with window functions, CTEs, and statistical analysis
- **ETL Data Pipeline**: Robust data processing with pandas and automated categorization
- **Machine Learning**: Expense prediction and spending pattern clustering
- **Financial Health Scoring**: Algorithmic assessment of financial wellness
- **Anomaly Detection**: Statistical outlier identification for unusual transactions

## Technical Stack

### Core Technologies
- **Python 3.9+**: Primary programming language
- **PostgreSQL**: Advanced SQL database with analytics functions
- **FastAPI**: Modern Python web framework for API development
- **SQLAlchemy**: Python SQL toolkit and ORM
- **Pandas**: Data manipulation and analysis
- **NumPy**: Numerical computing
- **Scikit-learn**: Machine learning algorithms

### Data Science Libraries
- **Matplotlib/Seaborn**: Data visualization
- **Plotly**: Interactive analytics dashboards
- **Jupyter**: Data science notebooks (optional)

## Key Features

### 1. Advanced SQL Analytics (`analytics/sql_analytics.py`)
- **Complex Window Functions**: Month-over-month trend analysis
- **Statistical Aggregations**: Percentile rankings and rolling averages
- **Budget Variance Analysis**: JOIN operations with variance calculations
- **Financial Health Scoring**: Multi-factor algorithmic assessment

### 2. ETL Data Pipeline (`data_pipeline/etl_processor.py`)
- **Automated Data Extraction**: CSV processing with encoding detection
- **Data Quality Management**: Duplicate removal and validation
- **Feature Engineering**: Merchant extraction and payment method detection
- **Batch Processing**: Efficient database loading with error handling

### 3. Machine Learning Analytics (`notebooks/financial_analysis.py`)
- **Spending Pattern Clustering**: K-means analysis of user behavior
- **Expense Category Prediction**: Random Forest classification
- **Anomaly Detection**: Statistical outlier identification
- **Financial Health Modeling**: Multi-factor scoring algorithm

### 4. Database Schema (`migrations/001_initial_schema.sql`)
- **Normalized Design**: Proper relationships and constraints
- **Performance Optimization**: Strategic indexing for analytics queries
- **Advanced Features**: JSONB support, triggers, and stored functions
- **Data Integrity**: Check constraints and foreign key relationships

## Installation & Setup

### Prerequisites
- Python 3.9+
- PostgreSQL 12+
- pip (Python package manager)

### 1. Clone Repository
```bash
git clone <repository-url>
cd FinSight/backend
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Database Setup
```bash
# Create PostgreSQL database
createdb finsight

# Run migrations
psql -d finsight -f migrations/001_initial_schema.sql
```

### 4. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Update .env with your database credentials
DATABASE_URL=postgresql://username:password@localhost:5432/finsight
```

### 5. Start Application
```bash
# Start FastAPI server
python main.py

# Or use uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### Analytics Endpoints
- `GET /analytics/spending-trends/{user_id}` - Advanced spending trend analysis
- `GET /analytics/budget-variance/{user_id}` - Budget variance with statistical insights
- `GET /analytics/savings-analysis/{user_id}` - Savings and investment analysis
- `GET /analytics/financial-health/{user_id}` - Comprehensive health scoring
- `GET /analytics/expense-insights/{user_id}` - ML-ready expense categorization

### Data Management
- `POST /upload-transactions/{user_id}` - ETL pipeline for transaction data
- `POST /users/` - User account creation
- `GET /database/stats` - Database health and statistics


## Development & Testing

```bash
# Run data science analysis
python notebooks/financial_analysis.py

# Test ETL pipeline
python -c "from data_pipeline.etl_processor import FinancialDataETL; print('ETL module loaded successfully')"

# Test SQL analytics
python -c "from analytics.sql_analytics import FinancialAnalytics; print('Analytics module loaded successfully')"
```
---
