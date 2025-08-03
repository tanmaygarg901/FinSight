-- Fix function search path security issues
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.calculate_spending_insights(uuid, integer, integer) SET search_path = public;