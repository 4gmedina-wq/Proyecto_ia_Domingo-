let vozActiva = true;
let recognition = null;
let escuchando = false;
let vocesDisponibles = [];

function cargarVoces() {
    if (!('speechSynthesis' in window)) return;
    vocesDisponibles = window.speechSynthesis.getVoices();
    const select = document.getElementById('voiceSelect');
    if (!select) return;
    select.innerHTML = '';
    vocesDisponibles.forEach((voz, index) => {
        if (voz.lang.includes('es')) {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${voz.name} (${voz.lang})`;
            if (voz.name.toLowerCase().includes('female') || voz.name.toLowerCase().includes('helena') || voz.name.toLowerCase().includes('laura') || voz.name.toLowerCase().includes('zira')) {
                option.selected = true;
            }
            select.appendChild(option);
        }
    });
}

if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = cargarVoces;
    setTimeout(cargarVoces, 500);
}

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.onresult = (e) => { 
        document.getElementById('userInput').value = e.results[0][0].transcript; 
        enviarMensaje(); 
    };
    recognition.onend = () => { escuchando = false; document.getElementById('micBtn').classList.remove('listening'); };
}

function toggleMicrofono() {
    if (!recognition) return alert("Navegador sin soporte de voz.");
    if (escuchando) recognition.stop();
    else { recognition.start(); escuchando = true; document.getElementById('micBtn').classList.add('listening'); }
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
    if (!limpio) return;
    const utterance = new SpeechSynthesisUtterance(limpio);
    utterance.lang = 'es-ES';
    const select = document.getElementById('voiceSelect');
    if (select && select.value !== "" && vocesDisponibles[select.value]) {
        utterance.voice = vocesDisponibles[select.value];
    }
    window.speechSynthesis.speak(utterance);
}

function handleKey(e) { 
    if (e.key === 'Enter' && !e.shiftKey) { 
        e.preventDefault(); 
        enviarMensaje(); 
    } 
}

async function enviarMensaje() {
    const input = document.getElementById('userInput');
    const container = document.getElementById('chatMessages');
    const loading = document.getElementById('loadingIndicator');
    const temp = document.getElementById('temperature').value;
    
    const texto = input.value.trim();
    if (!texto) return;

    container.innerHTML += `<div class="message user">${texto}</div>`;
    input.value = ''; 
    container.scrollTop = container.scrollHeight; 
    loading.style.display = 'flex';

    const tiempoInicio = performance.now();

    try {
        const res = await fetch('/chat', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ mensaje: texto, temperature: parseFloat(temp) }) 
        });
        const data = await res.json();
        
        const tiempoFin = performance.now();
        const duracionSegundos = ((tiempoFin - tiempoInicio) / 1000).toFixed(2);

        loading.style.display = 'none';

        const idFeedback = 'fb-' + Date.now();
        const textoRespuesta = data.respuesta || "Sin respuesta.";

        // Renderizado con sistema de feedback real (apertura de caja de texto para corregir a la IA)
        const htmlRespuesta = `
            <div class="message assistant" id="${idFeedback}">
                ${textoRespuesta}
                <div class="meta-info">
                    <span>⏱️ ${duracionSegundos}s</span>
                    <div class="feedback-actions">
                        <button onclick="marcarBuena('${idFeedback}')">👍 Útil</button>
                        <button onclick="mostrarCajaFeedback('${idFeedback}')">👎 Corregir</button>
                    </div>
                </div>
                <div class="feedback-input-box" id="box-${idFeedback}">
                    <input type="text" id="input-${idFeedback}" placeholder="Escribe qué falló para corregirlo...">
                    <button onclick="enviarFeedbackReal('${idFeedback}', '${textoRespuesta.replace(/'/g, "\\'")}')">Enviar</button>
                </div>
            </div>
        `;

        container.innerHTML += htmlRespuesta;
        container.scrollTop = container.scrollHeight;
        hablarTexto(textoRespuesta);

    } catch (err) {
        loading.style.display = 'none';
        container.innerHTML += `<div class="message assistant">Falla de enlace.</div>`;
    }
}

function marcarBuena(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.querySelector('.feedback-actions').innerHTML = '<span style="color: var(--success); font-size: 0.8rem;">✓ Registrado como óptimo</span>';
}

function mostrarCajaFeedback(id) {
    const caja = document.getElementById('box-' + id);
    if (caja) {
        caja.style.display = caja.style.display === 'flex' ? 'none' : 'flex';
    }
}

// Envío real de corrección al servidor para retroalimentar el comportamiento de la IA
async function enviarFeedbackReal(id, respuestaOriginal) {
    const inputCorr = document.getElementById('input-' + id);
    const correccion = inputCorr.value.trim();
    if (!correccion) return alert("Escribe una corrección válida.");

    try {
        await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensaje: "feedback_correccion", feedback: `Evita esto: "${respuestaOriginal}" -> Corrección: ${correccion}` })
        });
        const el = document.getElementById(id);
        el.querySelector('.feedback-actions').innerHTML = '<span style="color: var(--success); font-size: 0.8rem;">✓ Corrección guardada en memoria</span>';
        document.getElementById('box-' + id).style.display = 'none';
    } catch(e) {
        alert("No se pudo enviar la corrección.");
    }
}