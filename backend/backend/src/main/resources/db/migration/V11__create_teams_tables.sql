CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY,
    team_name VARCHAR(255) NOT NULL UNIQUE,
    quantity INTEGER NOT NULL,
    transit_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_players (
    id UUID PRIMARY KEY,
    team_id UUID NOT NULL,
    surname VARCHAR(255) NOT NULL,
    number VARCHAR(50),
    size VARCHAR(50),
    type VARCHAR(100) NOT NULL,
    CONSTRAINT fk_team_players_team
        FOREIGN KEY (team_id)
        REFERENCES teams (id)
        ON DELETE CASCADE
);
