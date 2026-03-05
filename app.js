const BROKER = "broker.hivemq.com";
const PORT = 8884; 
const TOPIC = "chatbox/global/final_v8"; 

let username = localStorage.getItem('cb_user') || prompt("Enter your name:") || "User" + Math.floor(Math.random()*100);
localStorage.setItem('cb_user', username);

const client = new Paho.MQTT.Client(BROKER, PORT, "cb_client_" + Math.random().toString(16).slice(2, 10));

// Load local history
let history = JSON.parse(localStorage.getItem('cb_history') || "[]");

const connectOptions = {
    useSSL: true,
    reconnect: true, // Auto-reconnect if it drops
    onSuccess: () => {
        const indicator = document.getElementById('status-indicator');
        indicator.innerText = "Online";
        indicator.style.color = "#4ade80";
        client.subscribe(TOPIC);
    },
    onFailure: (e) => {
        document.getElementById('status-indicator').innerText = "Failed";
        console.error("Connection Error:", e);
    }
};

client.onMessageArrived = (message) => {
    try {
        const data = JSON.parse(message.payloadString);
        renderMessage(data, true);
        
        // Play sound if message is from someone else
        if (data.user !== username) {
            document.getElementById('msgSound').play().catch(() => {});
        }
    } catch (e) { console.log(e); }
};

client.onConnectionLost = () => {
    document.getElementById('status-indicator').innerText = "Connecting...";
};

function sendMessage() {
    const input = document.getElementById('chatInput');
    if (!input || !input.value.trim()) return;

    const payload = {
        user: username,
        text: input.value,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const message = new Paho.MQTT.Message(JSON.stringify(payload));
    message.destinationName = TOPIC;
    client.send(message);
    input.value = '';
}

function renderMessage(data, shouldSave) {
    const chat = document.getElementById('chat');
    if (!chat) return;

    const isMe = data.user === username;
    const div = document.createElement('div');
    div.className = `msg ${isMe ? 'me' : 'them'}`;
    div.innerHTML = `<span class="msg-info">${data.user} • ${data.time}</span>${data.text}`;
    
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    if (shouldSave) {
        history.push(data);
        localStorage.setItem('cb_history', JSON.stringify(history.slice(-50)));
    }
}

function clearHistory() {
    if (confirm("Clear history and refresh?")) {
        localStorage.removeItem('cb_history');
        // We clear the history variable first to prevent error during reload
        history = []; 
        location.reload();
    }
}

// Safer event attachment
document.addEventListener('DOMContentLoaded', () => {
    // Render initial history
    history.forEach(m => renderMessage(m, false));

    const sendBtn = document.getElementById('sendBtn');
    const input = document.getElementById('chatInput');

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (input) input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
});

client.connect(connectOptions);
