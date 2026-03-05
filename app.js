// --- CONFIGURATION ---
const BROKER = "broker.hivemq.com";
const PORT = 8884; 
const TOPIC = "chatbox/v12/global_room"; 

// --- IDENTITY ---
let user = localStorage.getItem('cb_user') || prompt("Enter your name:") || "User" + Math.floor(Math.random()*100);
localStorage.setItem('cb_user', user);

// --- INITIALIZE CLIENT ---
const client = new Paho.MQTT.Client(BROKER, PORT, "cb_v12_" + Math.random().toString(16).slice(2, 8));

// --- CONNECTION LOGIC ---
function connect() {
    console.log("Attempting to connect...");
    updateStatusUI("Connecting...", "#94a3b8");

    // Only use properties supported by Paho 1.0.1
    const options = {
        useSSL: true,
        timeout: 5,
        keepAliveInterval: 30,
        onSuccess: () => {
            updateStatusUI("Online", "#4ade80");
            client.subscribe(TOPIC);
        },
        onFailure: (err) => {
            updateStatusUI("Offline - Retry", "#ef4444");
            console.error("Connection Failed:", err);
            // Auto-retry after 5 seconds
            setTimeout(connect, 5000);
        }
    };
    client.connect(options);
}

// --- HANDLERS ---
client.onConnectionLost = (res) => {
    updateStatusUI("Disconnected", "#ef4444");
    console.log("Lost connection, retrying in 3s...");
    setTimeout(connect, 3000);
};

client.onMessageArrived = (m) => {
    try {
        const data = JSON.parse(m.payloadString);
        renderMessage(data, true);
    } catch(e) { console.warn("Received non-JSON:", m.payloadString); }
};

// --- CORE FUNCTIONS ---
function send() {
    const input = document.getElementById('chatInput');
    if (!input || !input.value.trim()) return;

    const payload = {
        user: user,
        text: input.value,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const message = new Paho.MQTT.Message(JSON.stringify(payload));
    message.destinationName = TOPIC;
    client.send(message);
    input.value = '';
}

function renderMessage(data, save) {
    const chat = document.getElementById('chat');
    if (!chat) return;

    const isMe = data.user === user;
    const isSystem = data.user === "System";
    
    const div = document.createElement('div');
    div.className = `msg ${isMe ? 'me' : 'them'}`;
    if(isSystem) div.style.cssText = "align-self: center; background: none; color: #94a3b8; font-size: 0.75rem; font-style: italic;";
    
    div.innerHTML = `<span class="msg-meta">${data.user} • ${data.time}</span>${data.text}`;
    
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    if (save && !isSystem) {
        let history = JSON.parse(localStorage.getItem('cb_history') || "[]");
        history.push(data);
        localStorage.setItem('cb_history', JSON.stringify(history.slice(-30)));
    }
}

// --- UI FEATURES ---
function renameUser() {
    const newName = prompt("New display name:", user);
    if (newName && newName.trim() !== "" && newName !== user) {
        const oldName = user;
        user = newName.trim();
        localStorage.setItem('cb_user', user);
        
        // Announce rename to others
        const sysMsg = new Paho.MQTT.Message(JSON.stringify({
            user: "System",
            text: `${oldName} changed name to ${user}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        sysMsg.destinationName = TOPIC;
        client.send(sysMsg);
        
        location.reload();
    }
}

function clearChat() {
    if(confirm("Clear local chat history?")) {
        localStorage.removeItem('cb_history');
        location.reload();
    }
}

function updateStatusUI(text, color) {
    const pill = document.getElementById('status-pill');
    if (pill) { pill.innerText = text; pill.style.color = color; }
}

// --- BOOTUP ---
window.onload = () => {
    // 1. Load history
    const history = JSON.parse(localStorage.getItem('cb_history') || "[]");
    history.forEach(m => renderMessage(m, false));
    
    // 2. Start connection
    connect();

    // 3. Listen for Enter
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if(e.key === 'Enter') send();
    });
};
