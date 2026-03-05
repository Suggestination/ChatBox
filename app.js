const BROKER = "broker.hivemq.com";
const PORT = 8884; 
const ROOM_TOPIC = "gemini/chat/v6/main";
const STATUS_TOPIC = "gemini/chat/v6/status/";

const username = localStorage.getItem('chat-username') || prompt("Pick a username:") || "User" + Math.floor(Math.random()*100);
localStorage.setItem('chat-username', username);

const client = new Paho.MQTT.Client(BROKER, PORT, "cid_" + Math.random().toString(16).slice(2,10));
let onlineUsers = new Set();

// 1. Load History from LocalStorage on Startup
const savedMessages = JSON.parse(localStorage.getItem('chat-history') || "[]");
window.onload = () => {
    savedMessages.forEach(msg => renderMessage(msg, false));
};

const connectOptions = {
    useSSL: true,
    onSuccess: () => {
        client.subscribe(ROOM_TOPIC);
        client.subscribe(STATUS_TOPIC + "#");
        // Announce I'm online
        const msg = new Paho.MQTT.Message("Online");
        msg.destinationName = STATUS_TOPIC + username;
        msg.retained = true;
        client.send(msg);
    },
    willMessage: (() => {
        let m = new Paho.MQTT.Message("Offline");
        m.destinationName = STATUS_TOPIC + username;
        m.retained = true;
        return m;
    })()
};

client.onMessageArrived = (message) => {
    if (message.destinationName === ROOM_TOPIC) {
        const data = JSON.parse(message.payloadString);
        renderMessage(data, true);
    } else if (message.destinationName.startsWith(STATUS_TOPIC)) {
        const user = message.destinationName.replace(STATUS_TOPIC, "");
        message.payloadString === "Online" ? onlineUsers.add(user) : onlineUsers.delete(user);
        updateUserListUI();
    }
};

function sendMessage() {
    const input = document.getElementById('msgInput');
    if (!input.value.trim()) return;

    const data = {
        user: username,
        text: input.value,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const msg = new Paho.MQTT.Message(JSON.stringify(data));
    msg.destinationName = ROOM_TOPIC;
    client.send(msg);
    input.value = '';
}

function renderMessage(data, save) {
    const chat = document.getElementById('chat');
    const isMe = data.user === username;
    
    const div = document.createElement('div');
    div.className = `msg ${isMe ? 'me' : 'them'}`;
    div.innerHTML = `<span class="msg-meta">${data.user} • ${data.time}</span>${data.text}`;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    if (save) {
        savedMessages.push(data);
        localStorage.setItem('chat-history', JSON.stringify(savedMessages.slice(-50))); // Save last 50
    }
}

function updateUserListUI() {
    const list = document.getElementById('userList');
    list.innerHTML = Array.from(onlineUsers).map(u => `
        <div class="user-item"><span class="status-dot"></span>${u} ${u === username ? '(You)' : ''}</div>
    `).join('');
}

client.connect(connectOptions);
