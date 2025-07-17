// Firebase Setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  onChildAdded
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAEmqSpVUltKx_BXkZ04U9-6TFW4X3djOA",
  authDomain: "terminal-chat-fa26a.firebaseapp.com",
  projectId: "terminal-chat-fa26a",
  storageBucket: "terminal-chat-fa26a.appspot.com",
  messagingSenderId: "763549220695",
  appId: "1:763549220695:web:2acccef34d0fed0c228812",
  measurementId: "G-2676T23DHC"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let userCodename = "";
let roomCode = "global";
let roomPassword = "";
let isEncoded = true;
let allMessages = [];

// DOM references
const codenameInput = document.getElementById("codename");
const passwordInput = document.getElementById("password");
const roomDisplay = document.getElementById("roomDisplay");
const chatDisplay = document.getElementById("chatDisplay");
const messageInput = document.getElementById("messageInput");
const modeBtn = document.getElementById("modeBtn");
const loginMsg = document.getElementById("loginMsg");

// Service Worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(() => console.log("✅ ShellTalk Service Worker registered"));
}

// Login
window.login = async function () {
  const codename = codenameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!codename || password.length !== 6 || !/^\d+$/.test(password)) {
    loginMsg.textContent = "❌ Invalid codename or password (6-digit number)";
    return;
  }

  const email = `${codename}@ViruDaya.in`;
  userCodename = codename;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    startChat();
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      await createUserWithEmailAndPassword(auth, email, password);
      startChat();
    } else {
      loginMsg.textContent = "❌ Login error: " + error.message;
    }
  }
};

function startChat() {
  document.getElementById("loginSection").classList.add("hidden");
  document.getElementById("chatSection").classList.remove("hidden");

  Notification.requestPermission().then(p => {
    if (p === "granted") {
      console.log("🔔 Notification permission granted");
    }
  });

  updateRoomHeader();
  listenForMessages();
}

function encode(text) {
  return text.split('').map(char => {
    if (/[A-Z]/.test(char)) return String.fromCharCode(155 - char.charCodeAt(0));
    if (/[a-z]/.test(char)) return String.fromCharCode(219 - char.charCodeAt(0));
    return char;
  }).join('');
}

function censor(text) {
  const badWords = ['fuck', 'shit', 'bitch', 'bastard', 'asshole'];
  let result = text;

  badWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    result = result.replace(regex, match => '#'.repeat(match.length));
  });

  return result;
}

window.sendMessage = function () {
  const rawText = messageInput.value.trim();
  if (!rawText) return;

  const messageData = {
    from: userCodename,
    text: rawText,
    time: Date.now()
  };

  push(ref(db, `rooms/${roomCode}/messages`), messageData);
  messageInput.value = '';
};

function listenForMessages() {
  const roomRef = ref(db, `rooms/${roomCode}/messages`);
  allMessages = [];
  chatDisplay.innerHTML = "";

  onChildAdded(roomRef, snapshot => {
    const msg = snapshot.val();
    displayMessage(msg);
  });
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' });
  return `${hours}:${minutes} - ${day} ${month}`;
}

function displayMessage(msg) {
  allMessages.push(msg);
  updateDisplayedMessages();

  if (document.hidden && Notification.permission === "granted") {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(`💬 ${msg.from}`, {
        body: censor(msg.text),
        icon: "logo.png",
        vibrate: [100, 50, 100],
        data: { url: location.href }
      });
    });
  }
}

window.toggleMode = function () {
  isEncoded = !isEncoded;
  modeBtn.textContent = isEncoded ? "Decode" : "Encode";
  updateDisplayedMessages();
};

function updateDisplayedMessages() {
  chatDisplay.innerHTML = "";
  allMessages.forEach(msg => {
    const clean = censor(isEncoded ? encode(msg.text) : msg.text);
    const timestamp = formatTime(msg.time);
    const line = document.createElement("div");
    line.className = "chat-line";
    line.innerHTML = `$<b>${msg.from}</b> [${timestamp}] ~ ${clean}`;
    chatDisplay.appendChild(line);
  });
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

function updateRoomHeader() {
  const header = `Room: ${roomCode} ${roomPassword ? `(🔐 ${roomPassword})` : "(🔓 Public)"}`;
  roomDisplay.textContent = header;
}
