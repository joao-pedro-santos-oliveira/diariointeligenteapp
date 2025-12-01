-- Create journal_entries table
CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  audio_path TEXT,
  transcription TEXT,
  insights TEXT,
  insights_audio_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own journal entries" 
ON public.journal_entries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own journal entries" 
ON public.journal_entries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal entries" 
ON public.journal_entries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries" 
ON public.journal_entries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_journal_entries_updated_at
BEFORE UPDATE ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('journal-audio', 'journal-audio', false);

-- Create policies for audio uploads
CREATE POLICY "Users can view their own audio files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'journal-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own audio files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'journal-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own audio files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'journal-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own audio files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'journal-audio' AND auth.uid()::text = (storage.foldername(name))[1]);