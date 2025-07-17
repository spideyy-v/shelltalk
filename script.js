alert("Hello!");
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
  import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut
  } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
  import {
    getDatabase,
    ref,
    push,
    onChildAdded,
    get,
    set
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

  let roomCode = "";
  let roomRef;
  let userCodename = "";
  let hasListener = false;
  let allMessages = [];

  const codenameInput = document.getElementById("codename");
  const passwordInput = document.getElementById("password");
  const roomCodeInput = document.getElementById("roomCode");
  const roomPasswordInput = document.getElementById("roomPassword");
  const loginMsg = document.getElementById("loginMsg");

  window.login = async function () {
    const codename = codenameInput.value.trim();
    const password = passwordInput.value.trim();
    const inputRoomCode = roomCodeInput.value.trim();
    const roomPassword = roomPasswordInput.value.trim();

    if (!codename || password.length !== 6 || !/^\d+$/.test(password)) {
      loginMsg.textContent = "❌ Invalid codename or password (6-digit number)";
      return;
    }

    const email = `${codename}@ViruDaya.in`;
    userCodename = codename;
    roomCode = inputRoomCode || generateRoomCode();
    const roomPassToUse = roomPassword || generatePassword();
    roomRef = ref(db, `rooms/${roomCode}`);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      await validateOrCreateRoom(roomPassToUse);
      startChat();
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          await validateOrCreateRoom(roomPassToUse);
          startChat();
        } catch (err) {
          loginMsg.textContent = "❌ Registration error: " + err.message;
        }
      } else {
        loginMsg.textContent = "❌ Login error: " + error.message;
      }
    }
  };

  async function validateOrCreateRoom(pass) {
    const roomPasswordRef = ref(db, `rooms/${roomCode}/password`);
    const snapshot = await get(roomPasswordRef);
    if (snapshot.exists()) {
      if (snapshot.val() !== pass) throw new Error("❌ Wrong room password");
    } else {
      await set(roomPasswordRef, pass);
    }
  }

  async function startChat() {
  document.getElementById("loginSection").classList.add("hidden");
  document.getElementById("chatSection").classList.remove("hidden");
  document.getElementById("roomCodeDisplay").textContent = roomCode;

  const roomPassSnapshot = await get(ref(db, `rooms/${roomCode}/password`));
  if (roomPassSnapshot.exists()) {
    document.getElementById("roomPasswordDisplay").textContent = roomPassSnapshot.val();
  }

  listenForMessages();
}

  function listenForMessages() {
    if (hasListener) return;
    hasListener = true;

    onChildAdded(ref(db, `rooms/${roomCode}/messages`), (snapshot) => {
      const msg = snapshot.val();
      const exists = allMessages.some(m => m.time === msg.time && m.text === msg.text && m.from === msg.from);
      if (!exists) displayMessage(msg);
    });
  }

  const chatDisplay = document.getElementById("chatDisplay");
  const messageInput = document.getElementById("messageInput");
  const modeBtn = document.getElementById("modeBtn");
  let isEncoded = true;

  function encode(text) {
    return text.split('').map(char => {
      if (/[A-Z]/.test(char)) return String.fromCharCode(155 - char.charCodeAt(0));
      if (/[a-z]/.test(char)) return String.fromCharCode(219 - char.charCodeAt(0));
      return char;
    }).join('');
  }

  function censor(text) {
    const badWords = ["fuck", "bitch", "shit", "asshole", "bastard", "slut", "dick", "pussy"];
    badWords.forEach(word => {
      const regex = new RegExp(word, "gi");
      text = text.replace(regex, (match) => "#".repeat(match.length));
    });
    return text;
  }

  window.sendMessage = function () {
    const rawText = messageInput.value.trim();
    if (!rawText) return;
    const messageData = { from: userCodename, text: rawText, time: Date.now() };
    push(ref(db, `rooms/${roomCode}/messages`), messageData);
    messageInput.value = '';
  };

  function updateDisplayedMessages() {
    chatDisplay.innerHTML = "";
    allMessages.forEach(msg => {
      const rawText = isEncoded ? encode(msg.text) : msg.text;
      const displayText = censor(rawText);
      const timestamp = formatTime(msg.time);
      const line = document.createElement("div");
      line.className = "chat-line";
      line.innerHTML = `$<b>${msg.from}</b>[${timestamp}] ~ ${displayText}`;
      chatDisplay.appendChild(line);
    });
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
  }

  function displayMessage(msg) {
  allMessages.push(msg);
  updateDisplayedMessages();
  if (msg.from !== userCodename) {
    notifyUser(`💬 ${msg.from}`, msg.text);
  }
}

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    return `${hours}:${minutes} - ${day} ${month}`;
  }

  window.toggleMode = function () {
    isEncoded = !isEncoded;
    modeBtn.textContent = isEncoded ? "°…°" : "°3°";
    updateDisplayedMessages();
  };

  window.logout = function () {
    signOut(auth).then(() => {
      userCodename = "";
      allMessages = [];
      hasListener = false;
      chatDisplay.innerHTML = "";
      document.getElementById("chatSection").classList.add("hidden");
      document.getElementById("loginSection").classList.remove("hidden");
    });
  };

  window.createRoom = async function () {
  const newRoomCode = generateRoomCode();
  const defaultPass = generatePassword();
  roomCode = newRoomCode;
  roomRef = ref(db, `rooms/${roomCode}`);

  try {
    await set(ref(db, `rooms/${roomCode}/password`), defaultPass);
    allMessages = [];
    chatDisplay.innerHTML = "";
    hasListener = false;
    document.getElementById("roomCodeDisplay").textContent = roomCode;
    document.getElementById("roomPasswordDisplay").textContent = defaultPass;
    listenForMessages();
    alert(`✅ New Room Created!\nCode: ${roomCode}\nPassword: ${defaultPass}`);
  } catch (err) {
    alert("❌ Error creating room: " + err.message);
  }
};

window.joinRoom = async function () {
  const code = prompt("🔐 Enter Room Code:");
  if (!code) return;

  const password = prompt("🔑 Enter Room Password:");
  if (!password) return;

  try {
    const passwordRef = ref(db, `rooms/${code}/password`);
    const snapshot = await get(passwordRef);

    if (!snapshot.exists()) {
      alert("❌ Room not found.");
      return;
    }

    if (snapshot.val() !== password) {
      alert("❌ Incorrect password.");
      return;
    }

    roomCode = code;
    roomRef = ref(db, `rooms/${roomCode}`);
    allMessages = [];
    chatDisplay.innerHTML = "";
    hasListener = false;

    document.getElementById("roomCodeDisplay").textContent = roomCode;
    document.getElementById("roomPasswordDisplay").textContent = password;

    listenForMessages();
    alert(`✅ Joined Room: ${roomCode}`);
  } catch (err) {
    alert("❌ Failed to join room: " + err.message);
  }
};

  function generateRoomCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@&#";
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
  
function generatePassword() {
  return String(Math.floor(1000 + Math.random() * 9000)); // 4-digit numeric
}
  

  onAuthStateChanged(auth, (user) => {
    if (user) {
      userCodename = user.email.split('@')[0];
      roomCode = roomCodeInput.value.trim() || generateRoomCode();
      roomRef = ref(db, `rooms/${roomCode}`);
      document.getElementById("roomCodeDisplay").textContent = roomCode;
      startChat();
    }
  });
  
  // Service Worker Registration
if ('serviceWorker' in navigator && 'Notification' in window) {
  navigator.serviceWorker.register('sw.js').then(() => {
    console.log('✅ Service Worker registered');
  });

  Notification.requestPermission().then(permission => {
    if (permission !== 'granted') {
      console.warn("❌ Notification permission not granted");
    }
  });
}

// Send Notification Function
function notifyUser(title, message) {
  if (Notification.permission === 'granted') {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(title, {
        body: message,
        icon: 'logo.png',
        badge: 'logo.png',
        data: {
          url: location.href
        }
      });
    });
  }
}
// Show notification popup when page loads
window.addEventListener('load', () => {
  if ('Notification' in window && Notification.permission !== 'granted') {
    document.getElementById('notifyPopup').style.display = 'flex';
  }
});

document.getElementById('allowNotifyBtn').addEventListener('click', () => {
  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      alert("✅ Notifications enabled!");
    } else {
      alert("❌ Notifications denied.");
    }
    document.getElementById('notifyPopup').style.display = 'none';
  });
});

document.getElementById('denyNotifyBtn').addEventListener('click', () => {
  document.getElementById('notifyPopup').style.display = 'none';
});
