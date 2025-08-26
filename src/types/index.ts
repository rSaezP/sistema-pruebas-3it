// Tipos principales del sistema de pruebas técnicas

export interface TestCase {
  id: string
  name: string
  input_data: string
  expected_output: string
  is_hidden: boolean
  weight: number
  timeout_ms: number
}

export interface MultipleChoiceOption {
  text: string
  correct: boolean
}

export interface Question {
  tempId?: string
  id?: number
  type: 'programming' | 'sql' | 'multiple_choice'
  title: string
  description: string
  difficulty: 'Fácil' | 'Medio' | 'Difícil'
  max_score: number
  order_index?: number
  
  // Programming specific
  language?: string
  initial_code?: string
  expected_solution?: string
  
  // SQL specific
  database_schema?: string
  correct_answer?: string
  
  // Multiple choice specific
  options?: MultipleChoiceOption[] | string
  
  // Test cases for both programming and SQL
  test_cases: TestCase[]
}

export interface Test {
  id?: number
  name: string
  description: string
  time_limit: number
  max_attempts?: number
  passing_score: number
  is_active: boolean
  created_by?: string
  created_at?: string
  updated_at?: string
  questions: Question[]
}

export interface TestSession {
  id?: number
  test_id: number
  candidate_name: string
  candidate_email: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  start_time?: string
  end_time?: string
  percentage_score?: number
  created_at?: string
}