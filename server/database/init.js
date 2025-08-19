import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🗄️ Inicializando base de datos SQLite...');

// Crear conexión a la base de datos
const dbPath = path.join(__dirname, 'pruebas_3it.db');
const db = new Database(dbPath);
console.log('✅ Conectado a la base de datos SQLite:', dbPath);

// Configuración básica de SQLite (sin pragmas que puedan causar bloqueos)

// Crear tablas solo si no existen (seguro)
console.log('🔧 Verificando estructura de base de datos...');

try {
  // 1. TABLA CATEGORIES
  db.exec(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#005AEE',
    created_at TEXT NOT NULL
  )`);
  console.log('✅ Tabla categories verificada');

  // 2. TABLA QUESTION_FAMILIES
  db.exec(`CREATE TABLE IF NOT EXISTS question_families (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    subfamily TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories (id)
  )`);
  console.log('✅ Tabla question_families verificada');

  // 3. TABLA TESTS
  db.exec(`CREATE TABLE IF NOT EXISTS tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    time_limit INTEGER DEFAULT 60,
    max_attempts INTEGER DEFAULT 1,
    passing_score REAL DEFAULT 60.0,
    is_active INTEGER DEFAULT 1,
    created_by TEXT DEFAULT 'admin',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  console.log('✅ Tabla tests verificada');

  // 4. TABLA QUESTIONS
  db.exec(`CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    allow_partial_credit INTEGER DEFAULT 1,
    show_expected_output INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (test_id) REFERENCES tests (id),
    FOREIGN KEY (category_id) REFERENCES categories (id),
    FOREIGN KEY (family_id) REFERENCES question_families (id)
  )`);
  console.log('✅ Tabla questions verificada');

  // 5. TABLA TEST_CASES
  db.exec(`CREATE TABLE IF NOT EXISTS test_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    input_data TEXT,
    expected_output TEXT,
    is_hidden INTEGER DEFAULT 0,
    weight REAL DEFAULT 1.0,
    timeout_ms INTEGER DEFAULT 5000,
    created_at TEXT NOT NULL,
    FOREIGN KEY (question_id) REFERENCES questions (id)
  )`);
  console.log('✅ Tabla test_cases verificada');

  // 6. TABLA CANDIDATES
  db.exec(`CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    lastname TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    position_applied TEXT,
    experience_level TEXT,
    test_id INTEGER,
    expires_at TEXT,
    status TEXT DEFAULT 'pending',
    session_token TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (test_id) REFERENCES tests (id)
  )`);
  
  // Agregar columnas faltantes si la tabla ya existe
  try {
    db.exec(`ALTER TABLE candidates ADD COLUMN test_id INTEGER`);
  } catch(e) {
    // Columna ya existe, continuar
  }
  
  try {
    db.exec(`ALTER TABLE candidates ADD COLUMN expires_at TEXT`);
  } catch(e) {
    // Columna ya existe, continuar
  }
  
  try {
    db.exec(`ALTER TABLE candidates ADD COLUMN status TEXT DEFAULT 'pending'`);
  } catch(e) {
    // Columna ya existe, continuar
  }
  
  try {
    db.exec(`ALTER TABLE candidates ADD COLUMN session_token TEXT`);
  } catch(e) {
    // Columna ya existe, continuar
  }
  
  console.log('✅ Tabla candidates verificada y actualizada');

  // 7. TABLA TEST_SESSIONS
  db.exec(`CREATE TABLE IF NOT EXISTS test_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    FOREIGN KEY (candidate_id) REFERENCES candidates (id),
    FOREIGN KEY (test_id) REFERENCES tests (id)
  )`);
  console.log('✅ Tabla test_sessions verificada');

  // 8. TABLA ANSWERS
  db.exec(`CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    answer_text TEXT,
    time_spent_seconds INTEGER DEFAULT 0,
    max_score INTEGER,
    attempts_count INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    last_modified_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES test_sessions (id),
    FOREIGN KEY (question_id) REFERENCES questions (id)
  )`);
  console.log('✅ Tabla answers verificada');

  // Crear datos iniciales solo si no existen
  const categoriesCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  
  if (categoriesCount.count === 0) {
    console.log('🌱 No hay categorías. Creando datos iniciales...');
    
    // Insertar categorías
    const insertCategory = db.prepare(`INSERT INTO categories (name, description, color, created_at) VALUES (?, ?, ?, ?)`);
    
    insertCategory.run('Programación', 'Preguntas de programación y algoritmos', '#005AEE', new Date().toISOString());
    insertCategory.run('SQL', 'Consultas y bases de datos', '#2CD5C4', new Date().toISOString());
    insertCategory.run('Lógica', 'Razonamiento lógico y matemático', '#000026', new Date().toISOString());

    // Insertar familias de preguntas
    const insertFamily = db.prepare(`INSERT INTO question_families (category_id, name, subfamily, created_at) VALUES (?, ?, ?, ?)`);
    
    insertFamily.run(1, 'Programación', 'Programación General', new Date().toISOString());
    insertFamily.run(1, 'Programación', 'Algoritmos', new Date().toISOString());
    insertFamily.run(1, 'Programación', 'Estructuras de Datos', new Date().toISOString());
    insertFamily.run(2, 'Programación', 'SQL y Bases de Datos', new Date().toISOString());

    console.log('✅ Datos iniciales creados');
  } else {
    console.log(`✅ Ya existen ${categoriesCount.count} categorías. No se crean datos iniciales.`);
  }

  console.log('🎯 Base de datos inicializada correctamente');

} catch (error) {
  console.error('❌ Error en la inicialización de base de datos:', error);
}

// Función para migrar datos del JSON existente
const migrateFromJSON = async () => {
  const fs = await import('fs');
  const jsonPath = path.join(__dirname, 'data.json');
  
  // Verificar si ya se migró (evitar bucle infinito)
  const testsCount = db.prepare('SELECT COUNT(*) as count FROM tests').get();
  if (testsCount.count > 0) {
    console.log('✅ Datos ya migrados, saltando migración');
    return;
  }
  
  if (fs.default.existsSync(jsonPath)) {
    console.log('📦 Migrando datos desde JSON a SQLite...');
    
    try {
      const jsonData = JSON.parse(fs.default.readFileSync(jsonPath, 'utf8'));
      
      // Migrar tests si existen
      if (jsonData.tests && jsonData.tests.length > 0) {
        const insertTest = db.prepare(`INSERT OR REPLACE INTO tests (id, name, description, time_limit, max_attempts, passing_score, is_active, created_by, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        
        jsonData.tests.forEach(test => {
          insertTest.run(test.id, test.name, test.description, test.time_limit, test.max_attempts || 1, 
             test.passing_score, test.is_active ? 1 : 0, test.created_by, test.created_at, test.updated_at);
        });
      }

      // Migrar questions si existen
      if (jsonData.questions && jsonData.questions.length > 0) {
        const insertQuestion = db.prepare(`INSERT OR REPLACE INTO questions (id, test_id, category_id, family_id, type, title, description, difficulty, max_score, order_index, initial_code, language, database_schema, options, correct_answer, execution_timeout, allow_partial_credit, show_expected_output, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        
        jsonData.questions.forEach(question => {
          insertQuestion.run(question.id, question.test_id, question.category_id, question.family_id, question.type, question.title, question.description, question.difficulty, question.max_score, question.order_index, question.initial_code, question.language, question.database_schema, JSON.stringify(question.options || []), question.correct_answer, question.execution_timeout, question.allow_partial_credit ? 1 : 0, question.show_expected_output ? 1 : 0, question.created_at);
        });
      }

      // Migrar test_cases si existen
      if (jsonData.test_cases && jsonData.test_cases.length > 0) {
        const insertTestCase = db.prepare(`INSERT OR REPLACE INTO test_cases (id, question_id, name, input_data, expected_output, is_hidden, weight, timeout_ms, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        
        jsonData.test_cases.forEach(testCase => {
          insertTestCase.run(testCase.id, testCase.question_id, testCase.name, testCase.input_data, testCase.expected_output, testCase.is_hidden ? 1 : 0, testCase.weight, testCase.timeout_ms, testCase.created_at);
        });
      }

      // Migrar candidates si existen
      if (jsonData.candidates && jsonData.candidates.length > 0) {
        const insertCandidate = db.prepare(`INSERT OR REPLACE INTO candidates (id, name, lastname, email, phone, position_applied, experience_level, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        
        jsonData.candidates.forEach(candidate => {
          insertCandidate.run(candidate.id, candidate.name, candidate.lastname, candidate.email, candidate.phone, candidate.position_applied, candidate.experience_level, candidate.created_at, candidate.updated_at);
        });
      }

      console.log('✅ Migración desde JSON completada');
      
      // Crear backup del JSON
      const backupPath = path.join(__dirname, `data_migrated_backup_${Date.now()}.json`);
      fs.default.copyFileSync(jsonPath, backupPath);
      console.log('✅ Backup del JSON creado:', backupPath);
      
    } catch (error) {
      console.error('❌ Error migrando desde JSON:', error);
    }
  }
};

// Función de inicialización que debe ser llamada desde index.js
const initDatabase = () => {
  console.log('🔧 Inicializando base de datos...');
  migrateFromJSON();
};

// Exportar la conexión de la base de datos y funciones
export { db, migrateFromJSON, initDatabase };