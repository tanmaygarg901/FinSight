"""
ETL (Extract, Transform, Load) pipeline for financial data processing.
Demonstrates data engineering best practices with Python and pandas.
"""

import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from models.database import Transaction, Category, User, get_db
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import logging
from dataclasses import dataclass
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class TransactionData:
    """Data class for structured transaction processing"""
    amount: float
    description: str
    date: datetime
    merchant: Optional[str] = None
    category: Optional[str] = None
    payment_method: Optional[str] = None

class FinancialDataETL:
    """
    Advanced ETL pipeline for financial data processing
    Demonstrates data engineering patterns and data quality management
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.category_mapping = self._load_category_mapping()
        
    def _load_category_mapping(self) -> Dict[str, str]:
        """Load category mapping for automatic categorization"""
        return {
            # Merchant patterns for automatic categorization
            r'.*walmart.*|.*target.*|.*costco.*': 'Groceries',
            r'.*shell.*|.*exxon.*|.*chevron.*|.*gas.*': 'Transportation',
            r'.*starbucks.*|.*mcdonalds.*|.*restaurant.*': 'Dining',
            r'.*amazon.*|.*ebay.*|.*shopping.*': 'Shopping',
            r'.*netflix.*|.*spotify.*|.*subscription.*': 'Entertainment',
            r'.*electric.*|.*water.*|.*utility.*': 'Utilities',
            r'.*rent.*|.*mortgage.*|.*housing.*': 'Housing',
            r'.*salary.*|.*payroll.*|.*income.*': 'Income',
            r'.*savings.*|.*investment.*|.*401k.*': 'Savings'
        }
    
    def extract_csv_data(self, file_path: str) -> pd.DataFrame:
        """
        Extract financial data from CSV files with error handling
        Demonstrates robust data extraction patterns
        """
        try:
            # Read CSV with multiple encoding attempts
            encodings = ['utf-8', 'latin-1', 'cp1252']
            df = None
            
            for encoding in encodings:
                try:
                    df = pd.read_csv(file_path, encoding=encoding)
                    logger.info(f"Successfully loaded CSV with {encoding} encoding")
                    break
                except UnicodeDecodeError:
                    continue
            
            if df is None:
                raise ValueError("Could not read CSV file with any supported encoding")
            
            logger.info(f"Extracted {len(df)} records from {file_path}")
            return df
            
        except Exception as e:
            logger.error(f"Error extracting CSV data: {str(e)}")
            raise
    
    def transform_transaction_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Advanced data transformation with data quality checks
        Demonstrates data cleaning and feature engineering
        """
        logger.info("Starting data transformation pipeline")
        
        # Standardize column names
        df.columns = df.columns.str.lower().str.replace(' ', '_')
        
        # Data quality checks
        initial_count = len(df)
        
        # Remove duplicates
        df = df.drop_duplicates()
        logger.info(f"Removed {initial_count - len(df)} duplicate records")
        
        # Handle missing values
        df = df.dropna(subset=['amount', 'description'])
        logger.info(f"Removed records with missing critical fields")
        
        # Data type conversions with error handling
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
        df = df.dropna(subset=['amount'])
        
        # Date parsing with multiple format support
        date_columns = ['date', 'transaction_date', 'posted_date']
        date_col = None
        
        for col in date_columns:
            if col in df.columns:
                date_col = col
                break
        
        if date_col:
            df['transaction_date'] = pd.to_datetime(df[date_col], errors='coerce', infer_datetime_format=True)
            df = df.dropna(subset=['transaction_date'])
        else:
            raise ValueError("No valid date column found")
        
        # Feature engineering
        df['month'] = df['transaction_date'].dt.month
        df['day_of_week'] = df['transaction_date'].dt.dayofweek
        df['is_weekend'] = df['day_of_week'].isin([5, 6])
        df['amount_abs'] = df['amount'].abs()
        
        # Automatic categorization using regex patterns
        df['predicted_category'] = df['description'].apply(self._predict_category)
        
        # Merchant extraction
        df['merchant'] = df['description'].apply(self._extract_merchant)
        
        # Payment method detection
        df['payment_method'] = df.apply(self._detect_payment_method, axis=1)
        
        # Anomaly detection using statistical methods
        df['is_anomaly'] = self._detect_anomalies(df)
        
        logger.info(f"Transformation complete. Final dataset: {len(df)} records")
        return df
    
    def _predict_category(self, description: str) -> str:
        """Predict transaction category using pattern matching"""
        description_lower = description.lower()
        
        for pattern, category in self.category_mapping.items():
            if re.search(pattern, description_lower):
                return category
        
        return 'Other'
    
    def _extract_merchant(self, description: str) -> str:
        """Extract merchant name from transaction description"""
        # Remove common prefixes and suffixes
        cleaned = re.sub(r'^(purchase|payment|transfer|deposit)\s+', '', description.lower())
        cleaned = re.sub(r'\s+(inc|llc|corp|ltd)$', '', cleaned)
        
        # Extract first meaningful part
        parts = cleaned.split()
        if parts:
            return parts[0].title()
        
        return 'Unknown'
    
    def _detect_payment_method(self, row: pd.Series) -> str:
        """Detect payment method from transaction data"""
        description = row['description'].lower()
        
        if 'debit' in description or 'atm' in description:
            return 'Debit Card'
        elif 'credit' in description:
            return 'Credit Card'
        elif 'check' in description:
            return 'Check'
        elif 'transfer' in description:
            return 'Bank Transfer'
        elif 'cash' in description:
            return 'Cash'
        else:
            return 'Unknown'
    
    def _detect_anomalies(self, df: pd.DataFrame) -> pd.Series:
        """
        Statistical anomaly detection using IQR method
        Demonstrates data science techniques for outlier detection
        """
        Q1 = df['amount_abs'].quantile(0.25)
        Q3 = df['amount_abs'].quantile(0.75)
        IQR = Q3 - Q1
        
        lower_bound = Q1 - 1.5 * IQR
        upper_bound = Q3 + 1.5 * IQR
        
        return (df['amount_abs'] < lower_bound) | (df['amount_abs'] > upper_bound)
    
    def load_to_database(self, df: pd.DataFrame, user_id: int) -> Dict[str, int]:
        """
        Load transformed data into database with batch processing
        Demonstrates efficient database operations
        """
        logger.info("Starting database load process")
        
        stats = {
            'total_records': len(df),
            'successful_inserts': 0,
            'failed_inserts': 0,
            'categories_created': 0
        }
        
        try:
            # Batch process categories
            unique_categories = df['predicted_category'].unique()
            category_map = {}
            
            for cat_name in unique_categories:
                category = self.db.query(Category).filter(Category.name == cat_name).first()
                if not category:
                    # Determine category type
                    cat_type = 'expense'
                    if cat_name in ['Income', 'Salary', 'Bonus']:
                        cat_type = 'income'
                    elif cat_name in ['Savings', 'Investment', '401k']:
                        cat_type = 'savings'
                    
                    category = Category(
                        name=cat_name,
                        category_type=cat_type,
                        description=f"Auto-generated category for {cat_name}"
                    )
                    self.db.add(category)
                    self.db.flush()
                    stats['categories_created'] += 1
                
                category_map[cat_name] = category.id
            
            # Batch insert transactions
            batch_size = 1000
            for i in range(0, len(df), batch_size):
                batch = df.iloc[i:i+batch_size]
                transactions = []
                
                for _, row in batch.iterrows():
                    try:
                        transaction = Transaction(
                            user_id=user_id,
                            category_id=category_map[row['predicted_category']],
                            amount=row['amount'],
                            description=row['description'],
                            transaction_date=row['transaction_date'],
                            merchant=row['merchant'],
                            payment_method=row['payment_method'],
                            is_recurring=False  # Could be enhanced with pattern detection
                        )
                        transactions.append(transaction)
                        stats['successful_inserts'] += 1
                        
                    except Exception as e:
                        logger.error(f"Error processing row: {str(e)}")
                        stats['failed_inserts'] += 1
                
                # Bulk insert batch
                self.db.bulk_save_objects(transactions)
                self.db.commit()
                
                logger.info(f"Processed batch {i//batch_size + 1}/{(len(df)//batch_size) + 1}")
            
            logger.info(f"Database load complete: {stats}")
            return stats
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Database load failed: {str(e)}")
            raise
    
    def run_full_pipeline(self, csv_file_path: str, user_id: int) -> Dict[str, any]:
        """
        Execute complete ETL pipeline
        Demonstrates end-to-end data processing workflow
        """
        pipeline_start = datetime.now()
        logger.info("Starting full ETL pipeline")
        
        try:
            # Extract
            raw_data = self.extract_csv_data(csv_file_path)
            
            # Transform
            transformed_data = self.transform_transaction_data(raw_data)
            
            # Load
            load_stats = self.load_to_database(transformed_data, user_id)
            
            pipeline_duration = datetime.now() - pipeline_start
            
            return {
                'status': 'success',
                'duration_seconds': pipeline_duration.total_seconds(),
                'raw_records': len(raw_data),
                'processed_records': len(transformed_data),
                'load_stats': load_stats,
                'data_quality_score': self._calculate_data_quality_score(transformed_data)
            }
            
        except Exception as e:
            logger.error(f"Pipeline failed: {str(e)}")
            return {
                'status': 'failed',
                'error': str(e),
                'duration_seconds': (datetime.now() - pipeline_start).total_seconds()
            }
    
    def _calculate_data_quality_score(self, df: pd.DataFrame) -> float:
        """Calculate data quality score based on completeness and validity"""
        total_fields = len(df) * len(df.columns)
        missing_fields = df.isnull().sum().sum()
        anomaly_count = df['is_anomaly'].sum()
        
        completeness_score = (total_fields - missing_fields) / total_fields
        anomaly_score = 1 - (anomaly_count / len(df))
        
        return round((completeness_score * 0.7 + anomaly_score * 0.3) * 100, 2)
