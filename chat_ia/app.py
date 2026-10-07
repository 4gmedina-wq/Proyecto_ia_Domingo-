import subprocess
import requests
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

SYSTEM_PROMPT = (
    "Eres J.A.R.V.I.S., un sistema operativo inteligente de élite. "
    "Responde SIEMPRE de forma extremadamente concisa, directa y al grano en español."
)

# Memoria temporal de correcciones de usuario (Feedback real)
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

  # Si el usuario envió un feedback de corrección, lo guardamos en memoria para calibrar el tono
  if feedback_previo:
    HISTORIAL_FEEDBACK.append(feedback_previo)
    return jsonify({
        "respuesta": "Feedback registrado y guardado en los registros del núcleo."
    })

  # Optimización de velocidad para saludos o preguntas ultra simples (respuesta inmediata local)
  mensaje_lower = mensaje_usuario.lower()
  if mensaje_lower in ["hola", "buenas", "hi"]:
    return jsonify(
        {"respuesta": "Sistemas en línea y operativos. ¿Qué orden ejecutamos?"}
    )
  if mensaje_lower in ["como estas?", "cómo estás?", "todo bien?"]:
    return jsonify({"respuesta": "Funcionando al 100% de capacidad, señor."})

  # Construcción del prompt integrando correcciones previas si las hay
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
            "model": "deepseek-r1:1.5b",
            "prompt": prompt_completo,
            "stream": False,
            "options": {
                "temperature": temperatura,
                "top_p": 0.8,
                "num_predict": 45,  # Forzar corte rápido de tokens para que no demore
            },
        },
    )

    if res.status_code == 200:
      respuesta_ia = res.json().get("response", "Sin respuesta.")

      # Limpieza de etiquetas de pensamiento
      if "<think>" in respuesta_ia and "</think>" in respuesta_ia:
        partes = respuesta_ia.split("</think>")
        respuesta_ia = partes[-1].strip()

      if mensaje_usuario.lower().startswith("ejecuta python:"):
        codigo = mensaje_usuario.replace("ejecuta python:", "").strip()
        try:
          resultado_cmd = subprocess.check_output(
              ["python", "-c", codigo],
              stderr=subprocess.STDOUT,
              timeout=3,
              text=True,
          )
          respuesta_ia = f"Ejecutado:\n{resultado_cmd}"
        except Exception as ex:
          respuesta_ia = f"Error: {str(ex)}"
    else:
      respuesta_ia = "Error en el núcleo Ollama."
  except Exception as e:
    respuesta_ia = f"Falla de red: {str(e)}"

  return jsonify({"respuesta": respuesta_ia})


if __name__ == "__main__":
  app.run(host="0.0.0.0", port=5000)