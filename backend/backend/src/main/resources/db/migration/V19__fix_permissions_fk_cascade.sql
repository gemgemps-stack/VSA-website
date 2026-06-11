-- Recreate the permissions table with ON DELETE CASCADE constraint
-- Drop existing foreign key constraint
ALTER TABLE permissions
DROP CONSTRAINT fk2vnmjh5vw8m96emb2x1web77p;

-- Add the new constraint with ON DELETE CASCADE
ALTER TABLE permissions
ADD CONSTRAINT fk_permissions_user_id
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
