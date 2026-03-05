const BROKER = "broker.hivemq.com";
const PORT = 8884; 
const TOPIC = "chatbox/global/v7"; // Change this to make it private

const username = localStorage.getItem('cb_user') || prompt("Enter your name:") || "User" + Math.floor(Math.random()*100);
localStorage.setItem('cb_user', username);

// Unique Client ID
const client = new Paho.MQTT.Client(BROKER, PORT, "cb_" + Math.random().toString(16).slice(2, 10));

const connectOptions = {
    useSSL: true,
    onSuccess: () => {
        document.getElementById('status').innerText = "Online";
        document.getElementById('status').style.color = "#22c55e";
        client.subscribe(TOPIC);
    },
    onFailure: (err) => {
        document.getElementById('status').innerText = "Offline";
        console.error(err);
    }
};

// Handle Incoming Messages
client.onMessageArrived = (message) => {
    try {
        const data = JSON.parse(message.payloadString);
        renderMessage(data);
    } catch (e) {
        console.log("Received raw string:", message.payloadString);
    }
};

client.onConnectionLost = () => {
    document.getElementById('status').innerText = "Disconnected";
};

// Send Message Function
function sendMessage() {
    const input = document.getElementById('chatInput'); // EXACT MATCH TO HTML ID
    if (!input || !input.value.trim()) return;

    const payload = JSON.stringify({
        user: username,
        text: input.value,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    const message = new Paho.MQTT.Message(payload);
    message.destinationName = TOPIC;
    client.send(message);
    input.value = '';
}

// UI Rendering
function renderMessage(data) {
    const chat = document.getElementById('chat');
    const isMe = data.user === username;
    const div = document.createElement('div');
    div.className = `msg ${isMe ? 'me' : 'them'}`;
    div.innerHTML = `<span class="msg-info">${data.user} • ${data.time}</span>${data.text}`;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

// ATTACH EVENTS (The "Safe" way)
document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('sendBtn');
    const input = document.getElementById('chatInput');

    sendBtn.addEventListener('click', sendMessage);
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
});

client.connect(connectOptions);
