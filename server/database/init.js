import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JSON Database simulation
const dbPath = path.join(__dirname, 'data.json');

let db = {
  categories: [],
  question_families: [],
  tests: [],
  questions: [],
  test_cases: [],
  candidates: [],
  test_sessions: [],
  answers: []
};

// Load data if exists
if (fs.existsSync(dbPath)) {
  try {
    db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (error) {
    console.log('Creating new database...');
  }
}

// Save data function
const saveDB = () => {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
};

export const initDatabase = () => {
  console.log('🔧 Inicializando base de datos JSON...');
  
  // Insert initial data if empty
  if (db.categories.length === 0) {
    insertInitialData();
  }
  
  console.log('✅ Base de datos JSON inicializada');
};

const insertInitialData = () => {
  // Insert categories
  db.categories = [
    { id: 1, name: 'Programación', description: 'Preguntas de programación y algoritmos', color: '#005AEE', created_at: new Date().toISOString() },
    { id: 2, name: 'SQL', description: 'Consultas y bases de datos', color: '#2CD5C4', created_at: new Date().toISOString() },
    { id: 3, name: 'Lógica', description: 'Razonamiento lógico y matemático', color: '#000026', created_at: new Date().toISOString() }
  ];

  // Insert question families
  db.question_families = [
    { id: 1, category_id: 1, name: 'Programación', subfamily: 'Programación General', created_at: new Date().toISOString() },
    { id: 2, category_id: 1, name: 'Programación', subfamily: 'Algoritmos', created_at: new Date().toISOString() },
    { id: 3, category_id: 1, name: 'Programación', subfamily: 'Estructuras de Datos', created_at: new Date().toISOString() },
    { id: 4, category_id: 2, name: 'Programación', subfamily: 'SQL y Bases de Datos', created_at: new Date().toISOString() }
  ];

  // Insert sample test
  db.tests = [
    {
      id: 1,
      name: 'Evaluación Frontend Developer',
      description: 'Prueba técnica para desarrolladores Frontend con Vue.js y JavaScript',
      time_limit: 90,
      max_attempts: 1,
      passing_score: 60.0,
      is_active: true,
      created_by: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  // Insert sample questions
  db.questions = [
    {
      id: 1,
      test_id: 1,
      category_id: 1,
      family_id: 1,
      type: 'programming',
      title: 'Suma de números pares',
      description: 'Implementa una función que calcule la suma de todos los números pares en un array.',
      difficulty: 'Fácil',
      max_score: 10,
      order_index: 1,
      initial_code: 'function sumEvenNumbers(numbers) {\n  // Tu código aquí\n  \n}',
      language: 'javascript',
      execution_timeout: 5000,
      allow_partial_credit: true,
      show_expected_output: false,
      created_at: new Date().toISOString()
    }
  ];

  // Insert test cases
  db.test_cases = [
    { id: 1, question_id: 1, name: 'Caso básico', input_data: '[1, 2, 3, 4, 5, 6]', expected_output: '12', is_hidden: false, weight: 1.0, timeout_ms: 5000, created_at: new Date().toISOString() },
    { id: 2, question_id: 1, name: 'Array vacío', input_data: '[]', expected_output: '0', is_hidden: false, weight: 1.0, timeout_ms: 5000, created_at: new Date().toISOString() },
    { id: 3, question_id: 1, name: 'Solo impares', input_data: '[1, 3, 5, 7]', expected_output: '0', is_hidden: false, weight: 1.0, timeout_ms: 5000, created_at: new Date().toISOString() },
    { id: 4, question_id: 1, name: 'Solo pares', input_data: '[2, 4, 6, 8]', expected_output: '20', is_hidden: false, weight: 1.0, timeout_ms: 5000, created_at: new Date().toISOString() }
  ];

  // Insert sample candidate
  db.candidates = [
    {
      id: 1,
      name: 'Juan Carlos',
      lastname: 'Pérez López',
      email: 'juan.perez@email.com',
      phone: null,
      position_applied: 'Frontend Developer',
      experience_level: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  // Save to file
  saveDB();
  console.log('✅ Base de datos inicializada con datos de ejemplo');
};

export { db };