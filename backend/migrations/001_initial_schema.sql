-- FinSight Database Schema Migration
-- Advanced SQL schema design for financial analytics platform
-- Demonstrates database design best practices and complex relationships

-- Create database (run separately if needed)
-- CREATE DATABASE finsight;

-- Enable extensions for advanced features
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Users table with financial profile data
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Categories table for transaction classification
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category_type VARCHAR(20) NOT NULL CHECK (category_type IN ('expense', 'income', 'savings')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table with advanced analytics support
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    amount DECIMAL(12,2) NOT NULL,
    description VARCHAR(500) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Advanced fields for data analysis
    merchant VARCHAR(255),
    location VARCHAR(255),
    payment_method VARCHAR(50),
    is_recurring BOOLEAN DEFAULT FALSE,
    tags JSONB,
    
    -- Constraints
    CONSTRAINT transactions_amount_check CHECK (amount != 0)
);

-- Budgets table for variance analysis
CREATE TABLE budgets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    period VARCHAR(20) NOT NULL CHECK (period IN ('weekly', 'monthly', 'yearly')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure valid date range
    CONSTRAINT budgets_date_check CHECK (end_date > start_date)
);

-- Financial goals table for savings tracking
CREATE TABLE financial_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_amount DECIMAL(12,2) NOT NULL CHECK (target_amount > 0),
    current_amount DECIMAL(12,2) DEFAULT 0.00 CHECK (current_amount >= 0),
    target_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_achieved BOOLEAN DEFAULT FALSE
);

-- Performance indexes for analytics queries
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_amount ON transactions(amount);
CREATE INDEX idx_transactions_merchant ON transactions(merchant);
CREATE INDEX idx_transactions_date_range ON transactions(transaction_date);
CREATE INDEX idx_budgets_user_period ON budgets(user_id, period);
CREATE INDEX idx_categories_type ON categories(category_type);

-- Partial indexes for common queries
CREATE INDEX idx_transactions_expenses ON transactions(user_id, amount) 
    WHERE amount < 0;
CREATE INDEX idx_transactions_income ON transactions(user_id, amount) 
    WHERE amount > 0;

-- GIN index for JSONB tags
CREATE INDEX idx_transactions_tags ON transactions USING GIN(tags);

-- Insert default categories
INSERT INTO categories (name, category_type, description) VALUES
    ('Housing', 'expense', 'Rent, mortgage, property taxes'),
    ('Transportation', 'expense', 'Gas, car payments, public transit'),
    ('Groceries', 'expense', 'Food and household supplies'),
    ('Utilities', 'expense', 'Electric, water, gas, internet'),
    ('Dining', 'expense', 'Restaurants and takeout'),
    ('Entertainment', 'expense', 'Movies, streaming, hobbies'),
    ('Shopping', 'expense', 'Clothing, electronics, general purchases'),
    ('Healthcare', 'expense', 'Medical, dental, prescriptions'),
    ('Insurance', 'expense', 'Auto, health, life insurance'),
    ('Education', 'expense', 'Tuition, books, courses'),
    ('Salary', 'income', 'Primary employment income'),
    ('Freelance', 'income', 'Contract and freelance work'),
    ('Investment', 'income', 'Dividends, capital gains'),
    ('Other Income', 'income', 'Miscellaneous income sources'),
    ('Emergency Fund', 'savings', 'Emergency savings account'),
    ('Retirement', 'savings', '401k, IRA contributions'),
    ('Investment Account', 'savings', 'Brokerage account deposits'),
    ('Other Savings', 'savings', 'General savings goals');

-- Create views for common analytics queries
CREATE VIEW monthly_spending_summary AS
SELECT 
    u.id as user_id,
    u.full_name,
    DATE_TRUNC('month', t.transaction_date) as month,
    c.category_type,
    SUM(ABS(t.amount)) as total_amount,
    COUNT(*) as transaction_count,
    AVG(ABS(t.amount)) as avg_transaction
FROM users u
JOIN transactions t ON u.id = t.user_id
JOIN categories c ON t.category_id = c.id
GROUP BY u.id, u.full_name, DATE_TRUNC('month', t.transaction_date), c.category_type;

CREATE VIEW category_spending_trends AS
SELECT 
    t.user_id,
    c.name as category,
    c.category_type,
    DATE_TRUNC('month', t.transaction_date) as month,
    SUM(ABS(t.amount)) as monthly_total,
    LAG(SUM(ABS(t.amount))) OVER (
        PARTITION BY t.user_id, c.name 
        ORDER BY DATE_TRUNC('month', t.transaction_date)
    ) as previous_month_total
FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE c.category_type = 'expense'
GROUP BY t.user_id, c.name, c.category_type, DATE_TRUNC('month', t.transaction_date);

-- Function for automatic budget variance calculation
CREATE OR REPLACE FUNCTION calculate_budget_variance(
    p_user_id INTEGER,
    p_budget_id INTEGER
) RETURNS TABLE(
    budget_id INTEGER,
    budgeted_amount DECIMAL,
    actual_amount DECIMAL,
    variance_amount DECIMAL,
    variance_percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.amount as budgeted_amount,
        COALESCE(SUM(ABS(t.amount)), 0) as actual_amount,
        COALESCE(SUM(ABS(t.amount)), 0) - b.amount as variance_amount,
        CASE 
            WHEN b.amount > 0 THEN 
                ((COALESCE(SUM(ABS(t.amount)), 0) - b.amount) / b.amount) * 100
            ELSE 0
        END as variance_percentage
    FROM budgets b
    LEFT JOIN transactions t ON b.category_id = t.category_id 
        AND t.user_id = b.user_id
        AND t.transaction_date BETWEEN b.start_date AND b.end_date
    WHERE b.user_id = p_user_id
        AND (p_budget_id IS NULL OR b.id = p_budget_id)
    GROUP BY b.id, b.amount;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts with financial profile data';
COMMENT ON TABLE categories IS 'Transaction categories for financial classification';
COMMENT ON TABLE transactions IS 'Financial transactions with advanced analytics support';
COMMENT ON TABLE budgets IS 'Budget tracking with variance analysis capabilities';
COMMENT ON TABLE financial_goals IS 'User financial goals and savings targets';

COMMENT ON FUNCTION calculate_budget_variance IS 'Calculate budget variance with percentage analysis';
COMMENT ON VIEW monthly_spending_summary IS 'Monthly spending aggregation by category type';
COMMENT ON VIEW category_spending_trends IS 'Month-over-month spending trends by category';
