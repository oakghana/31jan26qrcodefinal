-- Enhance excuse_documents table for multi-level approval workflow
-- Add HR approval fields

ALTER TABLE public.excuse_documents 
ADD COLUMN IF NOT EXISTS hod_status VARCHAR(20) DEFAULT 'pending' CHECK (hod_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS hod_reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS hod_reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS hod_review_notes TEXT,
ADD COLUMN IF NOT EXISTS hr_status VARCHAR(20) DEFAULT 'pending' CHECK (hr_status IN ('pending', 'approved', 'rejected', 'archived')),
ADD COLUMN IF NOT EXISTS hr_reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS hr_reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS hr_review_notes TEXT,
ADD COLUMN IF NOT EXISTS final_status VARCHAR(20) DEFAULT 'pending' CHECK (final_status IN ('pending', 'hod_review', 'hr_review', 'approved', 'rejected'));

-- Create index for HR queries
CREATE INDEX IF NOT EXISTS idx_excuse_documents_hr_status ON public.excuse_documents(hr_status);
CREATE INDEX IF NOT EXISTS idx_excuse_documents_hod_status ON public.excuse_documents(hod_status);
CREATE INDEX IF NOT EXISTS idx_excuse_documents_final_status ON public.excuse_documents(final_status);

-- Drop existing policies before creating new ones to avoid conflicts
DROP POLICY IF EXISTS "HR can view all excuse documents" ON public.excuse_documents;
DROP POLICY IF EXISTS "HR can update excuse documents" ON public.excuse_documents;

-- Update RLS policies for HR access
CREATE POLICY "HR can view all excuse documents" ON public.excuse_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "HR can update excuse documents" ON public.excuse_documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Migrate existing data to new structure
UPDATE public.excuse_documents
SET 
    hod_status = CASE 
        WHEN status = 'approved' THEN 'approved'
        WHEN status = 'rejected' THEN 'rejected'
        ELSE 'pending'
    END,
    hod_reviewed_by = reviewed_by,
    hod_reviewed_at = reviewed_at,
    hod_review_notes = review_notes,
    final_status = CASE 
        WHEN status = 'approved' THEN 'hr_review'
        WHEN status = 'rejected' THEN 'rejected'
        ELSE 'hod_review'
    END
WHERE hod_status IS NULL;

COMMENT ON COLUMN public.excuse_documents.hod_status IS 'Head of Department approval status';
COMMENT ON COLUMN public.excuse_documents.hr_status IS 'HR approval status';
COMMENT ON COLUMN public.excuse_documents.final_status IS 'Overall workflow status: pending -> hod_review -> hr_review -> approved/rejected';
