from datetime import datetime
import subprocess
import requests
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Obtener la fecha y hora exacta del sistema de forma dinámica
fecha_actual = datetime.now().strftime("%A, %d de %B de %Y")
hora_actual = datetime.now().strftime("%H:%M")

SYSTEM_PROMPT = (
    f"Eres Qwen, un sistema operativo inteligente de élite. "
    f"La fecha actual es {fecha_actual} y la hora es {hora_actual}. "
    "Respondes siempre de forma concisa, educada, culta y directa al grano en español. "
   
)

# Memoria temporal para guardar el feedback real de correcciones
HISTORIAL_FEEDBACK = []


@app.route("/")
def home():
  return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
  data = request.json
  mensaje_usuario = data.get("mensaje", "").strip()
  temperatura = float(data.get("temperature", 0.2))
  feedback_previo = data.get("feedback", None)

  # Registrar correcciones de usuario en memoria
  if feedback_previo:
    HISTORIAL_FEEDBACK.append(feedback_previo)
    return jsonify({
        "respuesta": "Feedback registrado y guardado en los registros del núcleo."
    })

  # Respuestas instantáneas locales para saludos o preguntas ultra simples
  mensaje_lower = mensaje_usuario.lower()
  if mensaje_lower in ["hola", "buenas", "hi"]:
    return jsonify(
        {"respuesta": "Sistemas operativos en línea. ¿Qué orden ejecutamos?"}
    )
  if mensaje_lower in ["como estas?", "cómo estás?", "todo bien?"]:
    return jsonify({"respuesta": "Funcionando al 100% de capacidad, señor."})

  # Construcción del prompt con memoria de correcciones previas
  contexto_feedback = ""
  if HISTORIAL_FEEDBACK:
    contexto_feedback = (
        f"\n[Correcciones previas a recordar]: {str(HISTORIAL_FEEDBACK[-3:])}"
    )

  prompt_completo = f"{SYSTEM_PROMPT}{contexto_feedback}\n\nUsuario: {mensaje_usuario}\nJ.A.R.V.I.S.:"

  try:
    res = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": "qwen2.5:1.5b",  # Modelo rápido y fluido optimizado para móviles
            "prompt": prompt_completo,
            "stream": False,
            "options": {
                "temperature": temperatura,
                "top_p": 0.9,
                "num_predict": 120,  # Margen adecuado para que Qwen responda con fluidez
            },
        },
    )

    if res.status_code == 200:
      respuesta_ia = res.json().get("response", "Sin respuesta.")

      # Limpieza preventiva por si el modelo genera etiquetas internas
      if "<think>" in respuesta_ia and "</think>" in respuesta_ia:
        partes = respuesta_ia.split("</think>")
        respuesta_ia = partes[-1].strip()

      # Módulo para ejecutar comandos de Python mediante chat si se solicita
      if mensaje_usuario.lower().startswith("ejecuta python:"):
        codigo = mensaje_usuario.replace("ejecuta python:", "").strip()
        try:
          resultado_cmd = subprocess.check_output(
              ["python", "-c", codigo],
              stderr=subprocess.STDOUT,
              timeout=3,
              text=True,
          )
          respuesta_ia = f"Ejecutado con éxito:\n{resultado_cmd}"
        except Exception as ex:
          respuesta_ia = f"Error al ejecutar código: {str(ex)}"
    else:
      respuesta_ia = "Error crítico en el núcleo de Ollama."
  except Exception as e:
    respuesta_ia = f"Falla de enlace con el servidor: {str(e)}"

  return jsonify({"respuesta": respuesta_ia})


if __name__ == "__main__":
  app.run(host="0.0.0.0", port=5000)