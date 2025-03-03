/*
  # Create log_stats table and storage bucket

  1. New Tables
    - `log_stats`
      - `id` (uuid, primary key)
      - `job_id` (text)
      - `file_id` (text)
      - `file_name` (text)
      - `file_size` (bigint)
      - `total_lines` (bigint)
      - `error_count` (bigint)
      - `warning_count` (bigint)
      - `keyword_matches` (jsonb)
      - `ip_addresses` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `user_id` (uuid, references auth.users)
      - `status` (text)
      - `processing_time` (bigint)
  2. Security
    - Enable RLS on `log_stats` table
    - Add policy for authenticated users to read their own data
    - Add policy for authenticated users to insert their own data
    - Add policy for authenticated users to update their own data
  3. Storage
    - Create a storage bucket for log files
    - Enable RLS on the bucket
    - Add policies for authenticated users to manage their own files
*/

-- Create log_stats table
CREATE TABLE IF NOT EXISTS log_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL,
  file_id text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  total_lines bigint DEFAULT 0,
  error_count bigint DEFAULT 0,
  warning_count bigint DEFAULT 0,
  keyword_matches jsonb DEFAULT '{}'::jsonb,
  ip_addresses jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users NOT NULL,
  status text DEFAULT 'processing',
  processing_time bigint DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE log_stats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read their own log stats"
  ON log_stats
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own log stats"
  ON log_stats
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own log stats"
  ON log_stats
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS log_stats_user_id_idx ON log_stats (user_id);
CREATE INDEX IF NOT EXISTS log_stats_job_id_idx ON log_stats (job_id);
CREATE INDEX IF NOT EXISTS log_stats_created_at_idx ON log_stats (created_at);

-- Create storage bucket for log files
INSERT INTO storage.buckets (id, name, public)
VALUES ('log_files', 'log_files', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the bucket
UPDATE storage.buckets
SET public = false
WHERE id = 'log_files';

-- Create policies for the storage bucket
CREATE POLICY "Users can upload their own log files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'log_files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read their own log files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'log_files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own log files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'log_files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );