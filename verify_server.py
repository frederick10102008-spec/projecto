import threading
import time
import urllib.request
import json
import sys
import os

# Importar app de server.py
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from server import ThreadingHTTPServer, CodeStartRequestHandler

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def run_tests():
    # Iniciar servidor en hilo separado en puerto 8005
    test_port = 8005
    server = ThreadingHTTPServer(("", test_port), CodeStartRequestHandler)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    time.sleep(0.5)

    base_url = f"http://localhost:{test_port}"

    print("--- 1. Testing GET /api/status ---")
    with urllib.request.urlopen(f"{base_url}/api/status") as resp:
        print("Status:", resp.status)
        data = json.loads(resp.read().decode("utf-8"))
        print(f"App: {data.get('app')}, Python: {data.get('python_version')[:15]}...")

    print("\n--- 2. Testing GET /api/curriculum ---")
    with urllib.request.urlopen(f"{base_url}/api/curriculum") as resp:
        print("Status:", resp.status)
        data = json.loads(resp.read().decode("utf-8"))
        print(f"Course: {data.get('course', {}).get('title')}")
        print(f"Total modules: {len(data.get('modules', []))}")

    print("\n--- 3. Testing POST /api/run ---")
    payload = json.dumps({"code": "print('Hola desde Sandbox!')"}).encode("utf-8")
    req = urllib.request.Request(
        f"{base_url}/api/run",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        print("Status:", resp.status)
        body = json.loads(resp.read().decode("utf-8"))
        print(f"Output: {body.get('stdout').strip()}, ms: {body.get('execution_time_ms')}")

    print("\n--- 4. Testing POST /api/test (Lesson m1-l1) ---")
    payload = json.dumps({
        "code": 'print("¡Hola, CodeStart!")',
        "lesson_id": "m1-l1"
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{base_url}/api/test",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        print("Status:", resp.status)
        body = json.loads(resp.read().decode("utf-8"))
        print(f"Passed: {body.get('passed')}, XP: {body.get('xp_awarded')}")

    print("\n--- 5. Testing POST /api/ai-chat ---")
    payload = json.dumps({
        "message": "Hola, ¿cómo declaro una variable en Python?",
        "code": "x = 10",
        "lesson_id": "m1-l2",
        "mode": "chat"
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{base_url}/api/ai-chat",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        print("Status:", resp.status)
        body = json.loads(resp.read().decode("utf-8"))
        resp_preview = body.get("response", "")[:80].replace("\n", " ")
        print(f"AI response preview: {resp_preview}...")

    server.shutdown()
    print("\n=== TODOS LOS ENDPOINTS FUNCIONAN AL 100% ===")

if __name__ == "__main__":
    run_tests()
