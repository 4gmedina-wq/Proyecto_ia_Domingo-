let vozActiva = true;
let recognition = null;
let escuchando = false;

// Inicialización de Reconocimiento de Voz nativo del navegador
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.onresult = (e) => { 
        document.getElementById('userInput').value = e.results[0][0].transcript; 
        enviarMensaje(); 
    };
    recognition.onend = () => { 
        escuchando = false; 
        document.getElementById('micBtn').classList.remove('listening'); 
    };
}

function toggleMicrofono() {
    if (!recognition) return alert("Su navegador no soporta reconocimiento de voz.");
    if (escuchando) recognition.stop();
    else { 
        recognition.start(); 
        escuchando = true; 
        document.getElementById('micBtn').classList.add('listening'); 
    }
}

function toggleVoz() {
    vozActiva = !vozActiva;
    const btn = document.getElementById('voiceToggle');
    btn.textContent = vozActiva ? "Voz: Activada" : "Voz: Desactivada";
    btn.classList.toggle('active', vozActiva);
    if (!vozActiva) window.speechSynthesis.cancel();
}

function hablarTexto(texto) {
    if (!vozActiva || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    let limpio = texto.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(limpio);
    utterance.lang = 'es-ES';
    window.speechSynthesis.speak(utterance);
}

function handleKey(e) { 
    if (e.key === 'Enter' && !e.shiftKey) { 
        e.preventDefault(); 
        enviarMensaje(); 
    } 
}

// Función principal para enviar mensajes con medición de tiempo y sistema de feedback
async function enviarMensaje() {
    const input = document.getElementById('userInput');
    const container = document.getElementById('chatMessages');
    const loading = document.getElementById('loadingIndicator');
    const temp = document.getElementById('temperature').value;
    
    const texto = input.value.trim();
    if (!texto) return;

    // Mostrar mensaje del usuario
    container.innerHTML += `<div class="message user">${texto}</div>`;
    input.value = ''; 
    container.scrollTop = container.scrollHeight; 
    loading.style.display = 'flex';

    // Iniciar cronómetro de tiempo de respuesta
    const tiempoInicio = performance.now();

    try {
        const res = await fetch('/chat', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ mensaje: texto, temperature: parseFloat(temp) }) 
        });
        const data = await res.json();
        
        // Calcular tiempo transcurrido en segundos
        const tiempoFin = performance.now();
        const duracionSegundos = ((tiempoFin - tiempoInicio) / 1000).toFixed(2);

        loading.style.display = 'none';

        // Generar identificador único para el feedback de esta respuesta
        const idFeedback = 'fb-' + Date.now();

        // Renderizar mensaje del asistente con cronómetro y botones de feedback (👍 / 👎)
        const htmlRespuesta = `
            <div class="message assistant" id="${idFeedback}">
                ${data.respuesta}
                <div class="meta-info">
                    <span>⏱️ Respuesta en ${duracionSegundos}s</span>
                    <div class="feedback-container">
                        <button onclick="calificar('${idFeedback}', 'buena')" title="Buena respuesta">👍</button>
                        <button onclick="calificar('${idFeedback}', 'mala')" title="Mala respuesta">👎</button>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML += htmlRespuesta;
        container.scrollTop = container.scrollHeight;

        // Ejecutar síntesis de voz
        hablarTexto(data.respuesta);

    } catch (err) {
        loading.style.display = 'none';
        container.innerHTML += `<div class="message assistant">Error de enlace con el servidor.</div>`;
    }
}

// Función de retroalimentación (Feedback visual al hacer clic en 👍 o 👎)
function calificar(idElemento, tipo) {
    const elemento = document.getElementById(idElemento);
    if (!elemento) return;
    const feedbackBox = elemento.querySelector('.feedback-container');
    if (tipo === 'buena') {
        feedbackBox.innerHTML = '<span style="color: var(--success); font-size: 0.8rem;">✓ Registrado como útil</span>';
    } else {
        feedbackBox.innerHTML = '<span style="color: var(--danger); font-size: 0.8rem;">✕ Registrado como error</span>';
    }
}