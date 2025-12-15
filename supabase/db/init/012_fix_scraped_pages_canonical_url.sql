-- Migration: Ensure canonical_url column exists on scraped_pages
-- This fixes cases where the column might not have been added properly

-- Add canonical_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'scraped_pages' 
    AND column_name = 'canonical_url'
  ) THEN
    ALTER TABLE public.scraped_pages ADD COLUMN canonical_url TEXT;
    
    -- Create index if it doesn't exist
    CREATE INDEX IF NOT EXISTS idx_scraped_pages_canonical_url 
      ON public.scraped_pages(canonical_url) 
      WHERE canonical_url IS NOT NULL;
    
    -- Backfill existing records
    UPDATE public.scraped_pages
    SET canonical_url = url
    WHERE canonical_url IS NULL AND url IS NOT NULL;
    
    -- Add comment
    COMMENT ON COLUMN public.scraped_pages.canonical_url IS 'Normalized/canonical form of url for efficient lookups';
  END IF;
END $$;
