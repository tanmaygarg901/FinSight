"""
FinSight Financial Analytics API
FastAPI-based backend demonstrating Python web development and SQL integration
"""

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from models.database import get_db, create_tables, User, Transaction, Category
from analytics.sql_analytics import FinancialAnalytics
from data_pipeline.etl_processor import FinancialDataETL
from pydantic import BaseModel
from typing import List, Dict, Optional
import pandas as pd
import tempfile
import os
from datetime import datetime

# Initialize FastAPI app
app = FastAPI(
    title="FinSight Analytics API",
    description="Advanced financial analytics platform with Python and SQL",
    version="1.0.0"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for API requests/responses
class UserCreate(BaseModel):
    email: str
    full_name: str

class TransactionCreate(BaseModel):
    category_id: int
    amount: float
    description: str
    transaction_date: datetime
    merchant: Optional[str] = None
    payment_method: Optional[str] = None

class AnalyticsResponse(BaseModel):
    status: str
    data: Dict
    timestamp: datetime

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    create_tables()

@app.get("/")
async def root():
    """API health check endpoint"""
    return {
        "message": "FinSight Analytics API",
        "status": "operational",
        "features": [
            "Advanced SQL Analytics",
            "ETL Data Pipeline",
            "Financial Health Scoring",
            "Spending Trend Analysis",
            "Budget Variance Analysis"
        ]
    }

@app.post("/users/", response_model=Dict)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """Create new user with financial profile"""
    try:
        db_user = User(email=user.email, full_name=user.full_name)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        return {
            "status": "success",
            "user_id": db_user.id,
            "message": "User created successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/upload-transactions/{user_id}")
async def upload_transactions(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload and process financial transaction data via ETL pipeline
    Demonstrates file processing and data pipeline integration
    """
    try:
        # Verify user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # Run ETL pipeline
            etl_processor = FinancialDataETL(db)
            pipeline_result = etl_processor.run_full_pipeline(tmp_file_path, user_id)
            
            return {
                "status": "success",
                "pipeline_result": pipeline_result,
                "message": "Transactions processed successfully"
            }
        
        finally:
            # Clean up temporary file
            os.unlink(tmp_file_path)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/spending-trends/{user_id}")
async def get_spending_trends(
    user_id: int,
    months: int = 12,
    db: Session = Depends(get_db)
):
    """
    Advanced spending trend analysis using SQL window functions
    Demonstrates complex SQL analytics capabilities
    """
    try:
        analytics = FinancialAnalytics(db)
        trends_df = analytics.get_spending_trends(user_id, months)
        
        return AnalyticsResponse(
            status="success",
            data={
                "trends": trends_df.to_dict('records'),
                "summary": {
                    "total_categories": len(trends_df['category'].unique()),
                    "analysis_period_months": months,
                    "total_transactions": trends_df['transaction_count'].sum()
                }
            },
            timestamp=datetime.now()
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/budget-variance/{user_id}")
async def get_budget_variance(user_id: int, db: Session = Depends(get_db)):
    """
    Budget variance analysis with statistical insights
    Demonstrates JOIN operations and complex SQL aggregations
    """
    try:
        analytics = FinancialAnalytics(db)
        variance_df = analytics.budget_variance_analysis(user_id)
        
        return AnalyticsResponse(
            status="success",
            data={
                "variance_analysis": variance_df.to_dict('records'),
                "summary": {
                    "total_budgets": len(variance_df),
                    "over_budget_count": len(variance_df[variance_df['budget_status'] == 'Over Budget']),
                    "avg_variance_percentage": variance_df['variance_percentage'].mean()
                }
            },
            timestamp=datetime.now()
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/savings-analysis/{user_id}")
async def get_savings_analysis(user_id: int, db: Session = Depends(get_db)):
    """
    Comprehensive savings and investment analysis
    Demonstrates advanced SQL subqueries and conditional aggregations
    """
    try:
        analytics = FinancialAnalytics(db)
        savings_data = analytics.savings_investment_analysis(user_id)
        
        return AnalyticsResponse(
            status="success",
            data=savings_data,
            timestamp=datetime.now()
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/financial-health/{user_id}")
async def get_financial_health(user_id: int, db: Session = Depends(get_db)):
    """
    Financial health scoring using advanced SQL calculations
    Demonstrates complex business logic implementation
    """
    try:
        analytics = FinancialAnalytics(db)
        health_data = analytics.financial_health_score(user_id)
        
        return AnalyticsResponse(
            status="success",
            data=health_data,
            timestamp=datetime.now()
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/expense-insights/{user_id}")
async def get_expense_insights(user_id: int, db: Session = Depends(get_db)):
    """
    ML-ready expense categorization insights
    Demonstrates data preparation for machine learning models
    """
    try:
        analytics = FinancialAnalytics(db)
        insights_df = analytics.expense_categorization_insights(user_id)
        
        # Calculate additional insights
        anomaly_count = len(insights_df[insights_df['anomaly_flag'] != 'normal'])
        top_categories = insights_df.groupby('category')['amount'].sum().sort_values(ascending=False).head(5)
        
        return AnalyticsResponse(
            status="success",
            data={
                "expense_features": insights_df.to_dict('records'),
                "insights": {
                    "total_expenses": len(insights_df),
                    "anomaly_count": anomaly_count,
                    "anomaly_percentage": (anomaly_count / len(insights_df)) * 100,
                    "top_spending_categories": top_categories.to_dict()
                }
            },
            timestamp=datetime.now()
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/database/stats")
async def get_database_stats(db: Session = Depends(get_db)):
    """
    Database statistics and health metrics
    Demonstrates SQL aggregation and system monitoring
    """
    try:
        stats = {
            "total_users": db.query(User).count(),
            "total_transactions": db.query(Transaction).count(),
            "total_categories": db.query(Category).count(),
            "recent_activity": {
                "transactions_last_30_days": db.query(Transaction).filter(
                    Transaction.created_at >= datetime.now() - pd.Timedelta(days=30)
                ).count()
            }
        }
        
        return {
            "status": "success",
            "database_stats": stats,
            "timestamp": datetime.now()
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
