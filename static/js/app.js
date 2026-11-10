/**
 * CodeStart - Controlador Principal de la Aplicación
 * Gestión del estado, currículo, progreso, gamificación y audio
 */

class CodeStartApp {
  constructor() {
    this.curriculum = null;
    this.currentLesson = null;
    this.state = this.loadState();
    
    this.editor = null;
    this.runner = null;
    this.aiMentor = null;

    this.audioContext = null;
    this.soundEnabled = true;

    this.init();
  }

  async init() {
    // Inicializar componentes secundarios
    this.editor = new CodeEditor("code-textarea", "editor-lines");
    this.runner = new CodeRunner(this);
    this.aiMentor = new AIMentor(this);

    // Cargar currículo desde la API
    await this.fetchCurriculum();

    // Eventos globales del UI
    this.initUIEvents();

    // Actualizar barra de estadísticas
    this.updateStatsUI();

    // Cargar primera lección o la última en progreso
    this.loadInitialLesson();

    // Comprobar racha diaria
    this.checkDailyStreak();
  }

  loadState() {
    const defaultState = {
      xp: 0,
      streak: 1,
      lastActiveDate: new Date().toISOString().split("T")[0],
      completedLessons: [],
      completedQuizzes: [],
      unlockedBadges: ["welcome"]
    };

    try {
      const saved = localStorage.getItem("codestart_user_state");
      return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;
    } catch (e) {
      return defaultState;
    }
  }

  saveState() {
    try {
      localStorage.setItem("codestart_user_state", JSON.stringify(this.state));
    } catch (e) {
      console.error("No se pudo guardar el estado en localStorage", e);
    }
  }

  async fetchCurriculum() {
    try {
      let res = await fetch("/api/curriculum");
      if (!res.ok) {
        res = await fetch("data/curriculum.json");
      }
      if (!res.ok) throw new Error("No se pudo cargar el currículo");
      this.curriculum = await res.json();
      this.renderCurriculumSidebar();
    } catch (err) {
      try {
        const fallbackRes = await fetch("data/curriculum.json");
        this.curriculum = await fallbackRes.json();
        this.renderCurriculumSidebar();
      } catch (e2) {
        console.error(err);
        this.showToast("Error cargando currículo del curso", "error");
      }
    }
  }

  renderCurriculumSidebar() {
    const container = document.getElementById("curriculum-scroll");
    if (!container || !this.curriculum) return;

    let html = "";
    const modules = this.curriculum.modules || [];

    modules.forEach((mod) => {
      const lessonsHtml = mod.lessons.map((lesson) => {
        const isCompleted = this.state.completedLessons.includes(lesson.id);
        const isActive = this.currentLesson && this.currentLesson.id === lesson.id;
        return `
          <button class="lesson-nav-btn ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}" 
                  data-lesson-id="${lesson.id}">
            <div class="lesson-title-inline">
              <span class="lesson-status-icon">${isCompleted ? '✓' : '•'}</span>
              <span>${lesson.number} ${lesson.title}</span>
            </div>
            <span style="font-size: 0.7rem; opacity: 0.7;">+${lesson.xp}XP</span>
          </button>
        `;
      }).join("");

      html += `
        <div class="module-item" data-module-id="${mod.id}">
          <div class="module-header">
            <div class="module-meta">
              <div class="module-number-badge">${mod.number}</div>
              <div class="module-title-text">${mod.title}</div>
            </div>
            <span class="module-chevron">▼</span>
          </div>
          <div class="lessons-list">
            ${lessonsHtml}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Asignar eventos de click en lecciones
    container.querySelectorAll(".lesson-nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const lessonId = btn.dataset.lessonId;
        this.selectLesson(lessonId);
      });
    });
  }

  loadInitialLesson() {
    if (!this.curriculum || !this.curriculum.modules) return;

    // Buscar la primera lección no completada
    let targetLesson = null;
    for (const mod of this.curriculum.modules) {
      for (const lesson of mod.lessons) {
        if (!this.state.completedLessons.includes(lesson.id)) {
          targetLesson = lesson;
          break;
        }
      }
      if (targetLesson) break;
    }

    if (!targetLesson && this.curriculum.modules[0]?.lessons[0]) {
      targetLesson = this.curriculum.modules[0].lessons[0];
    }

    if (targetLesson) {
      this.selectLesson(targetLesson.id);
    }
  }

  selectLesson(lessonId) {
    if (!this.curriculum) return;

    let foundLesson = null;
    let foundModule = null;

    for (const mod of this.curriculum.modules) {
      for (const l of mod.lessons) {
        if (l.id === lessonId) {
          foundLesson = l;
          foundModule = mod;
          break;
        }
      }
      if (foundLesson) break;
    }

    if (!foundLesson) return;

    this.currentLesson = foundLesson;

    // Actualizar sidebar activo
    document.querySelectorAll(".lesson-nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lessonId === lessonId);
    });

    document.querySelectorAll(".module-item").forEach((item) => {
      item.classList.toggle("active-module", item.dataset.moduleId === foundModule.id);
    });

    // Renderizar panel de contenido de la lección
    this.renderLessonContent(foundLesson);

    // Cargar starter code en el editor
    this.editor.setCode(foundLesson.starterCode, true);

    // Limpiar terminal y volver a pestaña consola
    this.switchTerminalTab("console");
    const termOut = document.getElementById("terminal-output");
    if (termOut) termOut.innerHTML = '<span style="color: #64748b;">Presiona "Ejecutar" o "Comprobar Reto" para ver resultados...</span>';
    this.runner.setTerminalStatus("Listo", "done");

    // Reiniciar quiz si aplica
    this.renderQuiz(foundLesson);

    // Sonido sutil de navegación
    this.playTone(400, "sine", 0.05);
  }

  renderLessonContent(lesson) {
    // Encabezado
    const badgeEl = document.getElementById("lesson-badge");
    const headingEl = document.getElementById("lesson-heading");
    const theoryBodyEl = document.getElementById("theory-body");
    const missionTextEl = document.getElementById("mission-text");

    if (badgeEl) badgeEl.textContent = lesson.badge || "Lección";
    if (headingEl) headingEl.textContent = `${lesson.number} ${lesson.title}`;
    
    // Markdown a HTML básico
    if (theoryBodyEl) {
      theoryBodyEl.innerHTML = this.parseTheoryMarkdown(lesson.theory);
    }

    if (missionTextEl) {
      missionTextEl.textContent = lesson.objective;
    }

    // Pistas
    const hintsContainer = document.getElementById("hints-list");
    if (hintsContainer) {
      const hints = lesson.hints || [];
      if (hints.length === 0) {
        hintsContainer.innerHTML = '<div style="color: #94a3b8;">Esta lección no requiere pistas adicionales. ¡Tú puedes!</div>';
      } else {
        hintsContainer.innerHTML = hints.map((h, i) => `
          <div class="hint-item">
            <button class="hint-trigger">
              <span>💡 Pista #${i + 1}</span>
              <span>▼</span>
            </button>
            <div class="hint-body">${h}</div>
          </div>
        `).join("");

        hintsContainer.querySelectorAll(".hint-trigger").forEach((trigger) => {
          trigger.addEventListener("click", () => {
            const item = trigger.closest(".hint-item");
            item.classList.toggle("open");
          });
        });
      }
    }

    // Pestaña inicial
    this.switchLessonTab("theory");
  }

  renderQuiz(lesson) {
    const quizPane = document.getElementById("tab-quiz");
    const quizTabBtn = document.getElementById("tab-btn-quiz");

    if (!lesson.quiz) {
      if (quizTabBtn) quizTabBtn.style.display = "none";
      return;
    }

    if (quizTabBtn) quizTabBtn.style.display = "flex";

    const q = lesson.quiz;
    const isCompleted = this.state.completedQuizzes.includes(lesson.id);

    quizPane.innerHTML = `
      <div class="quiz-container">
        <div class="quiz-question">${q.question}</div>
        <div class="quiz-options">
          ${q.options.map((opt, idx) => `
            <button class="quiz-option-btn ${isCompleted && idx === q.correctIndex ? 'correct' : ''}" 
                    data-index="${idx}">
              ${opt}
            </button>
          `).join("")}
        </div>
        <div class="quiz-feedback ${isCompleted ? 'show' : ''}" id="quiz-feedback">
          ${isCompleted ? `✅ ¡Correcto! ${q.explanation}` : ''}
        </div>
      </div>
    `;

    quizPane.querySelectorAll(".quiz-option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const chosen = parseInt(btn.dataset.index, 10);
        const feedbackEl = document.getElementById("quiz-feedback");

        if (chosen === q.correctIndex) {
          btn.classList.add("correct");
          feedbackEl.className = "quiz-feedback show";
          feedbackEl.style.background = "rgba(16, 185, 129, 0.15)";
          feedbackEl.style.border = "1px solid #10b981";
          feedbackEl.style.color = "#a7f3d0";
          feedbackEl.innerHTML = `🎉 <strong>¡Correcto!</strong> ${q.explanation}`;

          if (!this.state.completedQuizzes.includes(lesson.id)) {
            this.state.completedQuizzes.push(lesson.id);
            this.addXP(25, "¡Quiz superado!");
            this.playSuccessChime();
          }
        } else {
          btn.classList.add("wrong");
          feedbackEl.className = "quiz-feedback show";
          feedbackEl.style.background = "rgba(244, 63, 94, 0.15)";
          feedbackEl.style.border = "1px solid #f43f5e";
          feedbackEl.style.color = "#fecdd3";
          feedbackEl.innerHTML = `❌ <strong>Intenta de nuevo:</strong> Esa no es la opción correcta.`;
          this.playTone(220, "sawtooth", 0.15);
        }
      });
    });
  }

  onLessonPassed(lessonId, xpAwarded) {
    const isNew = !this.state.completedLessons.includes(lessonId);

    if (isNew) {
      this.state.completedLessons.push(lessonId);
      this.addXP(xpAwarded || 50, "¡Reto de código superado!");
      this.renderCurriculumSidebar();
      this.checkBadgeUnlocks();
    } else {
      this.showToast("¡Código verificado y correcto de nuevo!", "info");
    }

    this.playSuccessChime();
    this.triggerConfetti();
  }

  addXP(amount, reason) {
    this.state.xp += amount;
    this.saveState();
    this.updateStatsUI();
    this.showToast(`+${amount} XP ${reason}`, "xp");
  }

  checkDailyStreak() {
    const today = new Date().toISOString().split("T")[0];
    const lastActive = this.state.lastActiveDate;

    if (lastActive !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      if (lastActive === yesterday) {
        this.state.streak += 1;
      } else {
        this.state.streak = 1;
      }
      this.state.lastActiveDate = today;
      this.saveState();
    }
  }

  checkBadgeUnlocks() {
    const completedCount = this.state.completedLessons.length;

    if (completedCount >= 1 && !this.state.unlockedBadges.includes("first_code")) {
      this.unlockBadge("first_code", "🌱 Primer Código Ejecutado");
    }
    if (completedCount >= 3 && !this.state.unlockedBadges.includes("mod1_master")) {
      this.unlockBadge("mod1_master", "⚡ Maestro de Fundamentos");
    }
    if (completedCount >= 6 && !this.state.unlockedBadges.includes("logic_wizard")) {
      this.unlockBadge("logic_wizard", "🧙‍♂️ Hechicero de la Lógica");
    }
    if (completedCount >= 12 && !this.state.unlockedBadges.includes("data_master")) {
      this.unlockBadge("data_master", "📊 Domador de Estructuras");
    }
  }

  unlockBadge(badgeKey, badgeName) {
    this.state.unlockedBadges.push(badgeKey);
    this.saveState();
    this.playLevelUpFanfare();
    this.showToast(`🏆 ¡Insignia desbloqueada: ${badgeName}!`, "badge");
  }

  updateStatsUI() {
    const xpVal = document.getElementById("stat-xp-val");
    const streakVal = document.getElementById("stat-streak-val");
    const progressFill = document.getElementById("progress-fill");
    const progressText = document.getElementById("progress-text");

    if (xpVal) xpVal.textContent = this.state.xp;
    if (streakVal) streakVal.textContent = this.state.streak;

    if (this.curriculum) {
      const total = this.curriculum.course.totalLessons || 18;
      const done = this.state.completedLessons.length;
      const pct = Math.min(100, Math.round((done / total) * 100));

      if (progressFill) progressFill.style.width = `${pct}%`;
      if (progressText) progressText.textContent = `${pct}% completado (${done}/${total})`;
    }
  }

  initUIEvents() {
    // Botones de ejecución
    const runBtn = document.getElementById("btn-run");
    const verifyBtn = document.getElementById("btn-verify");
    const resetCodeBtn = document.getElementById("btn-reset-code");

    if (runBtn) {
      runBtn.addEventListener("click", () => {
        this.runner.runCode(this.editor.getCode());
      });
    }

    if (verifyBtn) {
      verifyBtn.addEventListener("click", () => {
        if (!this.currentLesson) return;
        this.runner.verifyCode(this.editor.getCode(), this.currentLesson.id);
      });
    }

    if (resetCodeBtn) {
      resetCodeBtn.addEventListener("click", () => {
        if (confirm("¿Deseas reiniciar el código al estado inicial del reto?")) {
          this.editor.resetToStarter();
          this.showToast("Código inicial restaurado", "info");
        }
      });
    }

    // Pestañas de Lección (Teoría, Pistas, Quiz)
    document.querySelectorAll(".lesson-tabs .tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        this.switchLessonTab(tab);
      });
    });

    // Pestañas de Terminal (Consola, Pruebas)
    document.querySelectorAll(".terminal-tabs .term-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.termTab;
        this.switchTerminalTab(tab);
      });
    });

    // Toggle de Sidebar en móvil / escritorio
    const toggleSidebarBtn = document.getElementById("btn-toggle-sidebar");
    if (toggleSidebarBtn) {
      toggleSidebarBtn.addEventListener("click", () => {
        const sidebar = document.getElementById("sidebar");
        sidebar.classList.toggle("collapsed");
      });
    }

    // Modal de Insignias
    const badgesBtn = document.getElementById("btn-open-badges");
    const badgesModal = document.getElementById("modal-badges");
    const closeBadgesBtn = document.getElementById("btn-close-badges");

    if (badgesBtn && badgesModal) {
      badgesBtn.addEventListener("click", () => {
        this.renderBadgesModal();
        badgesModal.classList.add("open");
      });
    }
    if (closeBadgesBtn && badgesModal) {
      closeBadgesBtn.addEventListener("click", () => {
        badgesModal.classList.remove("open");
      });
    }

    // Cerrar modal al hacer click en overlay
    window.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-overlay")) {
        e.target.classList.remove("open");
      }
    });
  }

  switchLessonTab(tabName) {
    document.querySelectorAll(".lesson-tabs .tab-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.tab === tabName);
    });

    document.querySelectorAll(".tab-pane").forEach((pane) => {
      pane.classList.remove("active");
    });

    const activePane = document.getElementById(`tab-${tabName}`);
    if (activePane) activePane.classList.add("active");
  }

  switchTerminalTab(tabName) {
    document.querySelectorAll(".terminal-tabs .term-tab-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.termTab === tabName);
    });

    const consoleView = document.getElementById("terminal-output");
    const testsView = document.getElementById("test-results-container");

    if (tabName === "console") {
      consoleView.style.display = "block";
      testsView.style.display = "none";
    } else {
      consoleView.style.display = "none";
      testsView.style.display = "flex";
    }
  }

  renderBadgesModal() {
    const list = [
      { id: "welcome", icon: "🚀", name: "Bienvenido a CodeStart", desc: "Comenzaste tu aventura en programación." },
      { id: "first_code", icon: "🌱", name: "Primer Código", desc: "Superaste tu primer reto interactivo." },
      { id: "mod1_master", icon: "⚡", name: "Fundamentos Pro", desc: "Dominaste print, variables y tipos de datos." },
      { id: "logic_wizard", icon: "🧙‍♂️", name: "Mago de la Lógica", desc: "Controlaste el flujo condicional con if y elif." },
      { id: "loop_champion", icon: "🔄", name: "Rey del Bucle", desc: "Automatizaste procesos con bucles for y while." },
      { id: "data_master", icon: "📊", name: "Estructuras de Datos", desc: "Gestionaste listas y diccionarios complejos." }
    ];

    const grid = document.getElementById("badges-grid");
    if (!grid) return;

    grid.innerHTML = list.map((b) => {
      const isUnlocked = this.state.unlockedBadges.includes(b.id);
      return `
        <div class="badge-card ${isUnlocked ? 'unlocked' : ''}">
          <div class="badge-icon">${b.icon}</div>
          <div class="badge-name">${b.name}</div>
          <div class="badge-desc">${b.desc}</div>
        </div>
      `;
    }).join("");
  }

  showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(20px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Sintetizador Web Audio (sin dependencias mp3)
  getAudioContext() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.audioContext = new AudioCtx();
    }
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  playTone(freq, type = "sine", duration = 0.1) {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }

  playSuccessChime() {
    this.playTone(523.25, "triangle", 0.1); // C5
    setTimeout(() => this.playTone(659.25, "triangle", 0.12), 100); // E5
    setTimeout(() => this.playTone(783.99, "triangle", 0.25), 200); // G5
  }

  playLevelUpFanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      setTimeout(() => this.playTone(n, "triangle", 0.2), i * 120);
    });
  }

  triggerConfetti() {
    const canvas = document.getElementById("confetti-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ["#10b981", "#06b6d4", "#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6"];

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.5) * 14 - 3,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1
      });
    }

    let animationFrame;
    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // Gravedad
        p.life -= 0.02;

        if (p.life > 0) {
          alive++;
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      if (alive > 0) {
        animationFrame = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    render();
  }

  parseTheoryMarkdown(text) {
    if (!text) return "";

    let md = text;

    // Encabezados
    md = md.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    md = md.replace(/^#### (.*$)/gim, '<h4>$1</h4>');

    // Bloques de código ```python ... ```
    md = md.replace(/```python([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    md = md.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Código en línea `code`
    md = md.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Negritas
    md = md.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Listas desordenadas
    md = md.replace(/^\- (.*$)/gim, '<li>$1</li>');
    md = md.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');

    // Listas ordenadas
    md = md.replace(/^[0-9]+\. (.*$)/gim, '<li>$1</li>');

    // Párrafos
    const paragraphs = md.split("\n\n");
    return paragraphs.map(p => {
      p = p.trim();
      if (!p) return "";
      if (p.startsWith("<h") || p.startsWith("<pre") || p.startsWith("<ul") || p.startsWith("<li")) return p;
      return `<p>${p}</p>`;
    }).join("");
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  window.app = new CodeStartApp();
});
