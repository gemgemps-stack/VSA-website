-- Case-insensitive uniqueness safeguard for employee usernames.
-- NOTE: existing duplicates (case/whitespace variants) are reported at application startup
-- by UserService#reportDuplicateUsernames so they can be resolved manually. The index is
-- created only when no duplicates exist; otherwise the statement is skipped to avoid startup failure.

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_normalized
ON users (LOWER(TRIM(username)));
