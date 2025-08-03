-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sector TEXT,
  industry TEXT,
  market_cap BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create financial_data table for storing processed metrics
CREATE TABLE public.financial_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  open_price DECIMAL(10,2),
  close_price DECIMAL(10,2),
  high_price DECIMAL(10,2),
  low_price DECIMAL(10,2),
  volume BIGINT,
  adjusted_close DECIMAL(10,2),
  daily_change DECIMAL(10,2),
  daily_change_percent DECIMAL(5,2),
  moving_avg_20 DECIMAL(10,2),
  moving_avg_50 DECIMAL(10,2),
  rsi DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, date)
);

-- Create data_uploads table to track file uploads
CREATE TABLE public.data_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  records_processed INTEGER DEFAULT 0,
  companies_added INTEGER DEFAULT 0,
  error_message TEXT,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create user_portfolios table for tracking user's selected companies
CREATE TABLE public.user_portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Enable Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_portfolios ENABLE ROW LEVEL SECURITY;

-- Create policies for companies (readable by all authenticated users)
CREATE POLICY "Companies are viewable by authenticated users" 
ON public.companies 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Companies can be inserted by authenticated users" 
ON public.companies 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Companies can be updated by authenticated users" 
ON public.companies 
FOR UPDATE 
TO authenticated 
USING (true);

-- Create policies for financial_data (readable by all authenticated users)
CREATE POLICY "Financial data is viewable by authenticated users" 
ON public.financial_data 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Financial data can be inserted by authenticated users" 
ON public.financial_data 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Financial data can be updated by authenticated users" 
ON public.financial_data 
FOR UPDATE 
TO authenticated 
USING (true);

-- Create policies for data_uploads (user-specific)
CREATE POLICY "Users can view their own uploads" 
ON public.data_uploads 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own uploads" 
ON public.data_uploads 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own uploads" 
ON public.data_uploads 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- Create policies for user_portfolios (user-specific)
CREATE POLICY "Users can view their own portfolio" 
ON public.user_portfolios 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own portfolio" 
ON public.user_portfolios 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for uploaded files
INSERT INTO storage.buckets (id, name, public) VALUES ('financial-data', 'financial-data', false);

-- Create storage policies
CREATE POLICY "Users can upload their own files" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'financial-data' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (bucket_id = 'financial-data' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'financial-data' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create indexes for better query performance
CREATE INDEX idx_financial_data_company_date ON public.financial_data(company_id, date DESC);
CREATE INDEX idx_financial_data_date ON public.financial_data(date DESC);
CREATE INDEX idx_companies_symbol ON public.companies(symbol);
CREATE INDEX idx_data_uploads_user_status ON public.data_uploads(user_id, status);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate technical indicators
CREATE OR REPLACE FUNCTION public.calculate_technical_indicators(company_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Update moving averages and RSI for the company
  UPDATE public.financial_data fd1
  SET 
    moving_avg_20 = (
      SELECT AVG(close_price) 
      FROM public.financial_data fd2 
      WHERE fd2.company_id = fd1.company_id 
      AND fd2.date <= fd1.date 
      ORDER BY fd2.date DESC 
      LIMIT 20
    ),
    moving_avg_50 = (
      SELECT AVG(close_price) 
      FROM public.financial_data fd2 
      WHERE fd2.company_id = fd1.company_id 
      AND fd2.date <= fd1.date 
      ORDER BY fd2.date DESC 
      LIMIT 50
    )
  WHERE fd1.company_id = company_uuid;
END;
$$ LANGUAGE plpgsql;