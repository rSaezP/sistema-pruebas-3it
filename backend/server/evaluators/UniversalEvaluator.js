import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

  class UniversalEvaluator {
      constructor() {
          this.name = 'UniversalEvaluator';
      }

      async evaluate(code, testCase, language) {
          console.log(`[UNIVERSAL-EVAL] 🚀 Evaluando ${language}`);
          console.log(`[UNIVERSAL-EVAL] 📝 Input: ${testCase.input_data}`);
          console.log(`[UNIVERSAL-EVAL] 🎯 Expected: ${testCase.expected_output}`);

          try {
              const output = await this.executeCode(code, language, testCase.input_data);
              const success = output.trim() === testCase.expected_output.trim();

              console.log(`[UNIVERSAL-EVAL] 📤 Output: "${output}"`);
              console.log(`[UNIVERSAL-EVAL] ${success ? '✅' : '❌'} Resultado: ${success}`);

              return {
                  success,
                  output: output.trim(),
                  errors: success ? [] : ['Output no coincide con expected'],
                  executionTime: 0
              };
          } catch (error) {
              console.log(`[UNIVERSAL-EVAL] ❌ Error: ${error.message}`);
              return {
                  success: false,
                  output: '',
                  errors: [error.message],
                  executionTime: 0
              };
          }
      }

      async executeCode(code, language, inputData) {
          console.log(`[UNIVERSAL-EVAL] 🔧 Ejecutando código ${language}`);

          const commands = {
              'javascript': { file: 'solution.js', cmd: 'node solution.js', ext: '.js' },
              'js': { file: 'solution.js', cmd: 'node solution.js', ext: '.js' },
              'python': { file: 'solution.py', cmd: 'python3 solution.py', ext: '.py' },
              'python3': { file: 'solution.py', cmd: 'python3 solution.py', ext: '.py' },
              'java': { file: 'Solution.java', cmd: 'javac Solution.java && java Solution', ext: '.java' },
              'cpp': { file: 'solution.cpp', cmd: process.platform === 'win32' ? 'g++ solution.cpp -o solution.exe && solution.exe' : 'g++ solution.cpp -o solution && ./solution', ext: '.cpp' },
              'c++': { file: 'solution.cpp', cmd: process.platform === 'win32' ? 'g++ solution.cpp -o solution.exe && solution.exe' : 'g++ solution.cpp -o solution && ./solution', ext: '.cpp' },
              'go': { file: 'solution.go', cmd: 'go run solution.go', ext: '.go' },
              'rust': { file: 'solution.rs', cmd: 'rustc solution.rs && ./solution', ext: '.rs' },
              'csharp': { file: 'solution.cs', cmd: 'csc solution.cs && mono solution.exe', ext: '.cs' },
              'c#': { file: 'solution.cs', cmd: 'csc solution.cs && mono solution.exe', ext: '.cs' },
              'tlang': { file: 'solution.tl', cmd: 'echo "TLang no implementado aun"', ext: '.tl' },
              'sql': { file: 'solution.sql', cmd: 'sqlite3 :memory: < solution.sql', ext: '.sql' }
          };

          const config = commands[language.toLowerCase()];
          if (!config) {
              throw new Error(`Lenguaje ${language} no soportado aún`);
          }

          try {
              // Crear archivo temporal (Windows compatible)
              const tempDir = process.platform === 'win32' ? 'C:\\temp' : '/tmp';
              const filePath = path.join(tempDir, config.file);
              fs.writeFileSync(filePath, code);

              console.log(`[UNIVERSAL-EVAL] 📁 Archivo creado: ${filePath}`);
              console.log(`[UNIVERSAL-EVAL] 🔨 Ejecutando: ${config.cmd}`);

              // Ejecutar código
              const output = execSync(config.cmd, {
                  cwd: tempDir,
                  timeout: 10000, // 10 segundos timeout
                  encoding: 'utf8',
                  stdio: 'pipe'
              });

              console.log(`[UNIVERSAL-EVAL] ✅ Ejecución exitosa`);
              return output.trim();

          } catch (error) {
              console.log(`[UNIVERSAL-EVAL] ❌ Error de ejecución: ${error.message}`);
              throw new Error(`Error ejecutando ${language}: ${error.message}`);
          }
      }
  }

export default UniversalEvaluator;