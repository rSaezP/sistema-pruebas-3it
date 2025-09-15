/**
 * Parser para formato EvalArt de importación masiva de preguntas
 */

export interface ParsedQuestion {
  type: string;
  title: string;
  description: string;
  difficulty: string;
  max_score: number;
  time_limit_minutes: number;
  options: Array<{ text: string; correct: boolean }>;
  correct_answer: string;
  language: string;
  category_id: number;
  family_id: number;
  tempId: string;
}

export interface ParseResult {
  success: boolean;
  questions: ParsedQuestion[];
  total: number;
  errors: string[];
}

export class QuestionParser {
  static parseEvalArtFormat(text: string): ParseResult {
    const questions: ParsedQuestion[] = [];
    const errors: string[] = [];
    
    try {
      // Dividir el texto en bloques de preguntas (separados por líneas en blanco)
      const questionBlocks = text.split(/\n\s*\n/).filter(block => block.trim());
      
      questionBlocks.forEach((block, index) => {
        try {
          const question = this.parseSingleQuestion(block.trim(), index + 1);
          if (question) {
            questions.push(question);
          }
        } catch (error) {
          errors.push(`Pregunta ${index + 1}: ${(error as Error).message}`);
        }
      });
      
    } catch (error) {
      errors.push(`Error general: ${(error as Error).message}`);
    }
    
    return {
      success: errors.length === 0,
      questions,
      total: questions.length,
      errors
    };
  }

  private static parseSingleQuestion(questionText: string, questionNumber: number): ParsedQuestion | null {
    const lines = questionText.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length === 0) return null;

    const question: ParsedQuestion = {
      type: 'multiple_choice',
      title: '',
      description: '',
      difficulty: 'Medio',
      max_score: 10,
      time_limit_minutes: 1,
      options: [],
      correct_answer: '',
      language: 'javascript',
      category_id: 1,
      family_id: 1,
      tempId: `imported-${Date.now()}-${questionNumber}`
    };

    let currentSection: string | null = null;
    const questionLines: string[] = [];
    const answerLines: string[] = [];

    for (const line of lines) {
      // Detectar secciones
      if (line === 'Q:') {
        currentSection = 'question';
        continue;
      } else if (line === 'A:') {
        currentSection = 'answers';
        continue;
      } else if (line === 'T:') {
        currentSection = 'time';
        continue;
      } else if (line === 'S:') {
        currentSection = 'score';
        continue;
      } else if (line === 'D:') {
        currentSection = 'difficulty';
        continue;
      }

      // Procesar contenido según la sección
      switch (currentSection) {
        case 'question':
          questionLines.push(line);
          break;
        
        case 'answers':
          answerLines.push(line);
          break;
        
        case 'time':
          const time = parseInt(line);
          if (!isNaN(time) && time > 0) {
            question.time_limit_minutes = time;
          }
          break;
        
        case 'score':
          const score = parseInt(line);
          if (!isNaN(score) && score > 0) {
            question.max_score = score;
          }
          break;
        
        case 'difficulty':
          const difficultyMap: { [key: string]: string } = {
            '1': 'Fácil',
            '2': 'Medio', 
            '3': 'Difícil'
          };
          question.difficulty = difficultyMap[line] || 'Medio';
          break;
      }
    }

    // Validar y procesar pregunta
    if (questionLines.length === 0) {
      throw new Error('La pregunta está vacía. Debe tener contenido después de Q:');
    }
    
    question.title = questionLines.join(' ').substring(0, 200);
    question.description = questionLines.join('\n');

    // Validar y procesar respuestas
    if (answerLines.length < 2) {
      throw new Error('Se requieren al menos 2 opciones de respuesta después de A:');
    }

    let correctAnswerIndex = -1;
    
    answerLines.forEach((answerLine, index) => {
      const isCorrect = answerLine.endsWith('*');
      const text = isCorrect ? answerLine.slice(0, -1).trim() : answerLine.trim();
      
      if (text.length === 0) {
        throw new Error(`La opción ${index + 1} está vacía`);
      }

      question.options.push({
        text: text,
        correct: isCorrect
      });

      if (isCorrect) {
        if (correctAnswerIndex !== -1) {
          throw new Error('Solo puede haber una respuesta correcta por pregunta (marcada con *)');
        }
        correctAnswerIndex = index;
      }
    });

    if (correctAnswerIndex === -1) {
      throw new Error('Debe marcar una respuesta como correcta con * al final');
    }

    question.correct_answer = correctAnswerIndex.toString();

    return question;
  }

  static generateSampleFormat(): string {
    return `Q:
¿Cuál es la mejor práctica para manejar concurrencia en microservicios Golang?
A:
Usar sync.Mutex para todas las conexiones
Implementar connection pooling con context.Context *
Usar channels bloqueantes para cada query
Crear una conexión global compartida
T:
2
S:
10
D:
2

Q:
¿Qué patrón es mejor para un sistema de logs distribuido?
A:
Singleton para única instancia
Observer para notificar cambios *
Factory Method para crear loggers
Adapter para librerías externas
T:
1
S:
5
D:
1`;
  }
}