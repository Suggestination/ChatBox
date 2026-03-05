// Configuration
const BROKER = "broker.hivemq.com";
const PORT = 8884;
const ROOM_TOPIC = "gemini/chat/main/room1";
const STATUS_TOPIC = "gemini/chat/status/"; 

// Get User Identity
const username = prompt("What is your name?") || "User_" + Math.floor(Math.random() * 1000);
//const client = new Paho.MQTT.Client(BROKER, PORT, "js_client_" + username + "_" + Math.random().toString(16).slice(2, 5));

// Change this line in your app.js
// This creates a unique ID based on the username AND a random timestamp
const uniqueID = "web_chat_" + username + "_" + Math.random().toString(36).substring(2, 9);
const client = new Paho.MQTT.Client(BROKER, PORT, uniqueID);

// Local state for online users
let onlineUsers = new Set();

const connectOptions = {
    onSuccess: onConnect,
    useSSL: false,
    keepAliveInterval: 30,
    // LAST WILL: Tells everyone you left if you close the tab/crash
    willMessage: (() => {
        let msg = new Paho.MQTT.Message("Offline");
        msg.destinationName = STATUS_TOPIC + username;
        msg.retained = true;
        return msg;
    })()
};

client.onConnectionLost = (res) => { console.log("Lost connection: " + res.errorMessage); };

client.onMessageArrived = (message) => {
    const topic = message.destinationName;
    const payload = message.payloadString;

    // 1. Handle Chat Messages
    if (topic === ROOM_TOPIC) {
        const data = JSON.parse(payload);
        renderMessage(data);
    } 
    
    // 2. Handle Online/Offline Status
    else if (topic.startsWith(STATUS_TOPIC)) {
        const user = topic.replace(STATUS_TOPIC, "");
        if (payload === "Online") {
            onlineUsers.add(user);
        } else {
            onlineUsers.delete(user);
        }
        updateUserListUI();
    }
};

function onConnect() {
    console.log("Connected as " + username);
    client.subscribe(ROOM_TOPIC);
    client.subscribe(STATUS_TOPIC + "#"); // Listen for all user statuses

    // Announce presence (Retained so others see you immediately)
    const msg = new Paho.MQTT.Message("Online");
    msg.destinationName = STATUS_TOPIC + username;
    msg.retained = true;
    client.send(msg);
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    if (!input.value.trim()) return;

    const payload = JSON.stringify({
        user: username,
        text: input.value,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    const message = new Paho.MQTT.Message(payload);
    message.destinationName = ROOM_TOPIC;
    client.send(message);
    input.value = '';
}

function renderMessage(data) {
    const chat = document.getElementById('chat');
    const msgDiv = document.createElement('div');
    const isMe = data.user === username;
    
    msgDiv.className = `msg ${isMe ? 'me' : ''}`;
    msgDiv.innerHTML = `
        <small style="display:block; font-size:0.7rem; opacity:0.8">${data.user} • ${data.time}</small>
        ${data.text}
    `;
    chat.appendChild(msgDiv);
    chat.scrollTop = chat.scrollHeight;
}

function updateUserListUI() {
    const list = document.getElementById('userList');
    list.innerHTML = "";
    onlineUsers.forEach(user => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="online-dot"></span>${user} ${user === username ? '(You)' : ''}`;
        list.appendChild(li);
    });
}

client.connect(connectOptions);
