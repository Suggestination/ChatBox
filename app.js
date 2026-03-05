// CONFIGURATION - Specifically tuned for GitHub Pages (HTTPS)
const BROKER = "broker.hivemq.com";
const PORT = 8884; // The SECURE port
const ROOM_TOPIC = "gemini/chat/unique_v5_final"; 

// 1. GENERATE UNIQUE IDENTITY
// We use a random suffix so that opening two tabs doesn't cause a conflict.
const username = prompt("Enter your chat name:") || "User" + Math.floor(Math.random() * 100);
const uniqueID = "client_" + Math.random().toString(16).slice(2, 10);

// Initialize the Paho MQTT Client
const client = new Paho.MQTT.Client(BROKER, PORT, uniqueID);

// 2. CONNECTION OPTIONS
const connectOptions = {
    useSSL: true,          // REQUIRED for GitHub Pages
    timeout: 3,
    onSuccess: onConnect,
    onFailure: (err) => {
        console.error("FAILED TO CONNECT:", err);
        alert("Connection failed. Check the console for details.");
    }
};

// 3. SET HANDLERS
client.onConnectionLost = (res) => {
    console.log("Connection lost: " + res.errorMessage);
};

client.onMessageArrived = (message) => {
    const chat = document.getElementById('chat');
    try {
        const data = JSON.parse(message.payloadString);
        renderMessage(data);
    } catch (e) {
        console.log("Non-JSON message received:", message.payloadString);
    }
};

// 4. FUNCTIONS
function onConnect() {
    console.log("Connected Successfully over WSS!");
    client.subscribe(ROOM_TOPIC);
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
    
    // Inline styling for quick testing
    msgDiv.style.cssText = `
        padding: 8px 12px;
        margin: 5px;
        border-radius: 10px;
        max-width: 70%;
        font-family: sans-serif;
        background: ${isMe ? '#007bff' : '#e9e9eb'};
        color: ${isMe ? 'white' : 'black'};
        align-self: ${isMe ? 'flex-end' : 'flex-start'};
    `;
    
    msgDiv.innerHTML = `<strong>${data.user}</strong>: ${data.text}`;
    chat.appendChild(msgDiv);
    chat.scrollTop = chat.scrollHeight;
}

// 5. START CONNECTION
client.connect(connectOptions);
