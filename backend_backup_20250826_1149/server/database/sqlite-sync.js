import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SQLite database path
const dbPath = path.join(__dirname, 'pruebas_3it.db');

// Initialize SQLite connection
let sqliteDb = null;

const initSQLite = () => {
  return new Promise((resolve) => {
    try {
      sqliteDb = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('❌ Error inicializando SQLite:', err);
          resolve(false);
          return;
        }
        
        // Enable foreign keys
        sqliteDb.run('PRAGMA foreign_keys = ON', (err) => {
          if (err) {
            console.error('❌ Error habilitando foreign keys:', err);
            resolve(false);
            return;
          }
          
          // Create tables if they don't exist
          createTables()
            .then(() => {
              console.log('✅ SQLite inicializado correctamente');
              resolve(true);
            })
            .catch((error) => {
              console.error('❌ Error creando tablas:', error);
              resolve(false);
            });
        });
      });
    } catch (error) {
      console.error('❌ Error inicializando SQLite:', error);
      resolve(false);
    }
  });
};

const createTables = () => {
  try {
    // Categories table
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#005AEE',
        created_at TEXT NOT NULL
      )
    `);

    // Question families table
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS question_families (
        id INTEGER PRIMARY KEY,
        category_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        subfamily TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);

    // Tests table
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS tests (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        time_limit INTEGER DEFAULT 60,
        max_attempts INTEGER DEFAULT 1,
        passing_score REAL DEFAULT 60.0,
        is_active BOOLEAN DEFAULT 1,
        created_by TEXT DEFAULT 'admin',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Questions table
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY,
        test_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        family_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        difficulty TEXT DEFAULT 'Medio',
        max_score INTEGER DEFAULT 10,
        order_index INTEGER DEFAULT 1,
        initial_code TEXT,
        language TEXT DEFAULT 'javascript',
        database_schema TEXT,
        options TEXT,
        correct_answer TEXT,
        execution_timeout INTEGER DEFAULT 5000,
        allow_partial_credit BOOLEAN DEFAULT 1,
        show_expected_output BOOLEAN DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (test_id) REFERENCES tests(id),
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (family_id) REFERENCES question_families(id)
      )
    `);

    // Test cases table
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS test_cases (
        id INTEGER PRIMARY KEY,
        question_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        input_data TEXT,
        expected_output TEXT,
        is_hidden BOOLEAN DEFAULT 0,
        weight REAL DEFAULT 1.0,
        timeout_ms INTEGER DEFAULT 5000,
        created_at TEXT NOT NULL,
        FOREIGN KEY (question_id) REFERENCES questions(id)
      )
    `);

    // Candidates table
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS candidates (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        lastname TEXT,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        position_applied TEXT,
        experience_level TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Test sessions table
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS test_sessions (
        id INTEGER PRIMARY KEY,
        candidate_id INTEGER NOT NULL,
        test_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        time_limit_minutes INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        started_at TEXT,
        completed_at TEXT,
        percentage_score REAL,
        time_spent_seconds INTEGER,
        browser_info TEXT,
        ip_address TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (candidate_id) REFERENCES candidates(id),
        FOREIGN KEY (test_id) REFERENCES tests(id)
      )
    `);

    // Answers table
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS answers (
        id INTEGER PRIMARY KEY,
        session_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        answer_text TEXT,
        time_spent_seconds INTEGER DEFAULT 0,
        max_score INTEGER,
        attempts_count INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        last_modified_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES test_sessions(id),
        FOREIGN KEY (question_id) REFERENCES questions(id)
      )
    `);

    console.log('✅ Tablas SQLite creadas correctamente');
  } catch (error) {
    console.error('❌ Error creando tablas SQLite:', error);
    throw error;
  }
};

// Sync JSON data to SQLite (SAFE - doesn't modify JSON)
const syncJSONToSQLite = (jsonData) => {
  if (!sqliteDb) {
    console.log('⚠️  SQLite no inicializado, omitiendo sincronización');
    return false;
  }

  try {
    // Begin transaction for atomic operation
    const transaction = sqliteDb.transaction(() => {
      // Clear existing data (we'll do a full sync for simplicity)
      sqliteDb.exec('DELETE FROM answers');
      sqliteDb.exec('DELETE FROM test_sessions');
      sqliteDb.exec('DELETE FROM test_cases');
      sqliteDb.exec('DELETE FROM questions');
      sqliteDb.exec('DELETE FROM tests');
      sqliteDb.exec('DELETE FROM candidates');
      sqliteDb.exec('DELETE FROM question_families');
      sqliteDb.exec('DELETE FROM categories');

      // Sync categories
      const insertCategory = sqliteDb.prepare(`
        INSERT INTO categories (id, name, description, color, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      jsonData.categories?.forEach(cat => {
        insertCategory.run(cat.id, cat.name, cat.description, cat.color, cat.created_at);
      });

      // Sync question families
      const insertFamily = sqliteDb.prepare(`
        INSERT INTO question_families (id, category_id, name, subfamily, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      jsonData.question_families?.forEach(fam => {
        insertFamily.run(fam.id, fam.category_id, fam.name, fam.subfamily, fam.created_at);
      });

      // Sync tests
      const insertTest = sqliteDb.prepare(`
        INSERT INTO tests (id, name, description, time_limit, max_attempts, passing_score, is_active, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      jsonData.tests?.forEach(test => {
        insertTest.run(
          test.id, test.name, test.description, test.time_limit, 
          test.max_attempts, test.passing_score, test.is_active ? 1 : 0, 
          test.created_by, test.created_at, test.updated_at
        );
      });

      // Sync questions
      const insertQuestion = sqliteDb.prepare(`
        INSERT INTO questions (id, test_id, category_id, family_id, type, title, description, difficulty, max_score, order_index, initial_code, language, database_schema, options, correct_answer, execution_timeout, allow_partial_credit, show_expected_output, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      jsonData.questions?.forEach(q => {
        insertQuestion.run(
          q.id, q.test_id, q.category_id, q.family_id, q.type, q.title, 
          q.description, q.difficulty, q.max_score, q.order_index,
          q.initial_code, q.language, q.database_schema, 
          JSON.stringify(q.options || []), q.correct_answer, q.execution_timeout,
          q.allow_partial_credit ? 1 : 0, q.show_expected_output ? 1 : 0, q.created_at
        );
      });

      // Sync test cases
      const insertTestCase = sqliteDb.prepare(`
        INSERT INTO test_cases (id, question_id, name, input_data, expected_output, is_hidden, weight, timeout_ms, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      jsonData.test_cases?.forEach(tc => {
        insertTestCase.run(
          tc.id, tc.question_id, tc.name, tc.input_data, tc.expected_output,
          tc.is_hidden ? 1 : 0, tc.weight, tc.timeout_ms, tc.created_at
        );
      });

      // Sync candidates
      const insertCandidate = sqliteDb.prepare(`
        INSERT INTO candidates (id, name, lastname, email, phone, position_applied, experience_level, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      jsonData.candidates?.forEach(c => {
        insertCandidate.run(
          c.id, c.name, c.lastname, c.email, c.phone,
          c.position_applied, c.experience_level, c.created_at, c.updated_at
        );
      });

      // Sync test sessions
      const insertSession = sqliteDb.prepare(`
        INSERT INTO test_sessions (id, candidate_id, test_id, token, time_limit_minutes, status, started_at, completed_at, percentage_score, time_spent_seconds, browser_info, ip_address, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      jsonData.test_sessions?.forEach(s => {
        insertSession.run(
          s.id, s.candidate_id, s.test_id, s.token, s.time_limit_minutes,
          s.status, s.started_at, s.completed_at || s.finished_at, s.percentage_score,
          s.time_spent_seconds, s.browser_info, s.ip_address, s.created_at, s.updated_at
        );
      });

      // Sync answers
      const insertAnswer = sqliteDb.prepare(`
        INSERT INTO answers (id, session_id, question_id, answer_text, time_spent_seconds, max_score, attempts_count, created_at, last_modified_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      jsonData.answers?.forEach(a => {
        insertAnswer.run(
          a.id, a.session_id, a.question_id, a.answer_text,
          a.time_spent_seconds, a.max_score, a.attempts_count,
          a.created_at, a.last_modified_at
        );
      });
    });

    // Execute transaction
    transaction();
    console.log('✅ Sincronización JSON → SQLite completada');
    return true;

  } catch (error) {
    console.error('❌ Error sincronizando a SQLite:', error);
    return false;
  }
};

// Get SQLite database instance
const getSQLiteDb = () => sqliteDb;

export { initSQLite, syncJSONToSQLite, getSQLiteDb };