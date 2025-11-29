-- Players table
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT 1,
    verification_token TEXT,
    is_verified BOOLEAN DEFAULT 0
);

-- Player statistics table
CREATE TABLE IF NOT EXISTS player_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT NOT NULL,
    play_time INTEGER DEFAULT 0,
    blocks_mined INTEGER DEFAULT 0,
    mobs_killed INTEGER DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    FOREIGN KEY (player_id) REFERENCES players(player_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_username ON players(username);
CREATE INDEX IF NOT EXISTS idx_email ON players(email);
CREATE INDEX IF NOT EXISTS idx_player_id ON players(player_id);
