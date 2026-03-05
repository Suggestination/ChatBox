const BROKER = "broker.hivemq.com";
const PORT = 8884; 
const TOPIC = "chatbox/v10/global"; 

let username = localStorage.getItem('cb_user') || prompt("Chat Name:") || "User" + Math.floor(Math.random()*100);
localStorage.setItem('cb_user', username);

const client = new Paho.MQTT.Client(BROKER, PORT, "cb_v10_" + Math.random().toString(16).slice(2, 10));

function startMQTT() {
    updateStatus("Connecting...", "#94a3b8");
    client.connect({
        useSSL: true, 
        timeout: 5,
        onSuccess: () => {
            updateStatus("Online", "#4ade80");
            client.subscribe(TOPIC);
        },
        onFailure: (err) => {
            updateStatus("Retry?", "#f87171");
            console.error(err);
        }
    });
}

client.onConnectionLost = (res) => {
    updateStatus("Offline", "#f87171");
    // Custom auto-reconnect: Wait 3 seconds and try again
    setTimeout(startMQTT, 3000);
};

client.onMessageArrived = (message) => {
    try {
        const data = JSON.parse(message.payloadString);
        renderMessage(data, true);
    } catch(e) {}
};

function updateStatus(text, color) {
    const pill = document.getElementById('status-pill');
    if (pill) { pill.innerText = text; pill.style.color = color; }
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
        localStorage.setItem('cb_history', JSON.stringify(history.slice(-20)));
    }
}

function clearLocalChat() {
    localStorage.removeItem('cb_history');
    location.reload();
}

// Initial Setup
window.onload = () => {
    const history = JSON.parse(localStorage.getItem('cb_history') || "[]");
    history.forEach(m => renderMessage(m, false));
    startMQTT();

    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if(e.key === 'Enter') sendMessage();
    });
};
