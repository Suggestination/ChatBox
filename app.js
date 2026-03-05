const BROKER = "broker.hivemq.com";
const PORT = 8884; 
const TOPIC = "chatbox/v10/global"; 

// Identity Management
let username = localStorage.getItem('cb_user') || prompt("Chat Name:") || "User" + Math.floor(Math.random()*100);
localStorage.setItem('cb_user', username);

// Initialize Client
const client = new Paho.MQTT.Client(BROKER, PORT, "cb_v10_" + Math.random().toString(16).slice(2, 10));

// --- CONNECTION WRAPPER ---
function startMQTT() {
    console.log("Attempting to connect...");
    updateStatus("Connecting...", "#94a3b8");
    
    // Valid properties only for older Paho versions
    const options = {
        useSSL: true, 
        timeout: 5,
        keepAliveInterval: 30,
        cleanSession: true,
        onSuccess: () => {
            updateStatus("Online", "#4ade80");
            client.subscribe(TOPIC);
            console.log("Connected Successfully");
        },
        onFailure: (err) => {
            updateStatus("Retry in 3s...", "#f87171");
            console.error("Connect Failed:", err);
            // Manual retry loop
            setTimeout(startMQTT, 3000);
        }
    };
    
    client.connect(options);
}

// --- HANDLERS ---
client.onConnectionLost = (res) => {
    updateStatus("Offline - Reconnecting", "#f87171");
    if (res.errorCode !== 0) {
        console.log("Connection Lost: " + res.errorMessage);
    }
    // Manual retry loop
    setTimeout(startMQTT, 3000);
};

client.onMessageArrived = (message) => {
    try {
        const data = JSON.parse(message.payloadString);
        renderMessage(data, true);
    } catch(e) {
        console.warn("Received message that wasn't JSON:", message.payloadString);
    }
};

// --- UI HELPERS ---
function updateStatus(text, color) {
    const pill = document.getElementById('status-pill');
    if (pill) { 
        pill.innerText = text; 
        pill.style.color = color; 
    }
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    if (!input || !input.value.trim()) return;

    const msgObj = {
        user: username,
        text: input.value,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const message = new Paho.MQTT.Message(JSON.stringify(msgObj));
    message.destinationName = TOPIC;
    client.send(message);
    input.value = '';
}

function renderMessage(data, save) {
    const chat = document.getElementById('chat');
    if (!chat) return;
    
    const isMe = data.user === username;
    const div = document.createElement('div');
    div.className = `msg ${isMe ? 'me' : 'them'}`;
    div.innerHTML = `<span class="msg-meta">${data.user} • ${data.time}</span>${data.text}`;
    
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    if (save) {
        let history = JSON.parse(localStorage.getItem('cb_history') || "[]");
        history.push(data);
        localStorage.setItem('cb_history', JSON.stringify(history.slice(-25)));
    }
}

function clearLocalChat() {
    if(confirm("Clear local chat history?")) {
        localStorage.removeItem('cb_history');
        location.reload();
    }
}

// --- BOOTSTRAP ---
window.onload = () => {
    // Load local history first
    const history = JSON.parse(localStorage.getItem('cb_history') || "[]");
    history.forEach(m => renderMessage(m, false));
    
    // Start Connection
    startMQTT();

    // Listen for Enter key
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if(e.key === 'Enter') sendMessage();
    });
};
