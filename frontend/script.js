// API Configuration
const API_URL = '/api';

// Generate session ID
function getSessionId() {
    let sessionId = localStorage.getItem('chatSessionId');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('chatSessionId', sessionId);
    }
    return sessionId;
}

let sessionId = getSessionId();
let isWaitingResponse = false;

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const buttonsContainer = document.getElementById('buttonsContainer');
const inputContainer = document.getElementById('inputContainer');
const nameInput = document.getElementById('nameInput');
const sendNameButton = document.getElementById('sendNameButton');

// Add message to chat
function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="message-bubble">${formatMessage(text)}</div>
            <span class="message-time">${timeStr}</span>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Format message with line breaks and bold
function formatMessage(text) {
    return text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

// Show typing indicator
function showTypingIndicator() {
    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'message bot-message';
    indicatorDiv.id = 'typingIndicator';
    indicatorDiv.innerHTML = `
        <div class="message-content">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(indicatorDiv);
    scrollToBottom();
}

// Remove typing indicator
function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

// Scroll to bottom
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show buttons
function showButtons(buttons) {
    buttonsContainer.innerHTML = '';
    
    if (!buttons || buttons.length === 0) {
        buttonsContainer.style.display = 'none';
        return;
    }
    
    buttons.forEach(button => {
        const btn = document.createElement('button');
        btn.className = 'chat-button';
        btn.textContent = button.text;
        btn.onclick = () => sendAction(button.value);
        buttonsContainer.appendChild(btn);
    });
    
    buttonsContainer.style.display = 'flex';
}

// Hide buttons
function hideButtons() {
    buttonsContainer.style.display = 'none';
}

// Show/hide input for name
function showNameInput(show) {
    if (show) {
        inputContainer.style.display = 'block';
        nameInput.focus();
        hideButtons();
    } else {
        inputContainer.style.display = 'none';
    }
}

// Send action to backend
async function sendAction(action) {
    if (isWaitingResponse) return;
    
    // Add user message (for button clicks, show what they selected)
    const button = Array.from(document.querySelectorAll('.chat-button')).find(btn => 
        btn.textContent.includes(action) || btn.onclick.toString().includes(action)
    );
    if (button) {
        addMessage(button.textContent, true);
    }
    
    hideButtons();
    isWaitingResponse = true;
    showTypingIndicator();
    
    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: action,
                value: action,
                sessionId: sessionId
            })
        });
        
        const data = await response.json();
        
        removeTypingIndicator();
        
        if (data.success) {
            addMessage(data.message);
            
            if (data.buttons && data.buttons.length > 0) {
                showButtons(data.buttons);
            } else {
                showButtons([]);
            }
        } else {
            addMessage('Desculpe, ocorreu um erro. Por favor, tente novamente.');
        }
    } catch (error) {
        console.error('Error:', error);
        removeTypingIndicator();
        addMessage('Desculpe, não consegui me conectar ao servidor.');
    } finally {
        isWaitingResponse = false;
    }
}

// Send name to backend
async function sendName() {
    const name = nameInput.value.trim();
    
    if (!name || name.length < 2) {
        alert('Por favor, digite seu nome completo');
        return;
    }
    
    // Add user message
    addMessage(name, true);
    
    // Clear input
    nameInput.value = '';
    showNameInput(false);
    
    isWaitingResponse = true;
    showTypingIndicator();
    
    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'nome_submit',
                value: name,
                sessionId: sessionId
            })
        });
        
        const data = await response.json();
        
        removeTypingIndicator();
        
        if (data.success) {
            addMessage(data.message);
            
            if (data.buttons && data.buttons.length > 0) {
                showButtons(data.buttons);
            } else {
                showButtons([]);
            }
        } else {
            addMessage('Desculpe, ocorreu um erro.');
        }
    } catch (error) {
        console.error('Error:', error);
        removeTypingIndicator();
        addMessage('Erro de conexão. Tente novamente.');
    } finally {
        isWaitingResponse = false;
    }
}

// Handle enter key on name input
nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendName();
    }
});

sendNameButton.addEventListener('click', sendName);

// Initialize chat
async function initChat() {
    // Check if we need to show start button
    const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: null,
            value: null,
            sessionId: sessionId
        })
    });
    
    const data = await response.json();
    
    if (data.success && data.buttons && data.buttons.length > 0) {
        showButtons(data.buttons);
    }
}

// Start the chat
initChat();

// Listen for when we need to show name input (detected by bot message)
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
            const lastMessage = chatMessages.lastElementChild;
            if (lastMessage && lastMessage.textContent.includes('digite seu nome')) {
                showNameInput(true);
            }
        }
    });
});

observer.observe(chatMessages, { childList: true });

console.log('🦷 Chatbot odontológico carregado!');
console.log('💡 Todas as interações são por botões!');
