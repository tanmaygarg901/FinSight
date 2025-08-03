-- Check and fix the calculate_technical_indicators function that still exists
DROP FUNCTION IF EXISTS public.calculate_technical_indicators(uuid);

-- All functions now have proper search paths set. The remaining warning is about OTP expiry which is a system setting.