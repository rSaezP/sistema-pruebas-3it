export interface LanguageOption {
  value: string;
  label: string;
}

export interface LanguageGroup {
  label: string;
  options: LanguageOption[];
}

export const useLanguages = () => {
  const languageGroups: LanguageGroup[] = [
    {
      label: "🎯 Lenguajes de Evaluación Técnica",
      options: [
        { value: "tlang", label: "TLang" },
        { value: "pseudocode", label: "Pseudocódigo" },
        { value: "algorithm", label: "Descripción de Algoritmo" }
      ]
    },
    {
      label: "🔥 Más Populares",
      options: [
        { value: "javascript", label: "JavaScript" },
        { value: "typescript", label: "TypeScript" },
        { value: "python", label: "Python" },
        { value: "java", label: "Java" },
        { value: "csharp", label: "C#" }
      ]
    },
    {
      label: "🌐 Desarrollo Web",
      options: [
        { value: "html", label: "HTML" },
        { value: "css", label: "CSS" },
        { value: "php", label: "PHP" },
        { value: "nodejs", label: "Node.js" },
        { value: "react", label: "React JSX" },
        { value: "vue", label: "Vue.js" }
      ]
    },
    {
      label: "📱 Desarrollo Móvil",
      options: [
        { value: "swift", label: "Swift" },
        { value: "kotlin", label: "Kotlin" },
        { value: "dart", label: "Dart (Flutter)" }
      ]
    },
    {
      label: "⚡ Sistemas",
      options: [
        { value: "rust", label: "Rust" },
        { value: "go", label: "Go" },
        { value: "cpp", label: "C++" },
        { value: "c", label: "C" }
      ]
    },
    {
      label: "🗄️ Bases de Datos",
      options: [
        { value: "sql", label: "SQL" },
        { value: "mysql", label: "MySQL" },
        { value: "postgresql", label: "PostgreSQL" },
        { value: "plsql", label: "PL/SQL" }
      ]
    },
    {
      label: "📊 Data Science",
      options: [
        { value: "r", label: "R" },
        { value: "matlab", label: "MATLAB" },
        { value: "julia", label: "Julia" }
      ]
    },
    {
      label: "🔧 Scripting",
      options: [
        { value: "bash", label: "Bash" },
        { value: "powershell", label: "PowerShell" },
        { value: "ruby", label: "Ruby" },
        { value: "perl", label: "Perl" }
      ]
    },
    {
      label: "🏢 Empresariales",
      options: [
        { value: "cobol", label: "COBOL" },
        { value: "vb", label: "Visual Basic" },
        { value: "pascal", label: "Pascal" }
      ]
    },
    {
      label: "⛓️ Blockchain",
      options: [
        { value: "solidity", label: "Solidity" },
        { value: "vyper", label: "Vyper" }
      ]
    }
  ];

  return {
    languageGroups
  };
};