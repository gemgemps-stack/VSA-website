-- V41: drop the legacy users_role_check constraint
-- The Role enum plus UserService.parseRole validate values in application code.
-- A hardcoded role list goes stale whenever a new Role is added (see V20 -> V34).
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_check;
