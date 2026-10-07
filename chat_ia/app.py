from flask import Flask, render_template, request, jsonify, Response
from flask_cors import CORS
import requests
import json
import os
from datetime import datetime
import threading

app = Flask(__name__)
CORS(app)

# Configuración
OLLAMA_API = "http://localhost:11434/api/generate"
MODEL = "qwen2.5:1.5b"

# Almacenamiento de correcciones y feedback
feedback_db = []
chat_history = []

def generate_ollama_response(prompt, temperature=0.7):
    """Genera respuesta usando Ollama local"""
    try:
        payload = {
            "model": MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "top_p": 0.9,
                "top_k": 40
            }
        }
        
        response = requests.post(OLLAMA_API, json=payload, timeout=120)
        response.raise_for_status()
        
        return response.json().get('response', 'Lo siento, no pude procesar tu solicitud.')
    
    except requests.exceptions.Timeout:
        return "La solicitud tardó demasiado. Por favor, intenta de nuevo."
    except requests.exceptions.ConnectionError:
        return "Error de conexión con Ollama. Verifica que esté ejecutándose."
    except Exception as e:
        return f"Error: {str(e)}"

@app.route('/')
def index():
    """Sirve la interfaz principal"""
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    """Endpoint principal de chat"""
    data = request.json
    user_message = data.get('message', '')
    temperature = float(data.get('temperature', 0.7))
    
    if not user_message.strip():
        return jsonify({'error': 'Mensaje vacío'}), 400
    
    # Construir contexto con historial reciente
    context = f"""Eres J.A.R.V.I.S., un asistente de inteligencia artificial avanzado, 
    eficiente y profesional. Responde de manera clara, concisa y en español.
    
    Usuario: {user_message}
    J.A.R.V.I.S.:"""
    
    # Generar respuesta
    response_text = generate_ollama_response(context, temperature)
    
    # Guardar en historial
    chat_entry = {
        'timestamp': datetime.now().isoformat(),
        'user': user_message,
        'assistant': response_text
    }
    chat_history.append(chat_entry)
    
    # Mantener solo últimos 50 mensajes
    if len(chat_history) > 50:
        chat_history.pop(0)
    
    return jsonify({
        'response': response_text,
        'timestamp': chat_entry['timestamp'],
        'model': MODEL
    })

@app.route('/api/feedback', methods=['POST'])
def feedback():
    """Sistema de feedback y correcciones"""
    data = request.json
    feedback_entry = {
        'timestamp': datetime.now().isoformat(),
        'message': data.get('message', ''),
        'response': data.get('response', ''),
        'rating': data.get('rating', 'neutral'),  # 'positive', 'negative', 'neutral'
        'correction': data.get('correction', '')
    }
    
    feedback_db.append(feedback_entry)
    
    # Guardar en archivo para persistencia
    try:
        with open('feedback_log.json', 'a', encoding='utf-8') as f:
            f.write(json.dumps(feedback_entry, ensure_ascii=False) + '\n')
    except Exception as e:
        print(f"Error guardando feedback: {e}")
    
    return jsonify({'status': 'success', 'message': 'Feedback registrado'})

@app.route('/api/history', methods=['GET'])
def get_history():
    """Obtener historial de chat"""
    return jsonify({
        'history': chat_history[-20:],  # Últimos 20 mensajes
        'total': len(chat_history)
    })

@app.route('/api/clear-history', methods=['POST'])
def clear_history():
    """Limpiar historial"""
    chat_history.clear()
    return jsonify({'status': 'success', 'message': 'Historial limpiado'})

@app.route('/api/health', methods=['GET'])
def health_check():
    """Verificar estado del sistema"""
    try:
        # Verificar Ollama
        ollama_status = requests.get("http://localhost:11434/api/tags", timeout=5)
        ollama_ok = ollama_status.status_code == 200
    except:
        ollama_ok = False
    
    return jsonify({
        'status': 'online',
        'ollama': 'connected' if ollama_ok else 'disconnected',
        'model': MODEL,
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    print("🚀 Iniciando J.A.R.V.I.S. Server...")
    print(f"📡 Modelo: {MODEL}")
    print(" Servidor accesible en: http://0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)