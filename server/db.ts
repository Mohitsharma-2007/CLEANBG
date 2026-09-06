import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool, Client } = pg;

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const dbConfig: any = connectionString
  ? {
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }
  : {
      user: process.env.PGUSER || 'postgres',
      host: process.env.PGHOST || 'localhost',
      database: process.env.PGDATABASE || 'clearbg_db',
      password: process.env.PGPASSWORD || 'postgres',
      port: parseInt(process.env.PGPORT || '5432'),
    };

export let pool: pg.Pool = new Pool(dbConfig);

/**
 * Initialize PostgreSQL Database and Tables (Users, OTPs, History, Images)
 */
export async function initDatabase(): Promise<boolean> {
  try {
    // If not using a remote connection string, ensure local database exists
    if (!connectionString) {
      try {
        const rootClient = new Client({
          user: dbConfig.user,
          host: dbConfig.host,
          database: 'postgres',
          password: dbConfig.password,
          port: dbConfig.port,
        });

        await rootClient.connect();
        const checkDb = await rootClient.query(
          `SELECT 1 FROM pg_database WHERE datname = $1`,
          [dbConfig.database]
        );

        if (checkDb.rowCount === 0) {
          console.log(`[PostgreSQL] Creating database "${dbConfig.database}"...`);
          await rootClient.query(`CREATE DATABASE "${dbConfig.database}"`);
          console.log(`[PostgreSQL] Database "${dbConfig.database}" created successfully.`);
        }
        await rootClient.end();
      } catch (localDbErr: any) {
        console.warn('[PostgreSQL Init Notice]:', localDbErr.message);
      }
    }

    // Connect to application database pool
    pool = new Pool(dbConfig);

    // 3. Create tables
    await pool.query(`
      -- Users Table
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255),
        avatar_url TEXT,
        is_verified BOOLEAN DEFAULT TRUE,
        last_login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      -- Safely add last_login_at if missing
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='users' AND column_name='last_login_at'
        ) THEN
          ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        END IF;
      END $$;

      -- OTP Verification Codes Table (Substack / Email OTPs)
      CREATE TABLE IF NOT EXISTS otp_codes (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp_code VARCHAR(6) NOT NULL,
        type VARCHAR(32) NOT NULL, -- 'signup', 'login', 'reset_password'
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email, otp_code);

      -- History Table (Linked with user_id)
      CREATE TABLE IF NOT EXISTS history (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        tool VARCHAR(64) NOT NULL,
        original_size INTEGER NOT NULL,
        result_size INTEGER NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        thumbnail TEXT NOT NULL,
        result_base64 TEXT NOT NULL,
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Safely add user_id column if table already existed
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='history' AND column_name='user_id'
        ) THEN
          ALTER TABLE history ADD COLUMN user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_history_user_id ON history(user_id);
      CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at DESC);

      -- Images Cache Table
      CREATE TABLE IF NOT EXISTS images (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        size INTEGER NOT NULL,
        mime_type VARCHAR(64) NOT NULL,
        width INTEGER,
        height INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('[PostgreSQL] Database and user authentication schema initialized.');
    return true;
  } catch (err: any) {
    console.warn('[PostgreSQL] Database connection warning:', err.message);
    pool = new Pool(dbConfig);
    return false;
  }
}
