/**
 * CodeStart - Módulo del Editor de Código
 * Soporte de números de línea, indentación inteligente y atajos de teclado
 */

class CodeEditor {
  constructor(textareaId, lineNumbersId) {
    this.textarea = document.getElementById(textareaId);
    this.lineNumbers = document.getElementById(lineNumbersId);
    this.currentStarterCode = "";
    
    if (!this.textarea || !this.lineNumbers) {
      console.error("[CodeEditor] Elementos del editor no encontrados.");
      return;
    }

    this.initEvents();
    this.updateLineNumbers();
  }

  initEvents() {
    // Sincronizar scroll entre textarea y números de línea
    this.textarea.addEventListener("scroll", () => {
      this.lineNumbers.scrollTop = this.textarea.scrollTop;
    });

    // Actualizar números de línea cuando se escribe
    this.textarea.addEventListener("input", () => {
      this.updateLineNumbers();
    });

    // Manejar tabulaciones, auto-indentación y pares automáticos
    this.textarea.addEventListener("keydown", (e) => this.handleKeyDown(e));
  }

  handleKeyDown(e) {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const value = this.textarea.value;

    // Ejecutar con Ctrl + Enter o Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      const verifyBtn = document.getElementById("btn-verify");
      if (verifyBtn) verifyBtn.click();
      return;
    }

    // Tecla Tab: Insertar 4 espacios
    if (e.key === "Tab") {
      e.preventDefault();
      const tabSpaces = "    ";
      this.textarea.value = value.substring(0, start) + tabSpaces + value.substring(end);
      this.textarea.selectionStart = this.textarea.selectionEnd = start + 4;
      this.updateLineNumbers();
      return;
    }

    // Tecla Enter: Mantener indentación y auto-indentar si termina en ':'
    if (e.key === "Enter") {
      e.preventDefault();
      
      // Obtener la línea actual previa al cursor
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const currentLine = value.substring(lineStart, start);
      
      // Contar espacios al inicio de la línea
      const match = currentLine.match(/^(\s*)/);
      let indent = match ? match[1] : "";

      // Si la línea actual termina en ':', aumentar 4 espacios más de indentación
      if (currentLine.trim().endsWith(":")) {
        indent += "    ";
      }

      const insertText = "\n" + indent;
      this.textarea.value = value.substring(0, start) + insertText + value.substring(end);
      this.textarea.selectionStart = this.textarea.selectionEnd = start + insertText.length;
      this.updateLineNumbers();
      return;
    }

    // Auto-cierre de comillas y corchetes
    const pairs = {
      "(": ")",
      "[": "]",
      "{": "}",
      "\"": "\"",
      "'": "'"
    };

    if (pairs[e.key] && start === end) {
      e.preventDefault();
      const char = e.key;
      const closing = pairs[char];
      
      this.textarea.value = value.substring(0, start) + char + closing + value.substring(end);
      this.textarea.selectionStart = this.textarea.selectionEnd = start + 1;
      this.updateLineNumbers();
      return;
    }
  }

  updateLineNumbers() {
    const lines = this.textarea.value.split("\n");
    const count = Math.max(lines.length, 1);
    let html = "";
    for (let i = 1; i <= count; i++) {
      html += `<div>${i}</div>`;
    }
    this.lineNumbers.innerHTML = html;
  }

  setCode(code, starter = false) {
    this.textarea.value = code || "";
    if (starter) {
      this.currentStarterCode = code || "";
    }
    this.updateLineNumbers();
  }

  getCode() {
    return this.textarea.value;
  }

  resetToStarter() {
    this.setCode(this.currentStarterCode);
  }
}

window.CodeEditor = CodeEditor;
