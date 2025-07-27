-- Create the missing api_rate_limits table for rate limiting
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on api_rate_limits
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for api_rate_limits (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_rate_limits' AND policyname = 'Users can view their own rate limits') THEN
        CREATE POLICY "Users can view their own rate limits" 
        ON public.api_rate_limits 
        FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_rate_limits' AND policyname = 'Users can create their own rate limits') THEN
        CREATE POLICY "Users can create their own rate limits" 
        ON public.api_rate_limits 
        FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_rate_limits' AND policyname = 'Users can update their own rate limits') THEN
        CREATE POLICY "Users can update their own rate limits" 
        ON public.api_rate_limits 
        FOR UPDATE 
        USING (auth.uid() = user_id);
    END IF;
END
$$;

-- Create index for efficient rate limiting queries
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_user_endpoint 
ON public.api_rate_limits (user_id, endpoint, window_start);

-- Create trigger for automatic timestamp updates (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_api_rate_limits_updated_at') THEN
        CREATE TRIGGER update_api_rate_limits_updated_at
        BEFORE UPDATE ON public.api_rate_limits
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END
$$;

-- Make audio-recordings storage bucket private for security
UPDATE storage.buckets 
SET public = false 
WHERE id = 'audio-recordings';