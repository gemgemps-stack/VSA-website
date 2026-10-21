-- V41: allow all Role enum values in the users.role check constraint
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('ADMIN', 'EMPLOYEE', 'MARKETING', 'PRODUCTION', 'SEWING', 'GRAPHIC_ARTISTS', 'SALES', 'MACHINE_OPERATORS'));
