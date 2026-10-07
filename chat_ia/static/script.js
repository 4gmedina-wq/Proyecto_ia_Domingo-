// ============================================
// J.A.R.V.I.S. - Sistema de Control Avanzado
// ============================================

// Configuración global
const CONFIG = {
    API_URL: 'http://localhost:5000',
    DEFAULT_TEMPERATURE: 0.7,
    MAX_HISTORY: 50,
    VOICE_LANG: 'es-ES'
};

// Estado de la aplicación
let state = {
    isListening: false,
    isSpeaking: false,
    recognition: null,
    synthesis: window.speechSynthesis,
    voices: [],
    currentMessage: null,
    temperature: CONFIG.DEFAULT_TEMPERATURE,
    autoSpeak: true,
    continuousListening: false
};

// Elementos del DOM
const elements = {
    chatMessages: document.getElementById('chatMessages'),
    userInput: document.getElementById('userInput'),
    sendBtn: document.getElementById('sendBtn'),
    voiceToggleBtn: document.getElementById('voiceToggleBtn'),
    voiceInputBtn: document.getElementById('voiceInputBtn'),
    typingIndicator: document.getElementById('typingIndicator'),
    voiceVisualizer: document.getElementById('voiceVisualizer'),
    voiceStatus: document.getElementById('voiceStatus'),
    temperatureSlider: document.getElementById('temperatureSlider'),
    temperatureValue: document.getElementById('temperatureValue'),
    voiceSelect: document.getElementById('voiceSelect'),
    languageSelect: document.getElementById('languageSelect'),
    autoSpeakCheckbox: document.getElementById('autoSpeak'),
    continuousCheckbox: document.getElementById('continuousListening'),
    toastContainer: document.getElementById('toastContainer'),
    arcReactor: document.getElementById('arcReactor')
};

// ============================================
// Inicialización
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeSystem();
    loadVoices();
    setupEventListeners();
    updateWelcomeTime();
    checkSystemHealth();
    
    // Verificar salud del sistema cada 30 segundos
    setInterval(checkSystemHealth, 30000);
});

function initializeSystem() {
    // Inicializar reconocimiento de voz
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        state.recognition = new SpeechRecognition();
        state.recognition.continuous = false;
        state.recognition.interimResults = true;
        state.recognition.lang = CONFIG.VOICE_LANG;
        
        setupSpeechRecognition();
    } else {
        showToast('Reconocimiento de voz no soportado en este navegador', 'error');
    }
    
    // Cargar historial si existe
    loadChatHistory();
}

function setupEventListeners() {
    // Slider de temperatura
    elements.temperatureSlider.addEventListener('input', (e) => {
        state.temperature = parseFloat(e.target.value);
        elements.temperatureValue.textContent = state.temperature.toFixed(1);
    });
    
    // Checkbox de auto-speak
    elements.autoSpeakCheckbox.addEventListener('change', (e) => {
        state.autoSpeak = e.target.checked;
    });
    
    // Checkbox de escucha continua
    elements.continuousCheckbox.addEventListener('change', (e) => {
        state.continuousListening = e.target.checked;
        if (state.recognition) {
            state.recognition.continuous = e.target.checked;
        }
    });
    
    // Selector de idioma
    elements.languageSelect.addEventListener('change', (e) => {
        CONFIG.VOICE_LANG = e.target.value;
        if (state.recognition) {
            state.recognition.lang = CONFIG.VOICE_LANG;
        }
    });
    
    // Cargar voces disponibles
    if (state.synthesis) {
        state.synthesis.onvoiceschanged = loadVoices;
    }
}

// ============================================
// Sistema de Voz - Reconocimiento (STT)
// ============================================

function setupSpeechRecognition() {
    const recognition = state.recognition;
    
    recognition.onstart = () => {
        state.isListening = true;
        updateVoiceUI(true);
        animateArcReactor('listening');
    };
    
    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        if (finalTranscript) {
            elements.userInput.value = finalTranscript;
            if (!state.continuousListening) {
                setTimeout(() => sendMessage(), 500);
            }
        }
    };
    
    recognition.onerror = (event) => {
        console.error('Error en reconocimiento de voz:', event.error);
        
        if (event.error === 'no-speech') {
            showToast('No se detectó voz. Inténtalo de nuevo.', 'info');
        } else if (event.error === 'audio-capture') {
            showToast('No se encontró micrófono. Verifica los permisos.', 'error');
        } else if (event.error === 'not-allowed') {
            showToast('Permiso de micrófono denegado.', 'error');
        }
        
        stopListening();
    };
    
    recognition.onend = () => {
        if (state.continuousListening && state.isListening) {
            // Reiniciar si es escucha continua
            setTimeout(() => {
                if (state.isListening) {
                    recognition.start();
                }
            }, 100);
        } else {
            stopListening();
        }
    };
}

function toggleVoiceRecognition() {
    if (!state.recognition) {
        showToast('Reconocimiento de voz no disponible', 'error');
        return;
    }
    
    if (state.isListening) {
        stopListening();
    } else {
        startListening();
    }
}

function startVoiceInput() {
    toggleVoiceRecognition();
}

function startListening() {
    try {
        state.recognition.lang = elements.languageSelect.value;
        state.recognition.start();
        showToast('Escuchando...', 'info');
    } catch (error) {
        console.error('Error al iniciar reconocimiento:', error);
        showToast('Error al activar el micrófono', 'error');
    }
}

function stopListening() {
    if (state.recognition) {
        state.recognition.stop();
    }
    state.isListening = false;
    updateVoiceUI(false);
    animateArcReactor('idle');
}

function updateVoiceUI(isActive) {
    if (isActive) {
        elements.voiceToggleBtn.classList.add('listening');
        elements.voiceInputBtn.classList.add('recording');
        elements.voiceStatus.classList.add('active');
        elements.voiceStatus.querySelector('.voice-text').textContent = 'Escuchando...';
        elements.voiceVisualizer.classList.add('active');
    } else {
        elements.voiceToggleBtn.classList.remove('listening');
        elements.voiceInputBtn.classList.remove('recording');
        elements.voiceStatus.classList.remove('active');
        elements.voiceStatus.querySelector('.voice-text').textContent = 'Micrófono inactivo';
        elements.voiceVisualizer.classList.remove('active');
    }
}

// ============================================
// Sistema de Voz - Síntesis (TTS)
// ============================================

function loadVoices() {
    if (!state.synthesis) return;
    
    state.voices = state.synthesis.getVoices();
    
    // Filtrar voces en español
    const spanishVoices = state.voices.filter(voice => 
        voice.lang.startsWith('es')
    );
    
    // Si no hay voces en español, usar todas
    const voicesToUse = spanishVoices.length > 0 ? spanishVoices : state.voices;
    
    elements.voiceSelect.innerHTML = '';
    
    voicesToUse.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${voice.name} (${voice.lang})`;
        
        // Marcar voz por defecto si es Microsoft Laura o similar
        if (voice.name.includes('Laura') || voice.name.includes('Helena')) {
            option.selected = true;
        }
        
        elements.voiceSelect.appendChild(option);
    });
    
    if (elements.voiceSelect.options.length === 0) {
        const option = document.createElement('option');
        option.textContent = 'Voz del sistema';
        elements.voiceSelect.appendChild(option);
    }
}

function speakText(text, element = null) {
    if (!state.synthesis) {
        showToast('Síntesis de voz no disponible', 'error');
        return;
    }
    
    // Cancelar cualquier reproducción anterior
    state.synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configurar voz
    const selectedVoiceIndex = elements.voiceSelect.value;
    if (selectedVoiceIndex && state.voices[selectedVoiceIndex]) {
        utterance.voice = state.voices[selectedVoiceIndex];
    }
    
    // Configurar parámetros
    utterance.lang = CONFIG.VOICE_LANG;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Eventos
    utterance.onstart = () => {
        state.isSpeaking = true;
        animateArcReactor('speaking');
        if (element) {
            element.classList.add('speaking');
        }
    };
    
    utterance.onend = () => {
        state.isSpeaking = false;
        animateArcReactor('idle');
        if (element) {
            element.classList.remove('speaking');
        }
    };
    
    utterance.onerror = (event) => {
        console.error('Error en síntesis de voz:', event);
        state.isSpeaking = false;
        animateArcReactor('idle');
    };
    
    state.synthesis.speak(utterance);
}

// ============================================
// Sistema de Chat
// ============================================

async function sendMessage() {
    const message = elements.userInput.value.trim();
    
    if (!message) {
        showToast('Escribe un mensaje primero', 'info');
        return;
    }
    
    // Agregar mensaje del usuario
    addMessage(message, 'user');
    elements.userInput.value = '';
    
    // Mostrar indicador de escritura
    showTypingIndicator();
    
    // Medir tiempo de respuesta
    const startTime = performance.now();
    
    try {
        const response = await fetch(`${CONFIG.API_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                temperature: state.temperature
            })
        });
        
        const data = await response.json();
        
        // Calcular latencia
        const latency = Math.round(performance.now() - startTime);
        updateLatency(latency);
        
        // Ocultar indicador
        hideTypingIndicator();
        
        // Agregar respuesta
        if (data.response) {
            addMessage(data.response, 'assistant', data.timestamp);
            
            // Leer en voz alta si está activado
            if (state.autoSpeak) {
                speakText(data.response);
            }
        } else {
            throw new Error('Respuesta vacía');
        }
        
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        hideTypingIndicator();
        addMessage('Lo siento, ocurrió un error al procesar tu solicitud. Verifica la conexión con el servidor.', 'assistant');
        showToast('Error de conexión', 'error');
    }
}

function addMessage(text, sender, timestamp = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const time = timestamp ? formatTime(timestamp) : formatTime(new Date());
    const avatar = sender === 'user' ? '👤' : '🤖';
    const senderName = sender === 'user' ? 'Tú' : 'J.A.R.V.I.S.';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <div class="avatar-icon">${avatar}</div>
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="sender-name">${senderName}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-text">${escapeHtml(text)}</div>
            ${sender === 'assistant' ? `
                <div class="message-actions">
                    <button class="action-btn" onclick="speakText('${escapeHtml(text)}', this)" title="Escuchar">
                        🔊
                    </button>
                    <button class="action-btn" onclick="copyMessage(this, '${escapeHtml(text)}')" title="Copiar">
                        📋
                    </button>
                    <button class="action-btn" onclick="showFeedbackModal('${escapeHtml(text)}')" title="Feedback">
                        👎
                    </button>
                </div>
            ` : ''}
        </div>
    `;
    
    elements.chatMessages.appendChild(messageDiv);
    scrollToBottom();
    
    // Guardar en localStorage
    saveMessageToHistory(text, sender, time);
}

function showTypingIndicator() {
    elements.typingIndicator.style.display = 'flex';
    scrollToBottom();
    animateArcReactor('processing');
}

function hideTypingIndicator() {
    elements.typingIndicator.style.display = 'none';
    animateArcReactor('idle');
}

function scrollToBottom() {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// ============================================
// Utilidades y Helpers
// ============================================

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function copyMessage(element, text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Mensaje copiado al portapapeles', 'success');
        
        // Feedback visual
        const originalText = element.textContent;
        element.textContent = '✅';
        setTimeout(() => {
            element.textContent = originalText;
        }, 1500);
    }).catch(err => {
        console.error('Error al copiar:', err);
        showToast('Error al copiar', 'error');
    });
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/'/g, "\\'");
}

function updateLatency(ms) {
    const latencyElement = document.getElementById('latency');
    latencyElement.textContent = `${ms}ms`;
    
    // Color según latencia
    if (ms < 1000) {
        latencyElement.style.color = 'var(--success-color)';
    } else if (ms < 3000) {
        latencyElement.style.color = 'var(--warning-color)';
    } else {
        latencyElement.style.color = 'var(--accent-color)';
    }
}

function updateWelcomeTime() {
    const hour = new Date().getHours();
    let greeting = 'Buenas';
    
    if (hour < 12) greeting = 'Buenos días';
    else if (hour < 20) greeting = 'Buenas tardes';
    else greeting = 'Buenas noches';
    
    document.getElementById('welcomeTime').textContent = 
        new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

// ============================================
// Animaciones del Arc Reactor
// ============================================

function animateArcReactor(mode) {
    const reactor = elements.arcReactor;
    const core = reactor.querySelector('.reactor-core');
    
    // Remover clases anteriores
    reactor.classList.remove('listening', 'speaking', 'processing');
    
    // Agregar clase según modo
    if (mode !== 'idle') {
        reactor.classList.add(mode);
    }
    
    // Ajustar animación del core
    switch(mode) {
        case 'listening':
            core.style.animation = 'reactorPulse 1s ease-in-out infinite';
            core.style.boxShadow = '0 0 30px var(--accent-color), 0 0 60px var(--accent-color)';
            break;
        case 'speaking':
            core.style.animation = 'reactorPulse 0.5s ease-in-out infinite';
            core.style.boxShadow = '0 0 40px var(--success-color), 0 0 80px var(--success-color)';
            break;
        case 'processing':
            core.style.animation = 'reactorPulse 0.3s ease-in-out infinite';
            core.style.boxShadow = '0 0 50px var(--warning-color), 0 0 100px var(--warning-color)';
            break;
        default:
            core.style.animation = 'reactorPulse 2s ease-in-out infinite';
            core.style.boxShadow = '0 0 20px var(--primary-color), 0 0 40px var(--primary-color)';
    }
}

// ============================================
// Sistema de Feedback
// ============================================

let currentFeedbackMessage = '';

function showFeedbackModal(message) {
    currentFeedbackMessage = message;
    document.getElementById('feedbackModal').classList.add('active');
}

function closeFeedbackModal() {
    document.getElementById('feedbackModal').classList.remove('active');
    document.getElementById('correctionText').value = '';
}

async function submitFeedback(rating) {
    const correction = document.getElementById('correctionText').value;
    
    try {
        await fetch(`${CONFIG.API_URL}/api/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Mensaje anterior',
                response: currentFeedbackMessage,
                rating: rating,
                correction: correction
            })
        });
        
        showToast('¡Gracias por tu feedback!', 'success');
        closeFeedbackModal();
    } catch (error) {
        console.error('Error al enviar feedback:', error);
        showToast('Error al enviar feedback', 'error');
    }
}

// ============================================
// Configuración y Persistencia
// ============================================

function toggleSettings() {
    const content = document.getElementById('settingsContent');
    content.classList.toggle('active');
}

async function clearChat() {
    if (!confirm('¿Estás seguro de que deseas limpiar todo el historial?')) {
        return;
    }
    
    try {
        await fetch(`${CONFIG.API_URL}/api/clear-history`, {
            method: 'POST'
        });
        
        // Limpiar UI
        elements.chatMessages.innerHTML = '';
        localStorage.removeItem('jarvis_chat_history');
        
        // Agregar mensaje de bienvenida de nuevo
        addMessage('Buenas. Soy J.A.R.V.I.S., su asistente personal avanzado. Estoy listo para ayudarle.', 'assistant');
        
        showToast('Historial limpiado', 'success');
    } catch (error) {
        console.error('Error al limpiar historial:', error);
        showToast('Error al limpiar historial', 'error');
    }
}

function saveMessageToHistory(text, sender, time) {
    let history = JSON.parse(localStorage.getItem('jarvis_chat_history') || '[]');
    history.push({ text, sender, time });
    
    // Mantener solo últimos 50 mensajes
    if (history.length > 50) {
        history = history.slice(-50);
    }
    
    localStorage.setItem('jarvis_chat_history', JSON.stringify(history));
}

function loadChatHistory() {
    const history = JSON.parse(localStorage.getItem('jarvis_chat_history') || '[]');
    
    history.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.sender}-message`;
        
        const avatar = msg.sender === 'user' ? '👤' : '🤖';
        const senderName = msg.sender === 'user' ? 'Tú' : 'J.A.R.V.I.S.';
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <div class="avatar-icon">${avatar}</div>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="sender-name">${senderName}</span>
                    <span class="message-time">${msg.time}</span>
                </div>
                <div class="message-text">${escapeHtml(msg.text)}</div>
            </div>
        `;
        
        elements.chatMessages.appendChild(messageDiv);
    });
    
    scrollToBottom();
}

// ============================================
// Sistema de Notificaciones Toast
// ============================================

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    elements.toastContainer.appendChild(toast);
    
    // Auto-remover después de 3 segundos
    setTimeout(() => {
        toast.style.animation = 'toastSlideIn 0.3s ease-out reverse';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// ============================================
// Verificación de Salud del Sistema
// ============================================

async function checkSystemHealth() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/api/health`);
        const data = await response.json();
        
        const statusText = document.getElementById('systemStatusText');
        const statusIndicator = document.querySelector('.status-indicator');
        const connectionStatus = document.getElementById('connectionStatus');
        
        if (data.status === 'online' && data.ollama === 'connected') {
            statusText.textContent = 'Sistema en línea';
            statusIndicator.classList.remove('offline');
            statusIndicator.classList.add('online');
            connectionStatus.textContent = 'Conectado';
            connectionStatus.style.color = 'var(--success-color)';
        } else {
            statusText.textContent = 'Problemas de conexión';
            statusIndicator.classList.remove('online');
            statusIndicator.classList.add('offline');
            connectionStatus.textContent = 'Desconectado';
            connectionStatus.style.color = 'var(--accent-color)';
        }
        
    } catch (error) {
        console.error('Error en health check:', error);
        const statusText = document.getElementById('systemStatusText');
        const statusIndicator = document.querySelector('.status-indicator');
        const connectionStatus = document.getElementById('connectionStatus');
        
        statusText.textContent = 'Sin conexión';
        statusIndicator.classList.remove('online');
        statusIndicator.classList.add('offline');
        connectionStatus.textContent = 'Error';
        connectionStatus.style.color = 'var(--accent-color)';
    }
}

// ============================================
// Integración con ElevenLabs (Opcional)
// ============================================

// Función para usar ElevenLabs si tienes API Key
async function speakWithElevenLabs(text, voiceId = '21m00Tcm4TlvDq8ikWAM') {
    const ELEVENLABS_API_KEY = 'YOUR_API_KEY_HERE'; // Reemplaza con tu API key
    
    if (ELEVENLABS_API_KEY === 'YOUR_API_KEY_HERE') {
        console.warn('Configura tu API Key de ElevenLabs');
        speakText(text); // Fallback a Web Speech API
        return;
    }
    
    try {
        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': ELEVENLABS_API_KEY
                },
                body: JSON.stringify({
                    text: text,
                    model_id: 'eleven_monolingual_v1',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.5
                    }
                })
            }
        );
        
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onstart = () => {
            state.isSpeaking = true;
            animateArcReactor('speaking');
        };
        
        audio.onend = () => {
            state.isSpeaking = false;
            animateArcReactor('idle');
            URL.revokeObjectURL(audioUrl);
        };
        
        audio.play();
        
    } catch (error) {
        console.error('Error con ElevenLabs:', error);
        showToast('Error en ElevenLabs, usando voz del sistema', 'warning');
        speakText(text);
    }
}

// Exportar funciones para uso global
window.toggleVoiceRecognition = toggleVoiceRecognition;
window.startVoiceInput = startVoiceInput;
window.sendMessage = sendMessage;
window.speakText = speakText;
window.copyMessage = copyMessage;
window.showFeedbackModal = showFeedbackModal;
window.closeFeedbackModal = closeFeedbackModal;
window.submitFeedback = submitFeedback;
window.clearChat = clearChat;
window.toggleSettings = toggleSettings;
window.handleKeyPress = handleKeyPress;