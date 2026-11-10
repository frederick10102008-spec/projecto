# 🚀 CodeStart – Plataforma Interactiva para Aprender Programación desde Cero

**CodeStart** es una aplicación educativa web integral diseñada para llevar a cualquier estudiante desde el nivel novato absoluto hasta un nivel intermedio en programación (utilizando **Python 3** como lenguaje principal).

A diferencia de la documentación estática tradicional, **CodeStart es un entorno activo de práctica y validación**: el alumno lee la teoría paso a paso, escribe código real en un editor interactivo, lo ejecuta en un entorno aislado (sandbox), recibe retroalimentación inmediata mediante casos de prueba automatizados y cuenta con un **Mentor de Inteligencia Artificial** que traduce los errores a un lenguaje humano y pedagógico.

---

## 🌟 Características Principales

### 1. 📚 Ruta de Aprendizaje Estructurada (Currículo Progresivo)
- **Módulo 1: Fundamentos y Primeros Pasos**: ¿Qué es programar?, `print()`, variables y tipos de datos (`int`, `float`, `str`, `bool`), operadores matemáticos y `f-strings`.
- **Módulo 2: Toma de Decisiones**: Flujo de control con `if`, indentación obligatoria en Python, `else`, `elif` y lógica booleana (`and`, `or`, `not`).
- **Módulo 3: Bucles y Automatización**: Repetición eficiente con `for` y `range()`, bucle condicional `while`, acumuladores numéricos y prevención de bucles infinitos.
- **Módulo 4: Estructuras de Datos**: Listas ordenadas (`append`, índices base-0, `len`) y diccionarios con claves y valores del mundo real.
- **Módulo 5: Funciones y Modularidad**: Empaquetado de código con `def`, paso de parámetros y la distinción fundamental entre `print()` y `return`.
- **Módulo 6: Proyecto Integrador (Nivel Intermedio)**: Manejo robusto de errores con `try / except` y construcción de una aplicación completa de carrito de compras y facturación con descuentos.

---

### 2. 💻 Entorno de Desarrollo y Ejecución Real (Sandbox)
- **Editor de Código Enriquecido**: Números de línea sincronizados, auto-cierre de paréntesis/comillas/llaves, gestión inteligente de tabulaciones (4 espacios) e indentación automática tras dos puntos `:`.
- **Atajos de Teclado**: Ejecuta y comprueba tu código instantáneamente con `Ctrl + Enter`.
- **Ejecución Segura en Sandbox**: Ejecución controlada con subprocesos en Python, límites de tiempo para evitar bloqueos por bucles infinitos y captura de `stdout` y `stderr`.
- **Evaluación Automatizada de Pruebas**: Comprobación visual instantánea de requerimientos con salida esperada vs. obtenida.

---

### 3. 🤖 Mentor de Inteligencia Artificial Integrado
- **Explicador Didáctico de Errores**: Con un solo clic (`¿Por qué falló?`), el mentor traduce errores crípticos como `SyntaxError`, `IndentationError` o `ZeroDivisionError` en explicaciones claras y sugerencias para solucionarlos.
- **Pistas Progresivas sin Spoilers**: Brinda pistas en 3 niveles de ayuda para estimular el pensamiento computacional del alumno sin entregarle la respuesta directa.
- **Chat Interactivo**: El estudiante puede consultar cualquier duda conceptual o pedir analogías del mundo real en cualquier momento.

---

### 4. 🎮 Gamificación y Retención del Estudiante
- **Sistema de Puntos de Experiencia (XP)**: Recompensas al superar lecciones (+50 XP), retos complejos (+100 XP) y quizzes (+25 XP).
- **Racha de Estudio (Streaks)**: Medidor de consistencia diaria con icono de fuego.
- **Insignias y Medallas Desbloqueables**: Logros visuales según el avance por los módulos.
- **Efectos Sensoriales**: Chimes de éxito mediante Web Audio API y animación de confeti al superar los retos de código.
- **Persistencia Local**: Progreso guardado automáticamente en el navegador (`localStorage`).

---

## 🛠️ Estructura del Proyecto

```
codestart/
├── server.py              # Servidor HTTP y API REST (endpoints /api/run, /api/test, /api/ai-chat, /api/curriculum)
├── README.md              # Documentación completa del proyecto
└── static/
    ├── index.html         # Interfaz web responsiva (SPA)
    ├── css/
    │   └── styles.css     # Sistema de diseño moderno (Glassmorphism, Dark Mode, animación de confeti)
    ├── js/
    │   ├── app.js         # Orquestador del estado, gamificación, audio y currículo
    │   ├── editor.js      # Editor de código, numeración de líneas y atajos de teclado
    │   ├── runner.js      # Comunicación con sandbox de ejecución y visualizador de pruebas
    │   └── ai-mentor.js   # Interfaz de chat y lógica del tutor con IA
    └── data/
        └── curriculum.json# Banco pedagógico de módulos, lecciones, retos, pistas y quizzes
```

---

## 🚀 Cómo Iniciar la Plataforma

No necesitas instalar Node.js ni paquetes externos complejos: funciona 100% con la instalación estándar de **Python 3**.

1. Abre tu terminal (PowerShell, Símbolo del Sistema o Bash).
2. Dirígete a la carpeta del proyecto:
   ```powershell
   cd C:\Users\Usuario\.gemini\antigravity\scratch\codestart
   ```
3. Ejecuta el servidor:
   ```powershell
   python server.py
   ```
4. Abre tu navegador web en:
   ```
   http://localhost:8000
   ```
