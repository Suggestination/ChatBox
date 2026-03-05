// CONFIGURATION
const BROKER = "broker.hivemq.com";
const PORT = 8000; // Use 8884 if you switch useSSL to true
const ROOM_TOPIC = "gemini/chat/main/unique_room_123"; // Change this to something unique
const STATUS_TOPIC = "gemini/chat/status/"; 

// 1. ENSURE UNIQUE CLIENT ID (Prevents one tab from kicking the other out)
const username = prompt("What is your name?") || "User_" + Math.floor(Math.random() * 100);
const uniqueID = "client_" + username + "_" + Math.random().toString(16).slice(2, 10);

const client = new Paho.MQTT.Client(BROKER, PORT, uniqueID);

let onlineUsers = new Set();

// 2. CONNECTION OPTIONS
const connectOptions = {
    onSuccess: onConnect,
    onFailure: (err) => console.error("Connect Failed:", err),
    useSSL: false, // Set to true if your GitHub page is HTTPS and broker supports it
    keepAliveInterval: 30,
    cleanSession: true, // Ensures a fresh start for each tab
    willMessage: (() => {
        let msg = new Paho.MQTT.Message("Offline");
        msg.destinationName = STATUS_TOPIC + username;
        msg.retained = true;
        return msg;
    })()
};

// 3. CALLBACKS
client.onConnectionLost = (res) => {
    console.log("Connection Lost. Error: " + res.errorMessage);
};

client.onMessageArrived = (message) => {
    const topic = message.destinationName;
    const payload = message.payloadString;

    if (topic === ROOM_TOPIC) {
        try {
            const data = JSON.parse(payload);
            renderMessage(data);
        } catch (e) {
            console.error("Error parsing JSON:", e);
        }
    } 
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
    console.log("Connected successfully as: " + username);
    
    // Subscribe to both the chat and the status updates
    client.subscribe(ROOM_TOPIC);
    client.subscribe(STATUS_TOPIC + "#");

    // Announce presence
    const msg = new Paho.MQTT.Message("Online");
    msg.destinationName = STATUS_TOPIC + username;
    msg.retained = true;
    client.send(msg);
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    if (!input || !input.value.trim()) return;

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
    
    msgDiv.style.cssText = `
        padding: 10px; 
        margin: 5px; 
        border-radius: 10px; 
        background: ${isMe ? '#007bff' : '#eee'}; 
        color: ${isMe ? 'white' : 'black'};
        align-self: ${isMe ? 'flex-end' : 'flex-start'};
        max-width: 80%;
    `;
    
    msgDiv.innerHTML = `<strong>${data.user}</strong>: ${data.text}`;
    chat.appendChild(msgDiv);
    chat.scrollTop = chat.scrollHeight;
}

function updateUserListUI() {
    const list = document.getElementById('userList');
    if(list) {
        list.innerHTML = "";
        onlineUsers.forEach(user => {
            const li = document.createElement('li');
            li.textContent = user + (user === username ? " (You)" : "");
            list.appendChild(li);
        });
    }
}

// Start Connection
client.connect(connectOptions);
