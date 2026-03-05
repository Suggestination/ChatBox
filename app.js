const BROKER = "broker.hivemq.com";
const PORT = 8884; 
const ROOM_TOPIC = "chatbox/v1/global_room"; // Unique topic for ChatBox
const STATUS_TOPIC = "chatbox/v1/status/";

// Use persistent name or prompt
let username = localStorage.getItem('chatbox_name');
if (!username) {
    username = prompt("Welcome to ChatBox! Enter your name:") || "Guest" + Math.floor(Math.random()*100);
    localStorage.setItem('chatbox_name', username);
}

const client = new Paho.MQTT.Client(BROKER, PORT, "cb_id_" + Math.random().toString(16).slice(2,10));
let onlineUsers = new Set();

// Load history
let savedMessages = JSON.parse(localStorage.getItem('chatbox_history') || "[]");

const connectOptions = {
    useSSL: true,
    timeout: 3,
    onSuccess: () => {
        client.subscribe(ROOM_TOPIC);
        client.subscribe(STATUS_TOPIC + "#");
        
        // Announce presence
        const msg = new Paho.MQTT.Message("Online");
        msg.destinationName = STATUS_TOPIC + username;
        msg.retained = true;
        client.send(msg);
        console.log("ChatBox Connected!");
    },
    onFailure: (e) => console.error("ChatBox connection failed", e),
    willMessage: (() => {
        let m = new Paho.MQTT.Message("Offline");
        m.destinationName = STATUS_TOPIC + username;
        m.retained = true;
        return m;
    })()
};

client.onMessageArrived = (message) => {
    if (message.destinationName === ROOM_TOPIC) {
        try {
            const data = JSON.parse(message.payloadString);
            renderMessage(data, true);
        } catch(e) { console.error("Data error", e); }
    } else if (message.destinationName.startsWith(STATUS_TOPIC)) {
        const user = message.destinationName.replace(STATUS_TOPIC, "");
        message.payloadString === "Online" ? onlineUsers.add(user) : onlineUsers.delete(user);
        updateUserListUI();
    }
};

function sendMessage() {
    // FIX: IDs now match index.html exactly
    const input = document.getElementById('msgInput');
    if (!input || !input.value.trim()) return;

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
    if (!chat) return;
    
    const isMe = data.user === username;
    const div = document.createElement('div');
    div.className = `msg ${isMe ? 'me' : 'them'}`;
    div.innerHTML = `<span class="msg-meta">${data.user} • ${data.time}</span>${data.text}`;
    
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    if (save) {
        savedMessages.push(data);
        localStorage.setItem('chatbox_history', JSON.stringify(savedMessages.slice(-50)));
    }
}

function updateUserListUI() {
    const list = document.getElementById('userList');
    if (!list) return;
    list.innerHTML = Array.from(onlineUsers).map(u => `
        <div class="user-item"><span class="status-dot"></span>${u}</div>
    `).join('');
}

function clearHistory() {
    if(confirm("Clear all chat history from this device?")) {
        localStorage.removeItem('chatbox_history');
        location.reload();
    }
}

// Initial Render of saved history
savedMessages.forEach(m => renderMessage(m, false));

// Connect
client.connect(connectOptions);
