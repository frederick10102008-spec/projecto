#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CodeStart - Servidor Educativo y API de Ejecución
Plataforma Interactiva para Aprender Programación desde Cero
"""

import sys
import os
import json
import time
import subprocess
import tempfile
import urllib.parse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

# Configurar codificación segura para consola en Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

PORT = 8000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
CURRICULUM_FILE = os.path.join(STATIC_DIR, "data", "curriculum.json")

# Cargar currículo en memoria
curriculum_data = {}
try:
    with open(CURRICULUM_FILE, "r", encoding="utf-8") as f:
        curriculum_data = json.load(f)
except Exception as e:
    print(f"[CodeStart] Advertencia al cargar currículo: {e}")

def get_lesson_by_id(lesson_id):
    """Busca una lección específica dentro de la estructura de módulos."""
    for mod in curriculum_data.get("modules", []):
        for lesson in mod.get("lessons", []):
            if lesson.get("id") == lesson_id:
                return lesson
    return None

def clean_text_for_comparison(text: str) -> str:
    """Limpia puntuación y normaliza caracteres para una evaluación didáctica flexible."""
    if not text:
        return ""
    # Quitar signos de apertura como ¡ y ¿ y comillas redundantes
    cleaned = text.replace("¡", "").replace("¿", "").replace('"', '').replace("'", "")
    # Normalizar espacios y minúsculas
    return " ".join(cleaned.lower().split())

def run_python_sandbox(code: str, timeout_sec: float = 4.0):
    """Ejecuta código Python en un subproceso aislado con control de tiempo y codificación UTF-8."""
    start_time = time.time()
    
    # Preparar código asegurando UTF-8
    full_code = "# -*- coding: utf-8 -*-\n" + code

    # Crear archivo temporal
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as tf:
        temp_name = tf.name
        tf.write(full_code)
    
    stdout_res = ""
    stderr_res = ""
    exit_code = 0
    timeout_triggered = False

    # Configurar entorno seguro y UTF-8 forzado
    sandbox_env = os.environ.copy()
    sandbox_env["PYTHONIOENCODING"] = "utf-8"
    sandbox_env["PYTHONUTF8"] = "1"

    try:
        proc = subprocess.Popen(
            [sys.executable, temp_name],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=sandbox_env,
            text=True,
            encoding="utf-8",
            errors="replace"
        )
        try:
            stdout_res, stderr_res = proc.communicate(timeout=timeout_sec)
            exit_code = proc.returncode
        except subprocess.TimeoutExpired:
            proc.kill()
            stdout_res, stderr_res = proc.communicate()
            timeout_triggered = True
            exit_code = -1
            stderr_res = (
                f"⏱️ Tiempo límite excedido ({timeout_sec}s).\n"
                "¿Tienes un bucle infinito (como un 'while' que nunca termina)?\n"
                "Revisa las condiciones de parada de tus bucles."
            )
    except Exception as e:
        exit_code = -1
        stderr_res = f"Error al ejecutar el intérprete: {str(e)}"
    finally:
        try:
            if os.path.exists(temp_name):
                os.remove(temp_name)
        except Exception:
            pass

    elapsed_ms = round((time.time() - start_time) * 1000, 2)
    return {
        "stdout": stdout_res,
        "stderr": stderr_res,
        "exit_code": exit_code,
        "execution_time_ms": elapsed_ms,
        "timeout": timeout_triggered
    }

def analyze_python_error_pedagogically(error_str: str, code: str, lesson: dict = None) -> str:
    """Traduce y explica los errores de Python en un lenguaje didáctico y amigable."""
    lines = error_str.strip().split("\n")
    last_line = lines[-1] if lines else error_str

    if "SyntaxError" in error_str:
        if "invalid syntax" in error_str.lower():
            return (
                "🔍 **Error de Sintaxis (SyntaxError):**\n"
                "Python no entendió la estructura de esa línea. Revisa si:\n"
                "1. Olvidaste cerrar unas comillas (`\"` o `'`) o un paréntesis `)`.\n"
                "2. Te faltan los dos puntos `:` al final de un `if`, `for`, `while` o `def`.\n"
                "3. Escribiste un nombre reservado en un lugar incorrecto."
            )
        if "was never closed" in error_str.lower():
            return (
                "🔍 **Paréntesis o comillas sin cerrar:**\n"
                "Has abierto un paréntesis `(` o unas comillas `\"` y olvidaste cerrarlos antes de terminar la línea."
            )
        return f"🔍 **Error de sintaxis detectado:**\nHay una regla gramatical de Python que no se cumple en: `{last_line}`."

    if "IndentationError" in error_str:
        return (
            "📐 **Error de Indentación (Sangría):**\n"
            "En Python, los espacios al inicio de cada línea son sagrados.\n"
            "- Todo bloque dentro de un `if`, `else`, `for` o `def` debe estar indentado (recomendado: 4 espacios o 1 tecla Tab).\n"
            "- Revisa que no hayas mezclado tabs con espacios."
        )

    if "NameError" in error_str:
        var_name = "la variable"
        if "'" in last_line:
            var_name = f"'{last_line.split('\'')[1]}'"
        return (
            f"🏷️ **Variable o función no definida (NameError):**\n"
            f"Python intentó usar {var_name}, pero no sabe qué es.\n"
            "- ¿Escribiste bien el nombre? Recuerda que Python distingue mayúsculas y minúsculas (ej: `print` vs `Print`).\n"
            "- Si querías escribir texto, ¿olvidaste ponerlo entre comillas?"
        )

    if "TypeError" in error_str:
        return (
            "🧩 **Error de Tipo (TypeError):**\n"
            "Intentaste hacer una operación entre tipos de datos incompatibles.\n"
            "Por ejemplo, no se puede sumar directamente un número y un texto (`5 + \"10\"`).\n"
            "Tip: Puedes convertir texto a número con `int(\"10\")` o número a texto con `str(5)`."
        )

    if "ZeroDivisionError" in error_str:
        return (
            "➗ **División por Cero:**\n"
            "En matemáticas y programación no es posible dividir entre 0.\n"
            "Asegúrate de comprobar si el divisor es distinto de 0 antes de dividir o maneja la excepción con `try/except`."
        )

    if "IndexError" in error_str:
        return (
            "📋 **Índice fuera de rango (IndexError):**\n"
            "Intentaste acceder a una posición de la lista que no existe.\n"
            "Recuerda que una lista de 3 elementos tiene las posiciones 0, 1 y 2. Si pides el índice 3, dará error."
        )

    if "KeyError" in error_str:
        return (
            "🔑 **Clave no encontrada (KeyError):**\n"
            "Intentaste buscar una clave en un diccionario que no fue definida.\n"
            "Comprueba la ortografía de la clave que estás solicitando."
        )

    return f"💡 **Consejo del Mentor:**\nPython reportó: `{last_line}`.\nRevisa la línea señalada y compara tu código con el objetivo del ejercicio."

def generate_ai_mentor_response(user_message: str, code: str, lesson_id: str, mode: str = "chat"):
    """Generador de respuestas del Mentor AI con pedagogía constructivista."""
    lesson = get_lesson_by_id(lesson_id)
    lesson_title = lesson.get("title", "Fundamentos de Programación") if lesson else "General"
    
    # Si el usuario pide explicación de un error
    if mode == "explain_error":
        return analyze_python_error_pedagogically(user_message, code, lesson)

    # Si el usuario pide una pista directa
    if mode == "hint":
        if lesson and lesson.get("hints"):
            hints = lesson["hints"]
            return (
                "🎯 **Pista del Mentor:**\n"
                + "\n\n".join([f"**Paso {i+1}:** {h}" for i, h in enumerate(hints)])
            )
        return "💡 Concéntrate en leer la descripción del objetivo y verificar que los nombres de las variables coincidan exactamente."

    # Si es modo revisión de código
    if mode == "review":
        notes = []
        if "print" in code:
            notes.append("✅ Estás utilizando `print()` correctamente para mostrar salidas.")
        if "#" in code:
            notes.append("✅ Excelente hábito: estás utilizando comentarios en tu código.")
        if "  " in code and "\t" in code:
            notes.append("⚠️ Cuidado: parece que tienes una mezcla de tabulaciones y espacios.")
        if len(code.strip()) == 0:
            notes.append("⚠️ El editor está vacío. ¡Escribe tus primeras líneas para empezar!")
        
        response_text = "🧐 **Revisión de tu código:**\n\n"
        if notes:
            response_text += "\n".join(notes)
        else:
            response_text += "Tu código tiene una estructura limpia. Dale al botón **'Comprobar'** para validar los retos."
        return response_text

    # Modo chat interactivo general
    lower_msg = user_message.lower()
    
    if "hola" in lower_msg or "saludos" in lower_msg:
        return f"¡Hola! 👋 Soy tu tutor de IA en CodeStart. Actualmente estás en la lección: **{lesson_title}**. ¿Tienes dudas sobre la teoría, un error en tu código o necesitas una pista guiada?"
    
    if "variable" in lower_msg:
        return (
            "📦 **¿Qué es una variable?**\n"
            "Una variable es como una caja etiquetada donde guardas datos en la memoria:\n"
            "```python\n"
            "puntos = 100\n"
            "nombre = \"Sofia\"\n"
            "```\n"
            "Para cambiar su valor, simplemente reasígnala: `puntos = 150`."
        )

    if "bucle" in lower_msg or "loop" in lower_msg or "for" in lower_msg or "while" in lower_msg:
        return (
            "🔄 **Sobre los Bucles:**\n"
            "- Usa **`for`** cuando sabes de antemano cuántas veces vas a repetir algo o vas a recorrer una lista: `for i in range(5):`\n"
            "- Usa **`while`** cuando quieres repetir algo mientras una condición se cumpla: `while energia > 0:` (recuerda restar energía o será infinito)."
        )

    if "función" in lower_msg or "funcion" in lower_msg or "def" in lower_msg or "return" in lower_msg:
        return (
            "⚙️ **Funciones en Python:**\n"
            "Se crean con `def nombre_funcion(parametros):`.\n"
            "La diferencia de oro:\n"
            "- `print()` sólo muestra texto en pantalla.\n"
            "- `return` entrega un valor para que el resto del programa pueda seguir haciendo cálculos con él."
        )

    if "solución" in lower_msg or "dame el codigo" in lower_msg or "hazlo tu" in lower_msg:
        return (
            "🤖 **Mi misión es que aprendas a pensar como programador:**\n"
            "En lugar de darte la respuesta copiada, dime: ¿en qué paso te estás atascando? "
            "Revisa la pestaña de **Pistas** o dale a **Explicar Error** para avanzar juntos paso a paso."
        )

    # Respuesta por defecto pedagógica
    return (
        f"🤖 **Mentor CodeStart:**\n"
        f"Entendido tu consulta sobre *\"{user_message}\"*. "
        f"En el contexto de la lección **{lesson_title}**, te recomiendo revisar el objetivo a la izquierda y probar tu código con el botón **Ejecutar**. "
        f"Si hay algún error en la consola roja, presiona **'¿Por qué falló?'** y te lo explico al instante."
    )

class CodeStartRequestHandler(SimpleHTTPRequestHandler):
    """Manejador HTTP que sirve archivos estáticos y gestiona la API REST."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/" or path == "":
            self.path = "/index.html"
            return super().do_GET()

        if path == "/api/curriculum":
            self.send_json_response(curriculum_data)
            return

        if path == "/api/status":
            self.send_json_response({
                "status": "online",
                "app": "CodeStart",
                "version": "1.0.0",
                "python_version": sys.version
            })
            return

        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # Leer cuerpo de la petición
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
        
        try:
            body = json.loads(post_data) if post_data else {}
        except Exception:
            body = {}

        if path == "/api/run":
            code = body.get("code", "")
            result = run_python_sandbox(code)
            self.send_json_response(result)
            return

        if path == "/api/test":
            code = body.get("code", "")
            lesson_id = body.get("lesson_id", "")
            lesson = get_lesson_by_id(lesson_id)
            
            if not lesson:
                self.send_json_response({"error": "Lección no encontrada", "passed": False}, status=404)
                return

            # Ejecutar código en sandbox
            exec_result = run_python_sandbox(code)
            stdout = exec_result.get("stdout", "").strip()
            stderr = exec_result.get("stderr", "").strip()
            exit_code = exec_result.get("exit_code", 0)

            tests_report = []
            all_passed = True

            if exit_code != 0:
                all_passed = False
                tests_report.append({
                    "name": "Ejecución sin errores",
                    "passed": False,
                    "expected": "Código finalizado con éxito (código 0)",
                    "actual": f"Error reportado:\n{stderr}"
                })
            else:
                tests = lesson.get("tests", [])
                test_type = lesson.get("testType", "output_contains")

                for t in tests:
                    t_name = t.get("name", "Prueba de salida")
                    expected = t.get("expected", "").strip()
                    
                    if test_type == "output_contains":
                        # Verificación flexible (exacta o limpia de caracteres especiales como ¡ o comillas)
                        clean_exp = clean_text_for_comparison(expected)
                        clean_act = clean_text_for_comparison(stdout)
                        passed = (expected.lower() in stdout.lower()) or (clean_exp in clean_act) if expected else True
                    elif test_type == "output_exact":
                        passed = (stdout.strip() == expected) or (clean_text_for_comparison(stdout) == clean_text_for_comparison(expected))
                    else:
                        clean_exp = clean_text_for_comparison(expected)
                        clean_act = clean_text_for_comparison(stdout)
                        passed = (expected.lower() in stdout.lower()) or (clean_exp in clean_act)

                    if not passed:
                        all_passed = False

                    tests_report.append({
                        "id": t.get("id"),
                        "name": t_name,
                        "passed": passed,
                        "expected": expected,
                        "actual": stdout,
                        "hidden": t.get("hidden", False)
                    })

            self.send_json_response({
                "passed": all_passed,
                "stdout": stdout,
                "stderr": stderr,
                "tests": tests_report,
                "xp_awarded": lesson.get("xp", 50) if all_passed else 0,
                "execution_time_ms": exec_result.get("execution_time_ms", 0)
            })
            return

        if path == "/api/ai-chat":
            user_message = body.get("message", "")
            code = body.get("code", "")
            lesson_id = body.get("lesson_id", "")
            mode = body.get("mode", "chat")
            
            ai_reply = generate_ai_mentor_response(user_message, code, lesson_id, mode)
            self.send_json_response({
                "response": ai_reply,
                "mode": mode,
                "timestamp": time.time()
            })
            return

        self.send_json_response({"error": "Endpoint no encontrado"}, status=404)

    def send_json_response(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(body)
        self.wfile.flush()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

def run_server():
    server_address = ("127.0.0.1", PORT)
    httpd = ThreadingHTTPServer(server_address, CodeStartRequestHandler)
    print("=" * 65)
    print(f"[*] CodeStart Servidor Educativo Activo!")
    print(f"[*] Accede en tu navegador a: http://localhost:{PORT}")
    print(f"[*] Sirviendo contenido desde: {STATIC_DIR}")
    print(f"[*] Interprete Python: {sys.executable}")
    print("=" * 65)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nDeteniendo servidor CodeStart...")
        httpd.server_close()

if __name__ == "__main__":
    run_server()
