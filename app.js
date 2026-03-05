// --- CONFIGURATION ---
const BROKER = "broker.hivemq.com";
const PORT = 8884; 
const TOPIC = "chatbox/v13/global_room";
const PRESENCE_TOPIC = "chatbox/v13/presence/"; // Sub-topic for tracking users

// --- IDENTITY & VALIDATION ---
const adminPass = "101010";
function isValidName(name) { return /^[a-zA-Z0-9]+$/.test(name); }

let user = localStorage.getItem('cb_user');
if (!user || !isValidName(user)) {
    let input = prompt("Username (Letters & Numbers only, no spaces):");
    user = (input && isValidName(input.trim())) ? input.trim() : "User" + Math.floor(Math.random() * 999);
    localStorage.setItem('cb_user', user);
}

// --- MQTT CLIENT SETUP ---
const client = new Paho.MQTT.Client(BROKER, PORT, "cb_" + Math.random().toString(16).slice(2, 8));
let onlineUsers = {};

function connect() {
    updateStatusUI("Connecting...", "#94a3b8");

    const options = {
        useSSL: true,
        timeout: 5,
        keepAliveInterval: 30,
        // LAST WILL: Automatically tells others you're offline if you close the tab
        willMessage: (() => {
            let m = new Paho.MQTT.Message("Offline");
            m.destinationName = PRESENCE_TOPIC + user;
            m.retained = true;
            return m;
        })(),
        onSuccess: () => {
            updateStatusUI("Online", "#4ade80");
            client.subscribe(TOPIC);
            client.subscribe(PRESENCE_TOPIC + "#"); // Listen to all presence updates

            // Announce I am online
            const pMsg = new Paho.MQTT.Message("Online");
            pMsg.destinationName = PRESENCE_TOPIC + user;
            pMsg.retained = true; 
            client.send(pMsg);
        },
        onFailure: (err) => {
            updateStatusUI("Retry", "#ef4444");
            setTimeout(connect, 5000);
        }
    };
    client.connect(options);
}

// --- MESSAGE HANDLERS ---
client.onMessageArrived = (m) => {
    // 1. Handle User Presence & Kicks
    if (m.destinationName.startsWith(PRESENCE_TOPIC)) {
        const targetUser = m.destinationName.replace(PRESENCE_TOPIC, "");
        const status = m.payloadString;

        if (status === "Online") {
            onlineUsers[targetUser] = true;
        } else if (status === "Offline") {
            delete onlineUsers[targetUser];
        } else if (status === "KICKED" && targetUser === user) {
            alert("You have been removed from the room by an admin.");
            location.href = "about:blank"; // Redirect kicked user
        }
        updateUserListUI();
        return;
    }

    // 2. Handle Normal Chat
    try {
        const data = JSON.parse(m.payloadString);
        renderMessage(data, true);
    } catch(e) {}
};

client.onConnectionLost = () => {
    updateStatusUI("Offline", "#ef4444");
    setTimeout(connect, 3000);
};

// --- CHAT LOGIC ---
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
    const isSystem = data.user === "System" || data.user === "Admin";
    
    const div = document.createElement('div');
    div.className = `msg ${isMe ? 'me' : 'them'}`;
    
    if(isSystem) {
        div.style.cssText = "align-self: center; background: rgba(255,255,255,0.05); color: #94a3b8; font-size: 0.75rem; border: 1px solid #334155;";
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

// --- USER MANAGEMENT & ADMIN ---
function toggleUserList() {
    const panel = document.getElementById('userListPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function updateUserListUI() {
    const list = document.getElementById('onlineUsers');
    const count = document.getElementById('userCount');
    const users = Object.keys(onlineUsers);
    
    count.innerText = users.length;
    list.innerHTML = users.map(u => `
        <div class="user-row">
            <span class="user-name">● ${u} ${u === user ? "(You)" : ""}</span>
            ${u !== user ? `<button class="btn-kick" onclick="kickUser('${u}')">KICK</button>` : ""}
        </div>
    `).join('');
}

function kickUser(target) {
    const pass = prompt(`Enter Password to kick ${target}:`);
    if (pass === adminPass) {
        // Send the kick signal
        const kMsg = new Paho.MQTT.Message("KICKED");
        kMsg.destinationName = PRESENCE_TOPIC + target;
        kMsg.retained = false;
        client.send(kMsg);

        // Notify the chat
        const sysMsg = new Paho.MQTT.Message(JSON.stringify({
            user: "Admin",
            text: `${target} was kicked out.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        sysMsg.destinationName = TOPIC;
        client.send(sysMsg);
    } else if (pass !== null) {
        alert("Wrong Password!");
    }
}

function renameUser() {
    const newName = prompt("New name (Alphanumeric only):", user);
    if (newName && isValidName(newName.trim()) && newName.trim() !== user) {
        // Clear old presence before renaming
        const offMsg = new Paho.MQTT.Message("Offline");
        offMsg.destinationName = PRESENCE_TOPIC + user;
        offMsg.retained = true;
        client.send(offMsg);

        user = newName.trim();
        localStorage.setItem('cb_user', user);
        location.reload();
    } else if (newName) {
        alert("Invalid name! Use only letters and numbers with no spaces.");
    }
}

function clearChat() {
    if(confirm("Clear local chat?")) {
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
