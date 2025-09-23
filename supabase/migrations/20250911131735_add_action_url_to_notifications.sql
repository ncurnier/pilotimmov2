/*
  # Add action_url column to notifications

  1. New Columns
    - `action_url` (text, nullable)
*/

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS action_url text;
