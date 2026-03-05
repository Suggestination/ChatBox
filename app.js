// 1. AUTO-CONFIG: Detects if your site is HTTPS or HTTP
const isSecure = window.location.protocol === "https:";
const BROKER = "broker.hivemq.com";
// HiveMQ uses 8000 for WS and 8884 or 443 for WSS
const PORT = isSecure ? 8884 : 8000; 

const ROOM_TOPIC = "gemini/chat/unique_v3_room"; // Change this if you want a private room
const STATUS_TOPIC = "gemini/chat/status/";

// 2. IDENTITY: Force a truly unique ID so tabs don't kick each other off
const username = prompt("What is your name?") || "User_" + Math.floor(Math.random() * 100);
const uniqueID = "client_" + Math.random().toString(16).substr(2, 8);

const client = new Paho.MQTT.Client(BROKER, PORT, uniqueID);

// 3. CONNECTION LOGIC
const connectOptions = {
    onSuccess: onConnect,
    onFailure: (err) => {
        console.error("CONNECTION FAILED:", err);
        alert("Connection failed! Check console (F12) for details.");
    },
    useSSL: isSecure, // Matches the protocol of your website
    keepAliveInterval: 30,
    timeout: 10,
    cleanSession: true
};

client.onConnectionLost = (res) => {
    console.log("Connection Lost: " + res.errorMessage);
};

client.onMessageArrived = (message) => {
    const chat = document.getElementById('chat');
    try {
        const data = JSON.parse(message.payloadString);
        const isMe = data.user === username;
        
        const msgDiv = document.createElement('div');
        msgDiv.style.padding = "10px";
        msgDiv.style.margin = "5px";
        msgDiv.style.borderRadius = "8px";
        msgDiv.style.maxWidth = "70%";
        msgDiv.style.alignSelf = isMe ? "flex-end" : "flex-start";
        msgDiv.style.backgroundColor = isMe ? "#007bff" : "#e9e9eb";
        msgDiv.style.color = isMe ? "white" : "black";
        
        msgDiv.innerHTML = `<strong>${data.user}</strong>: ${data.text}`;
        chat.appendChild(msgDiv);
        chat.scrollTop = chat.scrollHeight;
    } catch (e) {
        console.log("Received non-JSON message: ", message.payloadString);
    }
};

function onConnect() {
    console.log("CONNECTED TO BROKER ON PORT: " + PORT);
    client.subscribe(ROOM_TOPIC);
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    if (!input.value.trim()) return;

    const payload = JSON.stringify({
        user: username,
        text: input.value
    });

    const message = new Paho.MQTT.Message(payload);
    message.destinationName = ROOM_TOPIC;
    client.send(message);
    input.value = '';
}

// Start the connection
console.log(`Attempting to connect to ${BROKER} on port ${PORT}...`);
client.connect(connectOptions);
