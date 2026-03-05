// --- CONFIGURATION ---
const BROKER = "broker.hivemq.com";
const PORT = 8884; 
const TOPIC = "chatbox/v12/global_room"; 

// --- VALIDATION HELPER ---
function isValidName(name) {
    // Allows only letters (A-Z) and numbers (0-9). No spaces or symbols.
    const regex = /^[a-zA-Z0-9]+$/;
    return regex.test(name);
}

// --- IDENTITY SETUP ---
let user = localStorage.getItem('cb_user');

// Force a valid name if the current one is empty or has illegal characters
if (!user || !isValidName(user)) {
    let input = prompt("Enter a username (Letters & Numbers only, NO spaces):");
    
    if (input && isValidName(input.trim())) {
        user = input.trim();
    } else {
        // Fallback if they enter something invalid or cancel
        user = "User" + Math.floor(Math.random() * 1000);
    }
    localStorage.setItem('cb_user', user);
}

// --- INITIALIZE MQTT CLIENT ---
const client = new Paho.MQTT.Client(BROKER, PORT, "cb_v12_" + Math.random().toString(16).slice(2, 8));

function connect() {
    console.log("Attempting to connect...");
    updateStatusUI("Connecting...", "#94a3b8");

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
            setTimeout(connect, 5000); // Auto-retry
        }
    };
    client.connect(options);
}

// --- HANDLERS ---
client.onConnectionLost = (res) => {
    updateStatusUI("Disconnected", "#ef4444");
    setTimeout(connect, 3000);
};

client.onMessageArrived = (m) => {
    try {
        const data = JSON.parse(m.payloadString);
        renderMessage(data, true);
    } catch(e) { console.warn("Raw message received:", m.payloadString); }
};

// --- CORE CHAT FUNCTIONS ---
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
    
    if(isSystem) {
        div.style.cssText = "align-self: center; background: rgba(255,255,255,0.1); color: #94a3b8; font-size: 0.75rem; font-style: italic; border-radius: 8px;";
    }
    
    div.innerHTML = `<span class="msg-meta">${data.user} • ${data.time}</span>${data.text}`;
    
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    if (save && !isSystem) {
        let history = JSON.parse(localStorage.getItem('cb_history') || "[]");
        history.push(data);
        localStorage.setItem('cb_history', JSON.stringify(history.slice(-30)));
    }
}

// --- UI ACTIONS ---
function renameUser() {
    const newName = prompt("New name (Letters & Numbers only, no spaces):", user);
    
    if (newName) {
        const trimmed = newName.trim();
        
        if (!isValidName(trimmed)) {
            alert("Error: Use only letters and numbers. No spaces or special characters allowed!");
            return;
        }

        const oldName = user;
        user = trimmed;
        localStorage.setItem('cb_user', user);
        
        // Notify the room
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
    if(confirm("Clear all chat history on this device?")) {
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
    const history = JSON.parse(localStorage.getItem('cb_history') || "[]");
    history.forEach(m => renderMessage(m, false));
    connect();

    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if(e.key === 'Enter') send();
    });
};
