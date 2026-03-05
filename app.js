// CONFIGURATION
const BROKER = "broker.hivemq.com";
const PORT = 8884; // Force Secure Port
const TOPIC = "chatbox/v9/main_channel"; 

// IDENTITY
let username = localStorage.getItem('cb_user') || prompt("Enter Chat Name:") || "User" + Math.floor(Math.random()*100);
localStorage.setItem('cb_user', username);

// CLIENT INIT
const client = new Paho.MQTT.Client(BROKER, PORT, "cb_v9_" + Math.random().toString(16).slice(2, 10));

const connectOptions = {
    useSSL: true, 
    timeout: 5,
    keepAliveInterval: 30,
    reconnect: true, // AUTO-RECONNECT
    onSuccess: () => {
        updateStatus("Online", "#4ade80");
        client.subscribe(TOPIC);
    },
    onFailure: (err) => {
        updateStatus("Failed - Click to Retry", "#f87171");
        console.error(err);
    }
};

// HANDLERS
client.onMessageArrived = (message) => {
    try {
        const data = JSON.parse(message.payloadString);
        renderMessage(data, true);
        if (data.user !== username) document.getElementById('notifSound').play().catch(()=>{});
    } catch(e) {}
};

client.onConnectionLost = (res) => {
    updateStatus("Connecting...", "#94a3b8");
    if (res.errorCode !== 0) console.log("Lost: " + res.errorMessage);
};

// CORE FUNCTIONS
function updateStatus(text, color) {
    const pill = document.getElementById('status-pill');
    if (pill) {
        pill.innerText = text;
        pill.style.color = color;
    }
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    if (!input || !input.value.trim() || pill.innerText !== "Online") return;

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
        localStorage.setItem('cb_history', JSON.stringify(history.slice(-50)));
    }
}

function clearLocalChat() {
    if(confirm("Clear local chat history?")) {
        localStorage.removeItem('cb_history');
        location.reload();
    }
}

function manualReconnect() {
    if (!client.isConnected()) {
        updateStatus("Retrying...", "#fbbf24");
        client.connect(connectOptions);
    }
}

// BOOTSTRAP
document.addEventListener('DOMContentLoaded', () => {
    // Load History
    const history = JSON.parse(localStorage.getItem('cb_history') || "[]");
    history.forEach(m => renderMessage(m, false));

    // UI Events
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if(e.key === 'Enter') sendMessage();
    });

    // Start
    client.connect(connectOptions);
});
