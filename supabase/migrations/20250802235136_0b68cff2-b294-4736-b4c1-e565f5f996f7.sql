-- Drop existing tables and recreate for personal finance tracking
DROP TABLE IF EXISTS public.financial_data CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;
DROP TABLE IF EXISTS public.user_portfolios CASCADE;

-- Create expense categories table
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT DEFAULT 'DollarSign',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expenses table for tracking student spending
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create budgets table for monthly budget tracking
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id),
  amount DECIMAL(10,2) NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id, month, year)
);

-- Enable RLS on all tables
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Create policies for expense_categories (public read, authenticated users can manage)
CREATE POLICY "Categories are viewable by everyone" 
ON public.expense_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage categories" 
ON public.expense_categories 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create policies for expenses (users can only see/manage their own)
CREATE POLICY "Users can view their own expenses" 
ON public.expenses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own expenses" 
ON public.expenses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses" 
ON public.expenses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses" 
ON public.expenses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for budgets (users can only see/manage their own)
CREATE POLICY "Users can view their own budgets" 
ON public.budgets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budgets" 
ON public.budgets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets" 
ON public.budgets 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets" 
ON public.budgets 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
BEFORE UPDATE ON public.budgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default expense categories for college students
INSERT INTO public.expense_categories (name, color, icon) VALUES
('Food & Dining', '#ef4444', 'UtensilsCrossed'),
('Transportation', '#3b82f6', 'Car'),
('Education', '#8b5cf6', 'GraduationCap'),
('Entertainment', '#f59e0b', 'Gamepad2'),
('Shopping', '#10b981', 'ShoppingBag'),
('Health & Fitness', '#06b6d4', 'Heart'),
('Bills & Utilities', '#6b7280', 'Receipt'),
('Savings', '#22c55e', 'PiggyBank'),
('Other', '#64748b', 'DollarSign');

-- Update data_uploads table to handle expense data
ALTER TABLE public.data_uploads 
ADD COLUMN IF NOT EXISTS upload_type TEXT DEFAULT 'expenses';

-- Create function to calculate spending insights
CREATE OR REPLACE FUNCTION public.calculate_spending_insights(user_uuid UUID, target_month INTEGER DEFAULT NULL, target_year INTEGER DEFAULT NULL)
RETURNS TABLE(
  category_name TEXT,
  total_spent DECIMAL,
  budget_amount DECIMAL,
  remaining_budget DECIMAL,
  transaction_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calc_month INTEGER := COALESCE(target_month, EXTRACT(MONTH FROM CURRENT_DATE));
  calc_year INTEGER := COALESCE(target_year, EXTRACT(YEAR FROM CURRENT_DATE));
BEGIN
  RETURN QUERY
  SELECT 
    ec.name::TEXT as category_name,
    COALESCE(e.total_spent, 0)::DECIMAL as total_spent,
    COALESCE(b.amount, 0)::DECIMAL as budget_amount,
    COALESCE(b.amount, 0) - COALESCE(e.total_spent, 0)::DECIMAL as remaining_budget,
    COALESCE(e.transaction_count, 0)::BIGINT as transaction_count
  FROM public.expense_categories ec
  LEFT JOIN (
    SELECT 
      category_id,
      SUM(amount) as total_spent,
      COUNT(*) as transaction_count
    FROM public.expenses 
    WHERE user_id = user_uuid 
    AND EXTRACT(MONTH FROM date) = calc_month
    AND EXTRACT(YEAR FROM date) = calc_year
    GROUP BY category_id
  ) e ON ec.id = e.category_id
  LEFT JOIN public.budgets b ON ec.id = b.category_id 
    AND b.user_id = user_uuid 
    AND b.month = calc_month 
    AND b.year = calc_year
  ORDER BY ec.name;
END;
$$;