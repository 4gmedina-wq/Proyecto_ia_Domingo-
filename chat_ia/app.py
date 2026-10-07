import subprocess
import requests
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# System Prompt estricto: Obliga al modelo a responder de forma directa y sin rodeos
SYSTEM_PROMPT = (
    "Eres J.A.R.V.I.S., un sistema operativo inteligente. "
    "Responde SIEMPRE de forma extremadamente concisa, directa y al grano en español. "
    "No generes explicaciones largas ni contexto innecesario."
)


@app.route("/")
def home():
  # Renderiza la plantilla principal buscando index.html en la misma carpeta
  return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
  data = request.json
  mensaje_usuario = data.get("mensaje", "")
  temperatura = float(data.get("temperature", 0.2))

  prompt_completo = (
      f"{SYSTEM_PROMPT}\n\nUsuario: {mensaje_usuario}\nJ.A.R.V.I.S.:"
  )

  try:
    # Solicitud al núcleo local de Ollama
    res = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": "deepseek-r1:1.5b",
            "prompt": prompt_completo,
            "stream": False,
            "options": {
                "temperature": temperatura,
                "top_p": 0.8,
                "num_predict": 40,  # Límite bajo de tokens para forzar velocidad máxima de respuesta
            },
        },
    )

    if res.status_code == 200:
      respuesta_ia = res.json().get("response", "Sin respuesta.")

      # Limpieza estricta de las etiquetas de razonamiento interno de DeepSeek
      if "<think>" in respuesta_ia and "</think>" in respuesta_ia:
        partes = respuesta_ia.split("</think>")
        respuesta_ia = partes[-1].strip()

      # Módulo opcional de ejecución rápida de comandos de Python por chat
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
          respuesta_ia = f"Error de ejecución: {str(ex)}"
    else:
      respuesta_ia = "Error en el núcleo de procesamiento."
  except Exception as e:
    respuesta_ia = f"Falla crítica de enlace: {str(e)}"

  return jsonify({"respuesta": respuesta_ia})


if __name__ == "__main__":
  app.run(host="0.0.0.0", port=5000)