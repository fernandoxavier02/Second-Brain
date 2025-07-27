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

-- Create RLS policies for api_rate_limits
CREATE POLICY "Users can view their own rate limits" 
ON public.api_rate_limits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own rate limits" 
ON public.api_rate_limits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rate limits" 
ON public.api_rate_limits 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index for efficient rate limiting queries
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_user_endpoint 
ON public.api_rate_limits (user_id, endpoint, window_start);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_api_rate_limits_updated_at
BEFORE UPDATE ON public.api_rate_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Make audio-recordings storage bucket private for security
UPDATE storage.buckets 
SET public = false 
WHERE id = 'audio-recordings';

-- Create secure RLS policies for audio storage
CREATE POLICY "Users can view their own audio files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'audio-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own audio files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'audio-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own audio files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'audio-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own audio files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'audio-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);