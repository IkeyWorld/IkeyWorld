import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5 // limit each IP to 5 requests per windowMs
});
app.use('/api/register', limiter);

// Database setup
const db = new sqlite3.Database('./database/players.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.run(`
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
        )
    `, (err) => {
        if (err) {
            console.error('Error creating table:', err);
        } else {
            console.log('Players table ready');
        }
    });
}

// Routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Все поля обязательны для заполнения' 
            });
        }

        if (username.length < 3 || username.length > 16) {
            return res.status(400).json({ 
                success: false, 
                message: 'Никнейм должен быть от 3 до 16 символов' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Пароль должен быть не менее 6 символов' 
            });
        }

        // Check if user already exists
        db.get(
            'SELECT * FROM players WHERE username = ? OR email = ?', 
            [username, email],
            async (err, row) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Ошибка базы данных' 
                    });
                }

                if (row) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Пользователь с таким никнеймом или email уже существует' 
                    });
                }

                // Hash password
                const saltRounds = 12;
                const passwordHash = await bcrypt.hash(password, saltRounds);
                
                // Generate unique player ID
                const playerId = uuidv4();
                const verificationToken = uuidv4();

                // Insert new player
                db.run(
                    `INSERT INTO players 
                    (player_id, username, email, password_hash, verification_token) 
                    VALUES (?, ?, ?, ?, ?)`,
                    [playerId, username, email, passwordHash, verificationToken],
                    function(err) {
                        if (err) {
                            console.error('Error inserting player:', err);
                            return res.status(500).json({ 
                                success: false, 
                                message: 'Ошибка при создании аккаунта' 
                            });
                        }

                        console.log(`New player registered: ${username} (ID: ${playerId})`);
                        
                        res.json({ 
                            success: true, 
                            message: 'Аккаунт успешно создан!',
                            playerId: playerId
                        });
                    }
                );
            }
        );

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Внутренняя ошибка сервера' 
        });
    }
});

// Get player info
app.get('/api/player/:username', (req, res) => {
    const { username } = req.params;
    
    db.get(
        'SELECT player_id, username, email, registration_date FROM players WHERE username = ?',
        [username],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!row) {
                return res.status(404).json({ error: 'Player not found' });
            }
            
            res.json(row);
        }
    );
});

// Get all players (for admin)
app.get('/api/players', (req, res) => {
    db.all(
        'SELECT player_id, username, email, registration_date, last_login FROM players WHERE is_active = 1',
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            res.json(rows);
        }
    );
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Website: http://localhost:${PORT}`);
});
