//main.js
import './style.css';
import * as sdk from '@d-id/client-sdk';

/**
 * Remplacez ces deux variables par vos propres identifiants
 * — ou chargez-les via des variables d’environnement lors du build.
 */
const agentId = 'agt_5N-mOCiJ';
const auth    = {
  type: 'key',
  clientKey: 'Z29vZ2xlLW9hdXRoMnwxMDgyMTQyNDYwODUxNzY4NTE0MDI6Z3dDWVJKVElRaEJPRmEzUlVEVFcx'
};

// Sélecteurs DOM
const videoElement   = document.querySelector('#avatarVideo');
const textArea       = document.querySelector('#textArea');
const langSelect     = document.querySelector('#langSelect');
const answers        = document.querySelector('#answers');
const chatBtn        = document.querySelector('#chatButton');
const speakBtn       = document.querySelector('#speakButton');
const speechBtn      = document.querySelector('#speechButton');
const reconnectBtn   = document.querySelector('#reconnectButton');
const connectionLbl  = document.querySelector('#connectionLabel');
const hiddenPanel    = document.querySelector('#hidden');
const hiddenTitle    = document.querySelector('#hidden_h2');
const fullscreenBtn  = document.querySelector('#fullscreenButton');
const app            = document.querySelector('#app');

let srcObject;               // bufferise le MediaStream
let agentManager;            // instance retournée par le SDK
let recognizing = false;     // état STT (géré dans webSpeechAPI.js)

/* ========================================================= */
/* 1. Callbacks SDK                                           */
/* ========================================================= */
const callbacks = {
  /** MediaStream prêt : on branche sur <video> */
  onSrcObjectReady(stream) {
    srcObject = stream;
  videoElement.srcObject = stream;
  videoElement.muted = true;     // Autorise l’autoplay
  videoElement.play().catch(console.warn);
  // Laissez ½ s puis réactivez le son
  setTimeout(() => { videoElement.muted = false; }, 500);
  },

  /** Le flux passe en idle ou live */
  onVideoStateChange(state) {
    if (state === 'STOP') {
        srcObject?.getTracks().forEach(t => t.stop()); // libère mémoire
        srcObject = null;
        videoElement.srcObject = null;
        videoElement.src = agentManager.agent.presenter.idle_video;
        videoElement.play().catch(() => {});
    } else { // START
        // nouveau stream → onSrcObjectReady sera rappelé ;
        // on laisse ce callback ré-attacher le flux
    }
  },

  /** États WebRTC */
  onConnectionStateChange(state) {
    console.debug('Connection state:', state);

    switch (state) {
      case 'connecting':
        connectionLbl.textContent = 'Connecting…';
        uiSetDisabled(true);
        break;

      case 'connected':
        connectionLbl.textContent = 'Online';
        uiSetDisabled(false);
        // ↳ <Enter> déclenche l’envoi de chat
        textArea.addEventListener('keypress', handleEnter);
        break;

      case 'disconnected':
      case 'closed':
        connectionLbl.textContent = '';
        hiddenTitle.textContent = `${agentManager.agent.preview_name} Disconnected`;
        hiddenPanel.hidden = false;
        uiSetDisabled(true);
        textArea.removeEventListener('keypress', handleEnter);
        break;

      default:
        break;
    }
  },

  

  /** Nouveaux messages (assistant / user / system) */
  onNewMessage(messages, type) {
    const last = messages.at(-1);
    if (!last) return;

    const stamp = new Date().toLocaleTimeString();
    if (last.role === 'assistant' && type === 'answer' && messages.length > 1) {
      answers.insertAdjacentHTML(
        'beforeend',
        `${stamp} – [assistant] : ${last.content}
         <button data-rate="1"  data-id="${last.id}">+</button>
         <button data-rate="-1" data-id="${last.id}">−</button><br>`
      );
    } else {
      answers.insertAdjacentHTML(
        'beforeend',
        `${stamp} – [${last.role}] : ${last.content}<br>`
      );
    }
    answers.scrollTop = answers.scrollHeight;
  },

  /** Gestion d’erreurs */
  onError(err, data) {
    console.error('D-ID error', err, data);
    connectionLbl.innerHTML = '<span style="color:#c00">Something went wrong</span>';
  }
};

const streamOptions = { compatibilityMode: 'auto', streamWarmup: true };

/* ========================================================= */
/* 2. Initialisation SDK                                      */
/* ========================================================= */
(async () => {
  try {
    agentManager = await sdk.createAgentManager(agentId, {
      auth,
      callbacks,
      streamOptions
    });

    // Meta UI
    document.querySelector('#previewName').textContent =
      agentManager.agent.preview_name;
    videoElement.style.backgroundImage =
      `url(${agentManager.agent.presenter.source_url})`;

    await agentManager.connect();
  } catch (e) {
    console.error(e);
    alert(
      'Impossible de créer la connexion. Vérifiez vos identifiants "agentId" et "clientKey".'
    );
  }
})();

/* ========================================================= */
/* 3. Fonctions Agent                                         */
/* ========================================================= */
function speak() {
  const val = textArea.value.trim();
  console.log('Speak called with:', val);
  if (val.length < 3) return alert('≥3 caractères nécessaires');
  agentManager.speak({ type: 'text', input: val })
    .catch(e => console.error('Speak error', e));
}

function chat() {
  const text = textArea.value.trim();
  if (!text) return;

  agentManager.chat(text);
  textArea.value = '';
  connectionLbl.textContent = 'Thinking…';
}

function rate(id, score) {
  agentManager.rate(id, score).catch(console.error);
}

function reconnect() {
  agentManager.reconnect().catch(console.error);
}

/* ========================================================= */
/* 4. UI helpers                                              */
/* ========================================================= */
function uiSetDisabled(state) {
  for (const el of [chatBtn, speakBtn, langSelect, speechBtn])
    state ? el.setAttribute('disabled', 'true') : el.removeAttribute('disabled');
}

function handleEnter(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    chat();
  }
}

/* ========================================================= */
/* 5. Plein écran                                             */
/* ========================================================= */
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    app.requestFullscreen().catch(console.error);
  } else {
    document.exitFullscreen();
  }
}

document.addEventListener('fullscreenchange', () => {
  app.classList.toggle('fullscreen', !!document.fullscreenElement);
});

/* ========================================================= */
/* 6. Écouteurs                                               */
/* ========================================================= */
chatBtn.addEventListener('click', chat);
speakBtn.addEventListener('click', speak);
reconnectBtn.addEventListener('click', reconnect);
fullscreenBtn.addEventListener('click', toggleFullscreen);

// Délégation pour les boutons de rating dans #answers
answers.addEventListener('click', (e) => {
  if (e.target.dataset.rate) {
    const { id } = e.target.dataset;
    const score = Number(e.target.dataset.rate);
    rate(id, score);
  }
});
