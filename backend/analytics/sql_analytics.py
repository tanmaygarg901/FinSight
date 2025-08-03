"""
Advanced SQL analytics module for financial data analysis.
Demonstrates complex SQL queries, window functions, and data aggregation techniques.
"""

from sqlalchemy.orm import Session
from sqlalchemy import text, func, extract, case
from models.database import Transaction, Category, Budget, User
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import pandas as pd

class FinancialAnalytics:
    """Advanced financial analytics using SQL and pandas for data science insights"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_spending_trends(self, user_id: int, months: int = 12) -> pd.DataFrame:
        """
        Complex SQL query with window functions to analyze spending trends
        Demonstrates advanced SQL techniques for time series analysis
        """
        query = text("""
            WITH monthly_spending AS (
                SELECT 
                    DATE_TRUNC('month', transaction_date) as month,
                    c.name as category,
                    c.category_type,
                    SUM(amount) as total_amount,
                    COUNT(*) as transaction_count,
                    AVG(amount) as avg_transaction
                FROM transactions t
                JOIN categories c ON t.category_id = c.id
                WHERE t.user_id = :user_id 
                    AND transaction_date >= CURRENT_DATE - INTERVAL ':months months'
                    AND c.category_type = 'expense'
                GROUP BY DATE_TRUNC('month', transaction_date), c.name, c.category_type
            ),
            spending_with_trends AS (
                SELECT *,
                    LAG(total_amount) OVER (PARTITION BY category ORDER BY month) as prev_month_amount,
                    AVG(total_amount) OVER (PARTITION BY category ORDER BY month 
                                          ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as rolling_avg_3m,
                    PERCENT_RANK() OVER (PARTITION BY category ORDER BY total_amount) as spending_percentile
                FROM monthly_spending
            )
            SELECT 
                month,
                category,
                total_amount,
                transaction_count,
                avg_transaction,
                prev_month_amount,
                rolling_avg_3m,
                spending_percentile,
                CASE 
                    WHEN prev_month_amount IS NOT NULL THEN 
                        ((total_amount - prev_month_amount) / prev_month_amount) * 100
                    ELSE 0
                END as month_over_month_change
            FROM spending_with_trends
            ORDER BY month DESC, total_amount DESC
        """)
        
        result = self.db.execute(query, {"user_id": user_id, "months": months})
        return pd.DataFrame(result.fetchall(), columns=result.keys())
    
    def budget_variance_analysis(self, user_id: int) -> pd.DataFrame:
        """
        SQL-based budget variance analysis with statistical insights
        Demonstrates JOIN operations and complex aggregations
        """
        query = text("""
            WITH budget_actuals AS (
                SELECT 
                    b.id as budget_id,
                    c.name as category,
                    b.amount as budgeted_amount,
                    b.period,
                    b.start_date,
                    b.end_date,
                    COALESCE(SUM(t.amount), 0) as actual_amount,
                    COUNT(t.id) as transaction_count
                FROM budgets b
                JOIN categories c ON b.category_id = c.id
                LEFT JOIN transactions t ON b.category_id = t.category_id 
                    AND t.user_id = b.user_id
                    AND t.transaction_date BETWEEN b.start_date AND b.end_date
                WHERE b.user_id = :user_id
                GROUP BY b.id, c.name, b.amount, b.period, b.start_date, b.end_date
            ),
            variance_metrics AS (
                SELECT *,
                    (actual_amount - budgeted_amount) as variance_amount,
                    CASE 
                        WHEN budgeted_amount > 0 THEN 
                            ((actual_amount - budgeted_amount) / budgeted_amount) * 100
                        ELSE 0
                    END as variance_percentage,
                    CASE 
                        WHEN actual_amount > budgeted_amount THEN 'Over Budget'
                        WHEN actual_amount < budgeted_amount * 0.8 THEN 'Under Budget'
                        ELSE 'On Track'
                    END as budget_status
                FROM budget_actuals
            )
            SELECT *,
                NTILE(4) OVER (ORDER BY variance_percentage) as variance_quartile
            FROM variance_metrics
            ORDER BY variance_percentage DESC
        """)
        
        result = self.db.execute(query, {"user_id": user_id})
        return pd.DataFrame(result.fetchall(), columns=result.keys())
    
    def savings_investment_analysis(self, user_id: int) -> Dict:
        """
        Advanced SQL analysis for savings and investment patterns
        Demonstrates subqueries and conditional aggregations
        """
        query = text("""
            WITH savings_data AS (
                SELECT 
                    DATE_TRUNC('month', transaction_date) as month,
                    c.name as category,
                    SUM(CASE WHEN c.category_type = 'savings' THEN amount ELSE 0 END) as savings_amount,
                    SUM(CASE WHEN c.category_type = 'income' THEN amount ELSE 0 END) as income_amount,
                    SUM(CASE WHEN c.category_type = 'expense' THEN amount ELSE 0 END) as expense_amount
                FROM transactions t
                JOIN categories c ON t.category_id = c.id
                WHERE t.user_id = :user_id
                    AND transaction_date >= CURRENT_DATE - INTERVAL '12 months'
                GROUP BY DATE_TRUNC('month', transaction_date), c.name, c.category_type
            ),
            monthly_summary AS (
                SELECT 
                    month,
                    SUM(savings_amount) as total_savings,
                    SUM(income_amount) as total_income,
                    SUM(expense_amount) as total_expenses,
                    CASE 
                        WHEN SUM(income_amount) > 0 THEN 
                            (SUM(savings_amount) / SUM(income_amount)) * 100
                        ELSE 0
                    END as savings_rate
                FROM savings_data
                GROUP BY month
            )
            SELECT 
                month,
                total_savings,
                total_income,
                total_expenses,
                savings_rate,
                AVG(savings_rate) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as rolling_savings_rate,
                total_income - total_expenses - total_savings as discretionary_income
            FROM monthly_summary
            ORDER BY month DESC
        """)
        
        result = self.db.execute(query, {"user_id": user_id})
        df = pd.DataFrame(result.fetchall(), columns=result.keys())
        
        # Calculate summary statistics using pandas
        summary_stats = {
            "avg_monthly_savings": df['total_savings'].mean(),
            "avg_savings_rate": df['savings_rate'].mean(),
            "total_savings_ytd": df['total_savings'].sum(),
            "savings_trend": "increasing" if df['savings_rate'].iloc[0] > df['savings_rate'].iloc[-1] else "decreasing",
            "monthly_data": df.to_dict('records')
        }
        
        return summary_stats
    
    def expense_categorization_insights(self, user_id: int) -> pd.DataFrame:
        """
        Machine learning-ready expense analysis using SQL window functions
        Demonstrates data preparation for ML models
        """
        query = text("""
            WITH expense_features AS (
                SELECT 
                    t.id,
                    t.amount,
                    c.name as category,
                    t.merchant,
                    t.description,
                    EXTRACT(HOUR FROM t.transaction_date) as hour_of_day,
                    EXTRACT(DOW FROM t.transaction_date) as day_of_week,
                    EXTRACT(MONTH FROM t.transaction_date) as month,
                    t.is_recurring,
                    -- Statistical features for ML
                    AVG(t.amount) OVER (PARTITION BY c.name) as category_avg_amount,
                    STDDEV(t.amount) OVER (PARTITION BY c.name) as category_std_amount,
                    COUNT(*) OVER (PARTITION BY c.name) as category_frequency,
                    PERCENT_RANK() OVER (PARTITION BY c.name ORDER BY t.amount) as amount_percentile_in_category,
                    -- Time-based features
                    AVG(t.amount) OVER (PARTITION BY t.user_id ORDER BY t.transaction_date 
                                       ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as rolling_avg_7_transactions
                FROM transactions t
                JOIN categories c ON t.category_id = c.id
                WHERE t.user_id = :user_id
                    AND c.category_type = 'expense'
                    AND t.transaction_date >= CURRENT_DATE - INTERVAL '6 months'
            )
            SELECT *,
                CASE 
                    WHEN amount > category_avg_amount + (2 * category_std_amount) THEN 'outlier_high'
                    WHEN amount < category_avg_amount - (2 * category_std_amount) THEN 'outlier_low'
                    ELSE 'normal'
                END as anomaly_flag
            FROM expense_features
            ORDER BY transaction_date DESC
        """)
        
        result = self.db.execute(query, {"user_id": user_id})
        return pd.DataFrame(result.fetchall(), columns=result.keys())
    
    def financial_health_score(self, user_id: int) -> Dict:
        """
        Comprehensive financial health analysis using advanced SQL
        Demonstrates complex business logic implementation in SQL
        """
        query = text("""
            WITH financial_metrics AS (
                SELECT 
                    -- Income metrics
                    SUM(CASE WHEN c.category_type = 'income' THEN t.amount ELSE 0 END) as total_income,
                    -- Expense metrics
                    SUM(CASE WHEN c.category_type = 'expense' THEN t.amount ELSE 0 END) as total_expenses,
                    -- Savings metrics
                    SUM(CASE WHEN c.category_type = 'savings' THEN t.amount ELSE 0 END) as total_savings,
                    -- Essential vs non-essential expenses
                    SUM(CASE WHEN c.name IN ('Housing', 'Utilities', 'Groceries', 'Transportation') 
                             AND c.category_type = 'expense' THEN t.amount ELSE 0 END) as essential_expenses,
                    SUM(CASE WHEN c.name NOT IN ('Housing', 'Utilities', 'Groceries', 'Transportation') 
                             AND c.category_type = 'expense' THEN t.amount ELSE 0 END) as discretionary_expenses,
                    -- Transaction patterns
                    COUNT(DISTINCT DATE_TRUNC('day', t.transaction_date)) as active_days,
                    COUNT(*) as total_transactions
                FROM transactions t
                JOIN categories c ON t.category_id = c.id
                WHERE t.user_id = :user_id
                    AND t.transaction_date >= CURRENT_DATE - INTERVAL '3 months'
            ),
            health_calculations AS (
                SELECT *,
                    CASE WHEN total_income > 0 THEN (total_savings / total_income) * 100 ELSE 0 END as savings_rate,
                    CASE WHEN total_income > 0 THEN (total_expenses / total_income) * 100 ELSE 0 END as expense_ratio,
                    CASE WHEN total_expenses > 0 THEN (essential_expenses / total_expenses) * 100 ELSE 0 END as essential_expense_ratio,
                    total_income - total_expenses - total_savings as net_cash_flow
                FROM financial_metrics
            )
            SELECT *,
                CASE 
                    WHEN savings_rate >= 20 AND expense_ratio <= 80 AND essential_expense_ratio <= 60 THEN 'Excellent'
                    WHEN savings_rate >= 15 AND expense_ratio <= 85 AND essential_expense_ratio <= 70 THEN 'Good'
                    WHEN savings_rate >= 10 AND expense_ratio <= 90 AND essential_expense_ratio <= 80 THEN 'Fair'
                    ELSE 'Needs Improvement'
                END as financial_health_grade,
                -- Scoring algorithm (0-100)
                LEAST(100, GREATEST(0, 
                    (savings_rate * 2) + 
                    (CASE WHEN expense_ratio <= 80 THEN 20 ELSE GREATEST(0, 20 - (expense_ratio - 80)) END) +
                    (CASE WHEN essential_expense_ratio <= 60 THEN 15 ELSE GREATEST(0, 15 - (essential_expense_ratio - 60) * 0.5) END) +
                    (CASE WHEN net_cash_flow >= 0 THEN 15 ELSE 0 END)
                )) as health_score
            FROM health_calculations
        """)
        
        result = self.db.execute(query, {"user_id": user_id})
        row = result.fetchone()
        
        if row:
            return dict(row._mapping)
        else:
            return {"error": "No financial data found for user"}
