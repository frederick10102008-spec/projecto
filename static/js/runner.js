/**
 * CodeStart - Módulo de Ejecución y Pruebas
 * Conecta con el sandbox de Python del servidor o usa Pyodide en el navegador como respaldo
 */

class CodeRunner {
  constructor(app) {
    this.app = app;
    this.terminalOutput = document.getElementById("terminal-output");
    this.testResultsContainer = document.getElementById("test-results-container");
    this.terminalStatus = document.getElementById("terminal-status");
    this.pyodideInstance = null;
  }

  async runCode(code) {
    this.setTerminalStatus("Ejecutando...", "running");
    this.app.switchTerminalTab("console");
    this.terminalOutput.innerHTML = '<span style="color: #94a3b8;">⏳ Ejecutando en Python sandbox...</span>';

    try {
      // 1. Intentar con la API del servidor local
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });

      if (!response.ok) throw new Error("Servidor no disponible");

      const data = await response.json();
      this.displayExecutionOutput(data);
      this.setTerminalStatus(`${data.execution_time_ms} ms`, "done");
    } catch (err) {
      // 2. Fallback inteligente: Pyodide en el navegador (para GitHub Pages / Hosting estático)
      try {
        const clientData = await this.runWithPyodide(code);
        this.displayExecutionOutput(clientData);
        this.setTerminalStatus(`${clientData.execution_time_ms} ms (cliente)`, "done");
      } catch (pyErr) {
        this.terminalOutput.innerHTML = `<div class="output-stderr">❌ Error de ejecución: ${pyErr.message}</div>`;
        this.setTerminalStatus("Error", "error");
      }
    }
  }

  async verifyCode(code, lessonId) {
    this.setTerminalStatus("Comprobando reto...", "running");
    this.terminalOutput.innerHTML = '<span style="color: #94a3b8;">⏳ Evaluando reto y casos de prueba...</span>';

    try {
      // 1. Intentar con la API del servidor local
      const response = await fetch("/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, lesson_id: lessonId })
      });

      if (!response.ok) throw new Error("Servidor no disponible");

      const data = await response.json();
      this.displayTestResults(data);
      this.setTerminalStatus(data.passed ? "¡Reto Superado!" : "Pruebas incompletas", data.passed ? "passed" : "failed");

      if (data.passed) {
        this.app.onLessonPassed(lessonId, data.xp_awarded);
      }
    } catch (err) {
      // 2. Fallback inteligente en cliente
      try {
        const clientExec = await this.runWithPyodide(code);
        const lesson = this.app.currentLesson;
        const tests = (lesson && lesson.tests) || [];
        const stdout = clientExec.stdout || "";
        const stderr = clientExec.stderr || "";

        let allPassed = !stderr;
        const testReports = [];

        tests.forEach((t) => {
          const exp = (t.expected || "").trim().toLowerCase();
          const act = stdout.trim().toLowerCase();
          const cleanExp = exp.replace(/[¡!¿?,"']/g, "");
          const cleanAct = act.replace(/[¡!¿?,"']/g, "");

          const passed = act.includes(exp) || cleanAct.includes(cleanExp);
          if (!passed) allPassed = false;

          testReports.push({
            id: t.id,
            name: t.name,
            passed: passed,
            expected: t.expected,
            actual: stdout
          });
        });

        const report = {
          passed: allPassed,
          stdout: stdout,
          stderr: stderr,
          tests: testReports,
          xp_awarded: allPassed ? (lesson?.xp || 50) : 0,
          execution_time_ms: clientExec.execution_time_ms
        };

        this.displayTestResults(report);
        this.setTerminalStatus(allPassed ? "¡Reto Superado!" : "Pruebas incompletas", allPassed ? "passed" : "failed");

        if (allPassed) {
          this.app.onLessonPassed(lessonId, report.xp_awarded);
        }
      } catch (pyErr) {
        this.terminalOutput.innerHTML = `<div class="output-stderr">❌ Error al evaluar reto: ${pyErr.message}</div>`;
        this.setTerminalStatus("Error", "error");
      }
    }
  }

  async runWithPyodide(code) {
    if (!this.pyodideInstance) {
      if (typeof loadPyodide === "undefined") {
        throw new Error("No se pudo cargar el motor Python local ni en el navegador.");
      }
      this.setTerminalStatus("Cargando Python en navegador...", "running");
      this.pyodideInstance = await loadPyodide();
    }

    let stdout = "";
    let stderr = "";

    this.pyodideInstance.setStdout({ batched: (msg) => { stdout += msg + "\n"; } });
    this.pyodideInstance.setStderr({ batched: (msg) => { stderr += msg + "\n"; } });

    const start = performance.now();
    try {
      await this.pyodideInstance.runPythonAsync(code);
    } catch (e) {
      stderr += e.message || String(e);
    }
    const elapsed = Math.round(performance.now() - start);

    return {
      stdout: stdout,
      stderr: stderr,
      exit_code: stderr ? 1 : 0,
      execution_time_ms: elapsed
    };
  }

  displayExecutionOutput(data) {
    let html = "";
    
    if (data.stdout && data.stdout.trim().length > 0) {
      html += `<div class="output-stdout">${this.escapeHtml(data.stdout)}</div>`;
    }

    if (data.stderr && data.stderr.trim().length > 0) {
      html += `
        <div class="output-stderr">
          <strong>🚨 Error de ejecución:</strong>
          <div>${this.escapeHtml(data.stderr)}</div>
          <div class="error-action-bar">
            <button class="btn-explain-error" id="btn-quick-explain">
              🤖 ¿Por qué falló? Explicar con Mentor IA
            </button>
          </div>
        </div>
      `;
    }

    if (!data.stdout && !data.stderr) {
      html = '<span style="color: #64748b;">(El programa finalizó correctamente sin imprimir nada en consola)</span>';
    }

    this.terminalOutput.innerHTML = html;

    const explainBtn = document.getElementById("btn-quick-explain");
    if (explainBtn) {
      explainBtn.addEventListener("click", () => {
        this.app.aiMentor.askWhyFailed(data.stderr, this.app.editor.getCode());
      });
    }
  }

  displayTestResults(data) {
    this.displayExecutionOutput({
      stdout: data.stdout,
      stderr: data.stderr,
      execution_time_ms: data.execution_time_ms
    });

    this.app.switchTerminalTab("tests");

    let html = "";
    const tests = data.tests || [];

    if (tests.length === 0) {
      html = '<div style="color: #94a3b8; padding: 0.5rem;">No hay pruebas específicas para esta lección.</div>';
    } else {
      tests.forEach((t) => {
        const isPassed = t.passed;
        html += `
          <div class="test-card ${isPassed ? 'passed' : 'failed'}">
            <div class="test-header ${isPassed ? 'passed' : 'failed'}">
              <span>${isPassed ? '✅' : '❌'} ${this.escapeHtml(t.name)}</span>
              <span>${isPassed ? 'CORRECTO' : 'NO COINCIDE'}</span>
            </div>
            ${!isPassed ? `
              <div class="test-diff">
                <div style="color: #6ee7b7;">Esperado: <code>${this.escapeHtml(t.expected)}</code></div>
                <div style="color: #fca5a5;">Obtenido: <code>${this.escapeHtml(t.actual || '(vacío)')}</code></div>
              </div>
            ` : ''}
          </div>
        `;
      });
    }

    this.testResultsContainer.innerHTML = html;
  }

  setTerminalStatus(text, state) {
    if (!this.terminalStatus) return;
    let icon = "⚪";
    if (state === "running") icon = "⏳";
    if (state === "passed") icon = "🟢";
    if (state === "failed") icon = "🔴";
    if (state === "done") icon = "⚡";
    if (state === "error") icon = "⚠️";

    this.terminalStatus.innerHTML = `${icon} <span>${text}</span>`;
  }

  escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

window.CodeRunner = CodeRunner;
