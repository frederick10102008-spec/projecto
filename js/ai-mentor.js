/**
 * CodeStart - Módulo del Tutor de Inteligencia Artificial (Mentor IA)
 * Asistencia interactiva, resolución de dudas y explicación amigable de errores
 */

class AIMentor {
  constructor(app) {
    this.app = app;
    this.drawer = document.getElementById("ai-tutor-drawer");
    this.messagesContainer = document.getElementById("ai-messages");
    this.input = document.getElementById("ai-input");
    this.sendBtn = document.getElementById("btn-ai-send");
    this.toggleBtn = document.getElementById("btn-ai-toggle");
    this.closeBtn = document.getElementById("btn-ai-close");

    this.initEvents();
  }

  initEvents() {
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener("click", () => this.toggleDrawer());
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => this.closeDrawer());
    }

    if (this.sendBtn) {
      this.sendBtn.addEventListener("click", () => this.sendMessage());
    }

    if (this.input) {
      this.input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    // Chips de sugerencias rápidas
    const chips = document.querySelectorAll(".prompt-chip");
    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const action = chip.dataset.action;
        this.handleQuickAction(action);
      });
    });
  }

  toggleDrawer() {
    if (this.drawer.classList.contains("open")) {
      this.closeDrawer();
    } else {
      this.openDrawer();
    }
  }

  openDrawer() {
    this.drawer.classList.add("open");
    if (this.input) this.input.focus();
  }

  closeDrawer() {
    this.drawer.classList.remove("open");
  }

  appendMessage(sender, text) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${sender}`;

    const formattedText = this.formatMarkdown(text);
    msgDiv.innerHTML = `<div class="msg-bubble">${formattedText}</div>`;

    this.messagesContainer.appendChild(msgDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  async sendMessage(customMessage = null, mode = "chat") {
    const text = customMessage || (this.input ? this.input.value.trim() : "");
    if (!text) return;

    if (!customMessage && this.input) {
      this.input.value = "";
    }

    this.appendMessage("user", text);

    // Mensaje de carga
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "message bot";
    loadingDiv.id = "ai-loading-bubble";
    loadingDiv.innerHTML = '<div class="msg-bubble">🤖 <em>Pensando...</em></div>';
    this.messagesContainer.appendChild(loadingDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

    try {
      const currentLessonId = this.app.currentLesson ? this.app.currentLesson.id : "";
      const currentCode = this.app.editor.getCode();

      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          code: currentCode,
          lesson_id: currentLessonId,
          mode: mode
        })
      });

      const loadingElem = document.getElementById("ai-loading-bubble");
      if (loadingElem) loadingElem.remove();

      if (!response.ok) throw new Error("Error comunicando con el Mentor");

      const data = await response.json();
      this.appendMessage("bot", data.response);
    } catch (err) {
      const loadingElem = document.getElementById("ai-loading-bubble");
      if (loadingElem) loadingElem.remove();
      // Respuesta de contingencia local sin servidor
      const localReply = this.generateLocalFallback(text, mode);
      this.appendMessage("bot", localReply);
    }
  }

  generateLocalFallback(text, mode) {
    const lesson = this.app.currentLesson;
    const title = lesson ? lesson.title : "Fundamentos";

    if (mode === "explain_error") {
      if (text.includes("SyntaxError")) {
        return "🔍 **Error de Sintaxis:** Revisa que hayas cerrado todas las comillas `\"` y paréntesis `)`, y que tengas dos puntos `:` al final de los `if` o `for`.";
      }
      if (text.includes("IndentationError")) {
        return "📐 **Error de Sangría (Indentación):** En Python, las líneas dentro de un `if`, `for` o `def` deben llevar 4 espacios a la derecha.";
      }
      if (text.includes("NameError")) {
        return "🏷️ **Nombre no definido:** Estás usando una variable o función que no existe o que está mal escrita (recuerda que Python distingue mayúsculas).";
      }
      return `💡 **Consejo del Mentor:** Python detectó un fallo al ejecutar tu código. Compara tu sintaxis con el ejemplo de la lección **${title}**.`;
    }

    if (mode === "hint" && lesson && lesson.hints) {
      return "🎯 **Pista del Mentor:**\n" + lesson.hints.map((h, i) => `**Paso ${i+1}:** ${h}`).join("\n\n");
    }

    return `🤖 **Mentor CodeStart:** En la lección **${title}**, concéntrate en cumplir el objetivo de la misión y dale al botón **Comprobar Reto**.`;
  }

  askWhyFailed(errorMessage, code) {
    this.openDrawer();
    this.sendMessage(`¿Por qué falló mi código?\nError:\n${errorMessage}`, "explain_error");
  }

  handleQuickAction(action) {
    this.openDrawer();
    if (action === "hint") {
      this.sendMessage("¿Me das una pista sobre cómo abordar este reto?", "hint");
    } else if (action === "review") {
      this.sendMessage("Por favor revisa la estructura y buenas prácticas de mi código actual.", "review");
    } else if (action === "analogy") {
      this.sendMessage("Explícame el concepto principal de esta lección con una analogía divertida de la vida real.", "chat");
    }
  }

  formatMarkdown(text) {
    if (!text) return "";

    // Reemplazar bloques de código ```python ... ```
    let formatted = text.replace(/```python([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Reemplazar código en línea `code`
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Negritas **texto**
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Cursivas *texto*
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Saltos de línea a <br>
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
  }
}

window.AIMentor = AIMentor;
