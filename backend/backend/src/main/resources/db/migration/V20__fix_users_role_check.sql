-- Fix the users role check constraint to allow all role types
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check 
CHECK (role IN ('ADMIN', 'EMPLOYEE', 'MARKETING', 'PRODUCTION', 'SEWING'));
