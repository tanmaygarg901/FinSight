"""
SQLAlchemy database models for FinSight financial analytics platform.
Demonstrates advanced SQL schema design and ORM usage for data engineering.
"""

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/finsight")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    """User model with financial profile data"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    transactions = relationship("Transaction", back_populates="user")
    budgets = relationship("Budget", back_populates="user")
    financial_goals = relationship("FinancialGoal", back_populates="user")

class Category(Base):
    """Transaction categories for financial classification"""
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    category_type = Column(String, nullable=False)  # 'expense', 'income', 'savings'
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    transactions = relationship("Transaction", back_populates="category")
    budgets = relationship("Budget", back_populates="category")

class Transaction(Base):
    """Financial transactions with advanced analytics support"""
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    transaction_date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Advanced fields for data analysis
    merchant = Column(String)
    location = Column(String)
    payment_method = Column(String)
    is_recurring = Column(Boolean, default=False)
    tags = Column(String)  # JSON string for flexible tagging
    
    # Relationships
    user = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")

class Budget(Base):
    """Budget tracking with variance analysis"""
    __tablename__ = "budgets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    amount = Column(Float, nullable=False)
    period = Column(String, nullable=False)  # 'monthly', 'weekly', 'yearly'
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="budgets")
    category = relationship("Category", back_populates="budgets")

class FinancialGoal(Base):
    """Financial goals tracking for savings and investment targets"""
    __tablename__ = "financial_goals"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0.0)
    target_date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_achieved = Column(Boolean, default=False)
    
    # Relationships
    user = relationship("User", back_populates="financial_goals")

# Database initialization
def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Database session dependency for FastAPI"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
