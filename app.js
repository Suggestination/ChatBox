// CONFIG
const BROKER = "broker.hivemq.com";
const PORT = 8884; 
const TOPIC = "chatbox/v11/global"; 

// Identity
let user = localStorage.getItem('cb_user') || prompt("Name:") || "User" + Math.floor(Math.random()*100);
localStorage.setItem('cb_user', user);

// Client Init
const client = new Paho.MQTT.Client(BROKER, PORT, "cb_v11_" + Math.random().toString(16).slice(2, 8));

// 1. SAFE CONNECT FUNCTION
function connect() {
    const pill = document.getElementById('status-pill');
    if (pill) pill.innerText = "Connecting...";

    client.connect({
        useSSL: true,
        timeout: 5,
        onSuccess: () => {
            if (pill) { pill.innerText = "Online"; pill.style.color = "#4ade80"; }
            client.subscribe(TOPIC);
            console.log("Connected!");
        },
        onFailure: (err) => {
            if (pill) { pill.innerText = "Retry?"; pill.style.color = "#ef4444"; }
            console.error("Failed:", err);
            // Manual retry after 5 seconds
            setTimeout(connect, 5000);
        }
    });
}

// 2. HANDLERS
client.onConnectionLost = (res) => {
    const pill = document.getElementById('status-pill');
    if (pill) { pill.innerText = "Offline"; pill.style.color = "#ef4444"; }
    console.log("Lost connection, retrying...");
    setTimeout(connect, 3000);
};

client.onMessageArrived = (m) => {
    try {
        const data = JSON.parse(m.payloadString);
        render(data, true);
    } catch(e) { console.log("Raw msg:", m.payloadString); }
};

// 3. UI FUNCTIONS
function send() {
    const input = document.getElementById('chatInput');
    if (!input || !input.value.trim()) return;

    const msg = {
        user: user,
        text: input.value,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const message = new Paho.MQTT.Message(JSON.stringify(msg));
    message.destinationName = TOPIC;
    client.send(message);
    input.value = '';
}

function render(data, save) {
    const chat = document.getElementById('chat');
    if (!chat) return;
    
    const isMe = data.user === user;
    const div = document.createElement('div');
    div.className = `msg ${isMe ? 'me' : 'them'}`;
    div.innerHTML = `<span class="msg-meta">${data.user} • ${data.time}</span>${data.text}`;
    
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    if (save) {
        let history = JSON.parse(localStorage.getItem('cb_history') || "[]");
        history.push(data);
        localStorage.setItem('cb_history', JSON.stringify(history.slice(-30)));
    }
}

function clearChat() {
    localStorage.removeItem('cb_history');
    location.reload();
}

// 4. BOOTUP
window.onload = () => {
    // Load history
    const history = JSON.parse(localStorage.getItem('cb_history') || "[]");
    history.forEach(m => render(m, false));
    
    // Start Connection
    connect();

    // Key Listener
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if(e.key === 'Enter') send();
    });
};
