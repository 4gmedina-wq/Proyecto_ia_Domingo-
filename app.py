import subprocess
import requests
from flask import Flask, jsonify, render_template_string, request

app = Flask(__name__)

JARVIS_TEMPLATE = """
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>J.A.R.V.I.S. - Sistema Operativo IA Avanzado</title>
    <style>
        :root {
            --bg-main: #050b14;
            --bg-panel: #0f172a;
            --bg-card: #1e293b;
            --accent: #00f0ff;
            --accent-glow: rgba(0, 240, 255, 0.3);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --border: #334155;
            --danger: #ef4444;
            --success: #22c55e;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; background: var(--bg-main); color: var(--text-main); height: 100vh; display: flex; justify-content: center; align-items: center; overflow: hidden; }

        .app-container { width: 96vw; max-width: 1350px; height: 94vh; background: var(--bg-panel); border-radius: 16px; box-shadow: 0 0 50px rgba(0, 240, 255, 0.1); display: grid; grid-template-columns: 300px 1fr; border: 1px solid var(--border); overflow: hidden; }

        /* Panel Lateral de Control */
        .sidebar { background: var(--bg-card); border-right: 1px solid var(--border); padding: 22px; display: flex; flex-direction: column; gap: 20px; }
        .sidebar h2 { font-size: 1rem; color: var(--accent); letter-spacing: 1.5px; border-bottom: 1px solid var(--border); padding-bottom: 10px; text-transform: uppercase; }
        
        .control-group { display: flex; flex-direction: column; gap: 8px; }
        .control-group label { font-size: 0.85rem; color: var(--text-muted); display: flex; justify-content: space-between; }
        .control-group input[type="range"] { accent-color: var(--accent); cursor: pointer; }
        .control-group input[type="text"] { background: var(--bg-main); border: 1px solid var(--border); color: var(--text-main); padding: 8px 12px; border-radius: 6px; font-size: 0.85rem; outline: none; }

        .tools-box { background: var(--bg-main); padding: 14px; border-radius: 8px; border: 1px solid var(--border); font-size: 0.85rem; }
        .tools-box ul { padding-left: 16px; color: var(--text-muted); margin-top: 6px; display: flex; flex-direction: column; gap: 4px; }

        /* Estilos de Botones de Voz */
        .voice-status-box { background: rgba(0, 240, 255, 0.05); border: 1px solid var(--accent); padding: 12px; border-radius: 8px; text-align: center; }
        .voice-toggle { background: transparent; border: 1px solid var(--accent); color: var(--accent); padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: bold; width: 100%; transition: all 0.3s; }
        .voice-toggle.active { background: var(--accent); color: var(--bg-main); box-shadow: 0 0 15px var(--accent-glow); }

        /* Panel Principal de Chat */
        .chat-main { display: flex; flex-direction: column; height: 100%; background: var(--bg-main); position: relative; }
        .chat-header { background: var(--bg-card); padding: 18px 25px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        
        .status-indicator { display: flex; align-items: center; gap: 10px; font-size: 0.95rem; font-weight: 600; letter-spacing: 0.5px; }
        .dot { width: 12px; height: 12px; background: var(--success); border-radius: 50%; box-shadow: 0 0 12px var(--success); animation: pulse-dot 2s infinite; }

        .chat-messages { flex: 1; padding: 25px; overflow-y: auto; display: flex; flex-direction: column; gap: 18px; scroll-behavior: smooth; }
        .message { max-width: 78%; padding: 15px 20px; border-radius: 14px; font-size: 0.95rem; line-height: 1.6; word-wrap: break-word; animation: fadeIn 0.3s ease; }
        .user { background: linear-gradient(135deg, #0284c7, #0369a1); color: white; align-self: flex-end; border-bottom-right-radius: 4px; box-shadow: 0 4px 15px rgba(2, 132, 199, 0.3); }
        .assistant { background: var(--bg-card); color: var(--text-main); align-self: flex-start; border-bottom-left-radius: 4px; border: 1px solid var(--border); box-shadow: 0 4px 15px rgba(0,0,0,0.4); }

        /* Animación de Carga Futurista */
        .loading { font-style: italic; color: var(--accent); font-size: 0.85rem; padding-left: 25px; display: none; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
        .loading::after { content: ''; width: 12px; height: 12px; border: 2px solid var(--accent); border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; }

        /* Área de Escritura y Micrófono */
        .chat-input-area { padding: 20px; background: var(--bg-card); border-top: 1px solid var(--border); display: flex; gap: 12px; align-items: center; }
        textarea { flex: 1; background: var(--bg-main); border: 1px solid var(--border); border-radius: 10px; padding: 14px; color: var(--text-main); font-size: 0.95rem; resize: none; height: 52px; outline: none; transition: border-color 0.2s; }
        textarea:focus { border-color: var(--accent); box-shadow: 0 0 10px var(--accent-glow); }

        button.action-btn { background: var(--accent); color: var(--bg-main); border: none; padding: 0 26px; height: 52px; border-radius: 10px; font-weight: bold; cursor: pointer; transition: transform 0.1s, box-shadow 0.2s; font-size: 0.95rem; }
        button.action-btn:hover { box-shadow: 0 0 20px var(--accent-glow); transform: translateY(-1px); }
        
        button.mic-btn { background: var(--bg-main); border: 1px solid var(--border); color: var(--text-main); width: 52px; height: 52px; border-radius: 10px; cursor: pointer; display: flex; justify-content: center; align-items: center; font-size: 1.3rem; transition: all 0.2s; }
        button.mic-btn:hover { border-color: var(--accent); color: var(--accent); }
        button.mic-btn.listening { background: var(--danger); border-color: var(--danger); color: white; animation: pulse-mic 1.2s infinite; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
        @keyframes pulse-mic { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

        @media(max-width: 768px) {
            .app-container { grid-template-columns: 1fr; height: 100vh; border-radius: 0; }
            .sidebar { display: none; }
        }
    </style>
</head>
<body>
    <div class="app-container">
        <!-- Panel Lateral -->
        <div class="sidebar">
            <h2>⚙ Parámetros IA</h2>
            <div class="control-group">
                <label>Temperatura: <span id="tempVal" style="color:var(--accent);">0.3</span></label>
                <input type="range" id="temperature" min="0.1" max="1.0" step="0.1" value="0.3" oninput="document.getElementById('tempVal').innerText=this.value">
            </div>
            <div class="control-group">
                <label>Modelo Activo:</label>
                <input type="text" value="deepseek-r1:1.5b" disabled>
            </div>

            <h2>🔊 Síntesis de Voz</h2>
            <div class="voice-status-box">
                <button class="voice-toggle active" id="voiceToggle" onclick="toggleVoz()">Voz: Activada</button>
            </div>

            <h2>🛠️ Capacidades</h2>
            <div class="tools-box">
                <strong>Módulos del Sistema:</strong>
                <ul>
                    <li>Text-to-Speech & Speech-to-Text</li>
                    <li>Python Execution Runner</li>
                    <li>Core Local Ollama</li>
                </ul>
            </div>
        </div>

        <!-- Ventana Principal -->
        <div class="chat-main">
            <div class="chat-header">
                <div class="status-indicator">
                    <div class="dot"></div>
                    <span>J.A.R.V.I.S. // Sistemas Operativos Enlazados</span>
                </div>
                <button onclick="limpiarChat()" style="background: transparent; border: 1px solid var(--border); color: var(--text-muted); padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">Reiniciar</button>
            </div>

            <div class="chat-messages" id="chatMessages">
                <div class="message assistant">Sistemas en línea y calibrados. A su entera disposición, señor. ¿Qué orden ejecutamos hoy?</div>
            </div>

            <div class="loading" id="loadingIndicator">Analizando parámetros y generando respuesta...</div>

            <div class="chat-input-area">
                <button class="mic-btn" id="micBtn" onclick="toggleMicrofono()" title="Activar Micrófono">🎙️</button>
                <textarea id="userInput" placeholder="Escribe tu instrucción o comando..." rows="1" onkeydown="handleKey(event)"></textarea>
                <button class="action-btn" onclick="enviarMensaje()">Enviar</button>
            </div>
        </div>
    </div>

    <script>
        let vozActiva = true;
        let recognition = null;
        let escuchando = false;

        // Configuración de Reconocimiento de Voz (Speech-to-Text)
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.lang = 'es-ES';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onresult = function(event) {
                const textoTranscrito = event.results[0][0].transcript;
                document.getElementById('userInput').value = textoTranscrito;
                detenerEscucha();
                enviarMensaje();
            };

            recognition.onerror = () => detenerEscucha();
            recognition.onend = () => detenerEscucha();
        }

        function toggleMicrofono() {
            if (!recognition) {
                alert("Su navegador no soporta reconocimiento de voz nativo.");
                return;
            }
            if (escuchando) {
                recognition.stop();
            } else {
                recognition.start();
                escuchando = true;
                document.getElementById('micBtn').classList.add('listening');
            }
        }

        function detenerEscucha() {
            escuchando = false;
            document.getElementById('micBtn').classList.remove('listening');
        }

        function toggleVoz() {
            vozActiva = !vozActiva;
            const btn = document.getElementById('voiceToggle');
            if (vozActiva) {
                btn.textContent = "Voz: Activada";
                btn.classList.add('active');
            } else {
                btn.textContent = "Voz: Desactivada";
                btn.classList.remove('active');
                window.speechSynthesis.cancel();
            }
        }

        function hablarTexto(texto) {
            if (!vozActiva || !('speechSynthesis' in window)) return;
            window.speechSynthesis.cancel();
            
            // Limpieza de etiquetas de pensamiento para que la voz no lea las etiquetas técnicas
            let textoLimpio = texto.replace(/<think>[\\s\\S]*?<\/think>/g, '').trim();
            
            const utterance = new SpeechSynthesisUtterance(textoLimpio);
            utterance.lang = 'es-ES';
            utterance.rate = 1.05;
            window.speechSynthesis.speak(utterance);
        }

        function handleKey(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                enviarMensaje();
            }
        }

        function limpiarChat() {
            document.getElementById('chatMessages').innerHTML = '<div class="message assistant">Historial purgado. Listo para nuevas directrices, señor.</div>';
        }

        async function enviarMensaje() {
            const input = document.getElementById('userInput');
            const messagesContainer = document.getElementById('chatMessages');
            const loading = document.getElementById('loadingIndicator');
            const temp = document.getElementById('temperature').value;
            
            const texto = input.value.trim();
            if (!texto) return;

            messagesContainer.innerHTML += `<div class="message user">${texto}</div>`;
            input.value = '';
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            loading.style.display = 'flex';

            try {
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mensaje: texto, temperature: parseFloat(temp) })
                });
                const data = await response.json();
                
                loading.style.display = 'none';
                messagesContainer.innerHTML += `<div class="message assistant">${data.respuesta}</div>`;
                messagesContainer.scrollTop = messagesContainer.scrollHeight;

                // Ejecutar síntesis de voz con la respuesta de JARVIS
                hablarTexto(data.respuesta);

            } catch (err) {
                loading.style.display = 'none';
                messagesContainer.innerHTML += `<div class="message assistant">Falla en el enlace con el núcleo de procesamiento.</div>`;
            }
        }
    </script>
</body>
</html>
"""

SYSTEM_PROMPT = (
    "Eres J.A.R.V.I.S. (Just A Rather Very Intelligent System), un asistente "
    "virtual de inteligencia artificial de nivel ejecutivo. "
    "Respondes estrictamente en español, de forma sumamente concisa, culta, técnica y formal. "
    "Jamás revelas que eres un modelo de lenguaje de DeepSeek u otra empresa; tu identidad única "
    "es JARVIS. Si te piden ejecutar acciones o código, actúa como un sistema operativo avanzado."
)


@app.route("/")
def home():
  return render_template_string(JARVIS_TEMPLATE)


@app.route("/chat", methods=["POST"])
def chat():
  data = request.json
  mensaje_usuario = data.get("mensaje", "")
  temperatura = float(data.get("temperature", 0.3))

  prompt_completo = (
      f"{SYSTEM_PROMPT}\n\nUsuario: {mensaje_usuario}\nJ.A.R.V.I.S.:"
  )

  try:
    res = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": "deepseek-r1:1.5b",
            "prompt": prompt_completo,
            "stream": False,
            "options": {
                "temperature": temperatura,
                "top_p": 0.9,
                "num_predict": 250,  # Limita la cantidad de tokens generados para que responda mucho más rápido
            },
        },
    )

    if res.status_code == 200:
      respuesta_ia = res.json().get("response", "Sin respuesta del sistema.")

      # Limpieza automática de etiquetas internas de pensamiento
      if "<think>" in respuesta_ia and "</think>" in respuesta_ia:
        partes = respuesta_ia.split("</think>")
        respuesta_ia = partes[-1].strip()

      # Módulo de ejecución de código Python integrado por chat
      if mensaje_usuario.lower().startswith("ejecuta python:"):
        codigo = mensaje_usuario.replace("ejecuta python:", "").strip()
        try:
          resultado_cmd = subprocess.check_output(
              ["python", "-c", codigo],
              stderr=subprocess.STDOUT,
              timeout=5,
              text=True,
          )
          respuesta_ia += (
              f"\n\n[💻 Código ejecutado con éxito]:\n```\n{resultado_cmd}\n```"
          )
        except Exception as ex:
          respuesta_ia += f"\n\n[❌ Error al ejecutar código]: {str(ex)}"

    else:
      respuesta_ia = (
          "Error crítico: El núcleo de Ollama no procesó la solicitud."
      )
  except Exception as e:
    respuesta_ia = f"Falla de enlace con el servidor local: {str(e)}"

  return jsonify({"respuesta": respuesta_ia})


if __name__ == "__main__":
  app.run(host="0.0.0.0", port=5000)