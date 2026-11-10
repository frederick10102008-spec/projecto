# 📦 Proyecto CodeStart – Documento de Entrega y Especificación

## 1. Ubicación de los Archivos
- **Carpeta del Proyecto:** `C:\Users\Usuario\.gemini\antigravity\scratch\codestart`
- **Archivo Comprimido (ZIP) en el Escritorio:** `C:\Users\Usuario\Desktop\CodeStart-Plataforma.zip`

---

## 2. Descripción General
**CodeStart** es una plataforma educativa web integral para el aprendizaje interactivo de la programación en **Python 3** desde nivel principiante hasta intermedio.

A diferencia de los cursos tradicionales basados en texto estático o vídeos pasivos, CodeStart integra:
1. **Ruta Curricular Modular**: 6 módulos con teoría concisa, metas claras y quizzes.
2. **Editor de Código en Vivo**: Con sangría automática, números de línea sincronizados y atajos de teclado (`Ctrl + Enter`).
3. **Sandbox de Ejecución en Tiempo Real**: Ejecución en subprocesos con control de tiempo límite contra bucles infinitos.
4. **Verificación Automatizada**: Validación instantánea con suite de pruebas unitarias.
5. **Mentor de Inteligencia Artificial**: Traductor pedagógico de errores (`SyntaxError`, `IndentationError`, etc.), generador de pistas y tutor de conceptos.
6. **Gamificación y Audio**: Puntos de experiencia (XP), medallas desbloqueables, racha de días y feedback sonoro con Web Audio API.

---

## 3. Estructura de Archivos

```
codestart/
├── server.py                   # Servidor multihilo y API REST en Python estándar
├── verify_server.py            # Suite de verificación automatizada de endpoints
├── README.md                   # Guía de inicio rápido y manual técnico
├── PROYECTO_CODESTART_RESUMEN.md # Documento de entrega y especificación
└── static/
    ├── index.html              # Interfaz de usuario SPA responsiva
    ├── css/
    │   └── styles.css          # Sistema de diseño moderno en Dark Mode
    ├── js/
    │   ├── app.js              # Controlador principal, estado, gamificación y audio
    │   ├── editor.js           # Lógica del editor de código
    │   ├── runner.js           # Conector con la API sandbox y reporte de tests
    │   └── ai-mentor.js        # Chat y asistente inteligente
    └── data/
        └── curriculum.json     # Banco de módulos, lecciones, retos y quizzes
```

---

## 4. Requisitos y Puesta en Marcha

### Requisitos:
- **Python 3.8 o superior** (No requiere dependencias externas como Node.js, npm, ni paquetes pip de terceros).

### Para ejecutar:
```powershell
cd C:\Users\Usuario\.gemini\antigravity\scratch\codestart
python server.py
```
Abrir en el navegador: **`http://localhost:8000`**
