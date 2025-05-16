/* webSpeechAPI.js — version sans doublons */
(() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return console.warn('SpeechRecognition API indisponible.');

  const recognition   = new SpeechRecognition();
  const speechBtn     = document.querySelector('#speechButton');
  const textArea      = document.querySelector('#textArea');
  const chatBtn       = document.querySelector('#chatButton');
  const speakBtn      = document.querySelector('#speakButton');
  const langSelect    = document.querySelector('#langSelect');

  let recognizing     = false;
  let finalTranscript = '';

  /* configuration */
  recognition.continuous      = true;               // écoute longue :contentReference[oaicite:2]{index=2}
  recognition.interimResults  = true;               // permet l’affichage temps réel :contentReference[oaicite:3]{index=3}
  recognition.maxAlternatives = 1;

  /* résultats */
  recognition.onresult = (evt) => {
    let interimTranscript = '';
    for (let i = evt.resultIndex; i < evt.results.length; ++i) {
      const res = evt.results[i];
      if (res.isFinal) {
        finalTranscript += res[0].transcript + ' ';
      } else {
        interimTranscript += res[0].transcript;
      }
    }
    /* écrase le champ plutôt que d’y concaténer */
    textArea.value = finalTranscript + interimTranscript;
  };

  /* gestion des erreurs et arrêt */
  recognition.onerror = (e) => { console.error('Speech error', e.error); reset(); };
  recognition.onend   = reset;

  function reset() {
    recognizing = false;
    speechBtn.textContent = '🎤';
    chatBtn.disabled = speakBtn.disabled = false;
    interimTranscript = '';      // remet la variable zéro
  }

  function toggleStartStop() {
    recognition.lang = langSelect.value.replace('_', '-');
    if (recognizing) return recognition.stop();

    try {
      recognition.start();
      recognizing = true;
      speechBtn.textContent = '⏹';
      chatBtn.disabled = speakBtn.disabled = true;
      finalTranscript = '';      // vide le buffer à chaque nouvelle dictée
    } catch (err) {
      console.error('Speech start error', err);
      alert('Impossible de démarrer la reconnaissance vocale : ' + err.message);
    }
  }

  speechBtn.addEventListener('click', toggleStartStop);
})();
