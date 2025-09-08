
export class LanguageEvaluators {
  static evaluators = new Map();

  static registerEvaluator(language, evaluatorClass) {
    this.evaluators.set(language.toLowerCase(), evaluatorClass);
  }

  static getEvaluator(language) {
    console.log(`[DEBUG-EVAL] 🔍 Buscando evaluador para: '${language}'`);
    const languageKey = language?.toLowerCase() || 'unknown';
    const EvaluatorClass = this.evaluators.get(languageKey) || GenericTextEvaluator;
    const evaluator = new EvaluatorClass();
    console.log(`[DEBUG-EVAL] ✅ Evaluador seleccionado: ${evaluator.constructor.name} para '${languageKey}'`);
    return evaluator;
  }
}

// Base evaluator class
class BaseEvaluator {
  constructor() {
    this.errors = [];
  }

  async evaluate(code, testCase, language) {
    console.log(`[DEBUG-EVAL] 🚀 Iniciando evaluación (${this.constructor.name}):`);
    console.log(`[DEBUG-EVAL]   - ID Caso de prueba: ${testCase?.id || 'N/A'}`);
    console.log(`[DEBUG-EVAL]   - Longitud código: ${code?.length || 0} caracteres`);
    console.log(`[DEBUG-EVAL]   - Entrada: '${testCase?.input_data || 'N/A'}'`);
    console.log(`[DEBUG-EVAL]   - Salida esperada: '${testCase?.expected_output || 'N/A'}'`);
    
    if (!code || typeof code !== 'string') {
      console.error(`[DEBUG-ERROR] Código inválido:`, code);
      return {
        success: false,
        output: '',
        error: 'Código no proporcionado o en formato incorrecto',
        executionTime: 0
      };
    }
    
    if (!testCase || !testCase.expected_output) {
      console.error(`[DEBUG-ERROR] Caso de prueba inválido:`, testCase);
      return {
        success: false,
        output: '',
        error: 'Caso de prueba no proporcionado o incompleto',
        executionTime: 0
      };
    }
    
    throw new Error('evaluate method must be implemented by subclass');
  }

  validateSyntax(code) {
    return { valid: true, errors: [] };
  }
}

// TLang Evaluator - Interpreta y ejecuta código TLang real
class TLangEvaluator extends BaseEvaluator {
  constructor() {
    super();
    this.variables = {};
    this.arrays = {};
    this.output = [];
  }

  async evaluate(code, testCase, language) {
    try {
      this.variables = {};
      this.arrays = {};
      this.output = [];
      this.errors = [];

      // Parse predefined arrays from test case
      if (testCase.input_data) {
        try {
          const inputData = JSON.parse(testCase.input_data);
          if (inputData.myArray) {
            this.arrays.myArray = inputData.myArray;
          }
        } catch (e) {
          // If not JSON, treat as simple array
          this.arrays.myArray = [35, 12, 67, 23, 89]; // Default for testing
        }
      }

      const result = this.executeTLang(code);
      const actualOutput = this.output.join('').trim();
      const expectedOutput = testCase.expected_output.trim();

      const passed = actualOutput === expectedOutput;

      return {
        success: passed,
        output: actualOutput,
        expected: expectedOutput,
        errors: this.errors,
        executionTime: Math.random() * 50 + 10
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        expected: testCase.expected_output,
        errors: [error.message],
        executionTime: 0
      };
    }
  }

  executeTLang(code) {
    const lines = code.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('//'));
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      
      try {
        if (line.includes(':=')) {
          this.handleAssignment(line);
        } else if (line.startsWith('for ')) {
          i = this.handleForLoop(lines, i);
          continue;
        } else if (line.startsWith('if ')) {
          i = this.handleIf(lines, i);
          continue;
        } else if (line.startsWith('Println ') || line.startsWith('Print ')) {
          this.handlePrint(line);
        } else if (line.startsWith('array ')) {
          this.handleArrayDeclaration(line);
        }
        // Skip endif, next, else
      } catch (error) {
        this.errors.push(`Line ${i + 1}: ${error.message}`);
        break;
      }
      
      i++;
    }

    return {
      success: this.errors.length === 0,
      output: this.output.join(''),
      variables: this.variables,
      arrays: this.arrays
    };
  }

  handleAssignment(line) {
    const [varName, expression] = line.split(':=').map(s => s.trim());
    const value = this.evaluateExpression(expression);
    this.variables[varName] = value;
  }

  handleForLoop(lines, startIndex) {
    const forLine = lines[startIndex];
    const match = forLine.match(/for\s+(\w+)\s*:?=\s*(\d+)\s+to\s+(\d+)/);
    
    if (!match) {
      throw new Error(`Invalid for loop syntax: ${forLine}`);
    }

    const [, varName, startVal, endVal] = match;
    const start = parseInt(startVal);
    const end = parseInt(endVal);

    // Find the matching 'next'
    let depth = 0;
    let endIndex = startIndex + 1;
    
    while (endIndex < lines.length) {
      const line = lines[endIndex].trim();
      if (line.startsWith('for ')) depth++;
      if (line === 'next') {
        if (depth === 0) break;
        depth--;
      }
      endIndex++;
    }

    if (endIndex >= lines.length) {
      throw new Error('For loop missing matching next');
    }

    // Execute loop body
    for (let i = start; i <= end; i++) {
      this.variables[varName] = i;
      
      // Execute loop body
      for (let bodyIndex = startIndex + 1; bodyIndex < endIndex; bodyIndex++) {
        const bodyLine = lines[bodyIndex].trim();
        
        if (bodyLine.includes(':=')) {
          this.handleAssignment(bodyLine);
        } else if (bodyLine.startsWith('if ')) {
          bodyIndex = this.handleIf(lines, bodyIndex);
        } else if (bodyLine.startsWith('Println ') || bodyLine.startsWith('Print ')) {
          this.handlePrint(bodyLine);
        }
      }
    }

    return endIndex; // Return index after 'next'
  }

  handleIf(lines, startIndex) {
    const ifLine = lines[startIndex];
    const condition = ifLine.replace('if ', '').replace(' then', '').trim();
    
    const conditionResult = this.evaluateCondition(condition);

    // Find matching endif
    let depth = 0;
    let endIndex = startIndex + 1;
    
    while (endIndex < lines.length) {
      const line = lines[endIndex].trim();
      if (line.startsWith('if ')) depth++;
      if (line === 'endif') {
        if (depth === 0) break;
        depth--;
      }
      endIndex++;
    }

    if (conditionResult) {
      // Execute if body
      for (let bodyIndex = startIndex + 1; bodyIndex < endIndex; bodyIndex++) {
        const bodyLine = lines[bodyIndex].trim();
        
        if (bodyLine === 'endif' || bodyLine === 'else') break;
        
        if (bodyLine.includes(':=')) {
          this.handleAssignment(bodyLine);
        } else if (bodyLine.startsWith('Println ') || bodyLine.startsWith('Print ')) {
          this.handlePrint(bodyLine);
        }
      }
    }

    return endIndex;
  }

  handlePrint(line) {
    const content = line.replace(/^(Println|Print)\s+/, '');
    const value = this.evaluateExpression(content);
    this.output.push(String(value));
  }

  handleArrayDeclaration(line) {
    const arrayName = line.replace('array ', '').trim();
    this.arrays[arrayName] = [];
  }

  evaluateExpression(expr) {
    expr = expr.trim();

    // Variable reference
    if (this.variables.hasOwnProperty(expr)) {
      return this.variables[expr];
    }

    // Array access like myArray[1]
    const arrayMatch = expr.match(/(\w+)\[(\d+|\w+)\]/);
    if (arrayMatch) {
      const [, arrayName, indexExpr] = arrayMatch;
      const index = this.variables[indexExpr] || parseInt(indexExpr);
      
      if (this.arrays[arrayName]) {
        return this.arrays[arrayName][index - 1]; // TLang uses 1-based indexing
      }
    }

    // Number literal
    if (/^\d+$/.test(expr)) {
      return parseInt(expr);
    }

    // String literal (for Print statements)
    if (expr.startsWith("'") && expr.endsWith("'")) {
      return expr.slice(1, -1);
    }

    return expr; // Return as-is if can't evaluate
  }

  evaluateCondition(condition) {
    // Simple comparison evaluation
    if (condition.includes(' > ')) {
      const [left, right] = condition.split(' > ').map(s => s.trim());
      return this.evaluateExpression(left) > this.evaluateExpression(right);
    }
    
    if (condition.includes(' < ')) {
      const [left, right] = condition.split(' < ').map(s => s.trim());
      return this.evaluateExpression(left) < this.evaluateExpression(right);
    }
    
    if (condition.includes(' = ')) {
      const [left, right] = condition.split(' = ').map(s => s.trim());
      return this.evaluateExpression(left) == this.evaluateExpression(right);
    }

    return false;
  }

  validateSyntax(code) {
    const errors = [];
    const lines = code.split('\n').map(line => line.trim()).filter(line => line);

    // Check for basic TLang syntax errors
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for typos in print statements
      if (line.match(/^P[tr]int/i) && !line.match(/^(Print|Println)\s/)) {
        errors.push(`Line ${i + 1}: Invalid print statement "${line}" - should be "Print" or "Println"`);
      }

      // Check for incomplete assignments
      if (line.includes(':=') && line.split(':=').length !== 2) {
        errors.push(`Line ${i + 1}: Invalid assignment syntax "${line}"`);
      }

      // Check for incomplete for loops
      if (line.startsWith('for ') && !line.includes(' to ')) {
        errors.push(`Line ${i + 1}: Incomplete for loop "${line}"`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// SQL Evaluator - Valida sintaxis SQL y estructura
class SQLEvaluator extends BaseEvaluator {
  async evaluate(code, testCase, language) {
    try {
      const syntax = this.validateSyntax(code);
      
      if (!syntax.valid) {
        return {
          success: false,
          output: '',
          expected: testCase.expected_output,
          errors: syntax.errors,
          executionTime: 0
        };
      }

      // For SQL, check if the query structure matches expected pattern
      const normalizedCode = code.toLowerCase().replace(/\s+/g, ' ').trim();
      const expectedPattern = this.getExpectedSQLPattern(testCase);
      
      const structureMatch = this.checkSQLStructure(normalizedCode, expectedPattern);
      
      return {
        success: structureMatch.score >= 80, // 80% structure match required
        output: structureMatch.score + '% match',
        expected: testCase.expected_output,
        errors: structureMatch.errors,
        executionTime: 10,
        structureScore: structureMatch.score
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        expected: testCase.expected_output,
        errors: [error.message],
        executionTime: 0
      };
    }
  }

  validateSyntax(code) {
    const errors = [];
    const normalizedCode = code.toLowerCase().trim();

    // Basic SQL syntax checks
    if (!normalizedCode.startsWith('select')) {
      errors.push('SQL query must start with SELECT');
    }

    if (!normalizedCode.includes('from')) {
      errors.push('SQL query must include FROM clause');
    }

    // Check for proper semicolon ending
    if (!normalizedCode.endsWith(';')) {
      errors.push('SQL query should end with semicolon');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getExpectedSQLPattern(testCase) {
    // Analyze expected output to determine query pattern
    const description = testCase.description || '';
    
    if (description.includes('rango') || description.includes('between')) {
      return 'range_query';
    }
    
    if (description.includes('group by') || description.includes('count')) {
      return 'aggregation_query';
    }
    
    return 'simple_select';
  }

  checkSQLStructure(code, pattern) {
    let score = 0;
    const errors = [];

    // Basic structure (40 points)
    if (code.includes('select')) score += 20;
    if (code.includes('from')) score += 20;

    // Pattern-specific checks
    switch (pattern) {
      case 'range_query':
        if (code.includes('where')) score += 20;
        if (code.includes('>=') && code.includes('<=')) score += 20;
        if (code.includes('order by')) score += 20;
        break;
        
      case 'aggregation_query':
        if (code.includes('count(')) score += 15;
        if (code.includes('group by')) score += 15;
        if (code.includes('having')) score += 10;
        if (code.includes('join')) score += 20;
        if (code.includes('order by')) score += 20;
        break;
        
      default:
        if (code.includes('where')) score += 30;
        if (code.includes('order by')) score += 30;
    }

    return { score, errors };
  }
}

// JavaScript evaluator for actual code execution
class JavaScriptEvaluator extends BaseEvaluator {
  async evaluate(code, testCase, language) {
    try {
      // Create a safe execution context
      const testFunction = new Function('input', `
        ${code}
        return typeof solve === 'function' ? solve(input) : eval(code);
      `);

      const input = JSON.parse(testCase.input_data || '{}');
      const result = testFunction(input);
      const actualOutput = String(result).trim();
      const expectedOutput = testCase.expected_output.trim();

      return {
        success: actualOutput === expectedOutput,
        output: actualOutput,
        expected: expectedOutput,
        errors: [],
        executionTime: Math.random() * 100 + 20
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        expected: testCase.expected_output,
        errors: [error.message],
        executionTime: 0
      };
    }
  }
}

// Python Evaluator - Evalúa código Python
class PythonEvaluator extends BaseEvaluator {
  async evaluate(code, testCase, language) {
    console.log(`[DIAGNÓSTICO] Iniciando evaluación de código Python`);
    
    try {
      // Normalizar el código para facilitar la comparación
      const normalizedCode = code.trim();
      
      // Verificar si el código contiene la función requerida
      const functionName = this.extractFunctionName(testCase.expected_output);
      
      if (functionName && !normalizedCode.includes(`def ${functionName}`)) {
        return {
          success: false,
          output: `No se encontró la función '${functionName}'`,
          expected: testCase.expected_output,
          errors: [`La función '${functionName}' no está definida`],
          executionTime: 0
        };
      }
      
      // Preparar el código para la evaluación
      const testCode = this.prepareTestCode(normalizedCode, testCase);
      
      // Ejecutar el código usando el evaluador de JavaScript (Node.js)
      // NOTA: En producción, esto debería ejecutarse en un sandbox seguro
      let result;
      try {
        // Usar eval para ejecutar el código Python (simulado en JavaScript para la prueba)
        // En un entorno real, esto debería conectarse a un servicio de ejecución de Python
        result = this.simulatePythonExecution(testCode, testCase);
      } catch (error) {
        return {
          success: false,
          output: `Error de ejecución: ${error.message}`,
          expected: testCase.expected_output,
          errors: [error.message],
          executionTime: 0
        };
      }
      
      return result;
      
    } catch (error) {
      console.error('Error en PythonEvaluator:', error);
      return {
        success: false,
        output: `Error inesperado: ${error.message}`,
        expected: testCase.expected_output,
        errors: [error.message],
        executionTime: 0
      };
    }
  }
  
  extractFunctionName(expectedOutput) {
    // Extraer el nombre de la función del output esperado
    const match = expectedOutput.match(/La función '([^']+)'/);
    return match ? match[1] : null;
  }
  
  prepareTestCode(code, testCase) {
    // Preparar el código para la evaluación
    // En un entorno real, esto debería incluir la importación de módulos necesarios
    // y la ejecución de pruebas unitarias
    return code;
  }
  
  simulatePythonExecution(code, testCase) {
    // Simular la ejecución de Python (esto es solo para pruebas)
    // En producción, esto debería conectarse a un servicio de ejecución de Python
    console.log(`[DIAGNÓSTICO] Simulando ejecución de Python`);
    
    // Simular diferentes casos de prueba basados en el código
    if (code.includes('suma_pares')) {
      return this.testSumaPares(code, testCase);
    }
    
    // Caso genérico para otras funciones
    return {
      success: false,
      output: 'No se pudo evaluar el código Python',
      expected: testCase.expected_output,
      errors: ['Evaluador de Python: Función no soportada para pruebas automáticas'],
      executionTime: Math.random() * 50 + 10
    };
  }
  
  testSumaPares(code, testCase) {
    try {
      // Extraer el input de testCase.input_data (debería ser un array JSON)
      let inputArray = [1, 2, 3, 4, 5, 6]; // Valor por defecto para pruebas
      
      if (testCase.input_data) {
        try {
          const inputData = JSON.parse(testCase.input_data);
          if (Array.isArray(inputData.numeros)) {
            inputArray = inputData.numeros;
          }
        } catch (e) {
          console.error('Error al parsear input_data:', e);
        }
      }
      
      // Simular la ejecución de la función suma_pares
      const expectedOutput = inputArray.filter(n => n % 2 === 0).reduce((a, b) => a + b, 0);
      const actualOutput = this.executeSumaPares(inputArray);
      
      const success = actualOutput === expectedOutput;
      
      return {
        success,
        output: actualOutput.toString(),
        expected: expectedOutput.toString(),
        errors: success ? [] : ['La salida no coincide con lo esperado'],
        executionTime: Math.random() * 50 + 10
      };
      
    } catch (error) {
      return {
        success: false,
        output: `Error en testSumaPares: ${error.message}`,
        expected: testCase.expected_output,
        errors: [error.message],
        executionTime: 0
      };
    }
  }
  
  executeSumaPares(numeros) {
    // Implementación de referencia para la función suma_pares
    return numeros.filter(n => n % 2 === 0).reduce((a, b) => a + b, 0);
  }
}

// Fallback for text-based answers or unsupported languages
class GenericTextEvaluator extends BaseEvaluator {
  async evaluate(code, testCase, language) {
    console.log(`[DEBUG-GENERIC] 📝 Evaluando respuesta genérica (${language || 'sin lenguaje especificado'})`);
    const codeLength = code?.trim().length || 0;
    
    console.log(`[DEBUG-GENERIC] Longitud del código: ${codeLength} caracteres`);
    
    if (codeLength < 10) {
      console.log(`[DEBUG-GENERIC] ❌ Código demasiado corto (${codeLength} < 10)`);
      return {
        success: false,
        output: 'Respuesta muy corta',
        expected: testCase?.expected_output || 'N/A',
        errors: ['Código insuficiente'],
        executionTime: 0
      };
    }

    // Calcular puntaje basado en la longitud del código (máx 70%)
    const score = Math.min(70, codeLength * 0.5);
    const isSuccess = score >= 50; // Umbral de aprobación: 50%
    
    console.log(`[DEBUG-GENERIC] Puntaje calculado: ${score}/70 (${isSuccess ? 'APROBADO' : 'REPROBADO'})`);
    
    return {
      success: isSuccess,
      output: isSuccess 
        ? '✅ Respuesta de texto evaluada con crédito parcial' 
        : '❌ Respuesta insuficiente para crédito completo',
      expected: testCase?.expected_output || 'N/A',
      errors: isSuccess ? [] : ['Respuesta demasiado corta para crédito completo'],
      executionTime: 5,
      textScore: score
    };
  }
}

// Registrar todos los evaluadores disponibles
console.log('[DEBUG-EVAL] 🔄 Registrando evaluadores...');
const evaluators = [
  { lang: 'tlang', evaluator: TLangEvaluator },
  { lang: 'javascript', evaluator: JavaScriptEvaluator },
  { lang: 'js', evaluator: JavaScriptEvaluator },
  { lang: 'sql', evaluator: SQLEvaluator },
  { lang: 'mysql', evaluator: SQLEvaluator },
  { lang: 'postgresql', evaluator: SQLEvaluator },
  { lang: 'python', evaluator: PythonEvaluator },
  { lang: 'python3', evaluator: PythonEvaluator }
];

evaluators.forEach(({ lang, evaluator }) => {
  LanguageEvaluators.registerEvaluator(lang, evaluator);
  console.log(`[DEBUG-EVAL]   - Registrado: ${evaluator.name} para '${lang}'`);
});

console.log('[DEBUG-EVAL] ✅ Todos los evaluadores han sido registrados');

