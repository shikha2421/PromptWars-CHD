/**
 * SAHAYAK AI (सहायक) - Friendly Application Controller
 * High Reliability Audio Streaming + Instant Visual Workflows
 */

// Global State
const state = {
  currentLang: 'hi',
  isSpeaking: false,
  isListening: false,
  lastSpokenText: "नमस्ते साथी! मैं आपका सह-चालक AI सहायक हूँ। नीचे माइक दबाइए और बोलिए!",
  selectedFinePlatform: 'Swiggy',
  selectedFineReason: 'rain'
};

// Global Audio Player
let activeAudioPlayer = new Audio();
let audioQueue = [];
let isQueuePlaying = false;

// Script Language Detection for Indian Regional Scripts
function detectScriptLanguage(text) {
  if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Devanagari (Hindi, Marathi)
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
  if (/[\u0980-\u09FF]/.test(text)) return 'bn'; // Bengali
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn'; // Kannada
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml'; // Malayalam
  return state.currentLang || 'hi';
}

// Split into sentences for smooth streaming
function splitIntoAudioChunks(text) {
  const clean = text
    .replace(/[#*_`]/g, '')
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
    .trim();

  const rawParts = clean.split(/([।\.\?!;\n]+)/);
  const chunks = [];
  let current = '';

  for (let i = 0; i < rawParts.length; i++) {
    const part = rawParts[i].trim();
    if (!part) continue;

    if (current.length + part.length < 130) {
      current += (current ? ' ' : '') + part;
    } else {
      if (current) chunks.push(current);
      current = part;
    }
  }
  if (current) chunks.push(current);

  return chunks.length > 0 ? chunks : [clean.substring(0, 140)];
}

function stopSpeaking() {
  if (activeAudioPlayer) {
    activeAudioPlayer.pause();
    activeAudioPlayer.currentTime = 0;
  }
  audioQueue = [];
  isQueuePlaying = false;
  state.isSpeaking = false;

  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  const iconBox = document.getElementById('speakerIconBox');
  if (iconBox) iconBox.classList.remove('speaking');
}

function playNextAudioChunk(detectedLang) {
  if (audioQueue.length === 0) {
    isQueuePlaying = false;
    state.isSpeaking = false;
    const iconBox = document.getElementById('speakerIconBox');
    if (iconBox) iconBox.classList.remove('speaking');
    return;
  }

  isQueuePlaying = true;
  state.isSpeaking = true;
  const iconBox = document.getElementById('speakerIconBox');
  if (iconBox) iconBox.classList.add('speaking');

  const chunk = audioQueue.shift();
  const ttsUrl = `/tts?tl=${detectedLang}&q=${encodeURIComponent(chunk)}`;

  activeAudioPlayer.src = ttsUrl;
  activeAudioPlayer.playbackRate = 1.0;

  activeAudioPlayer.onended = () => {
    playNextAudioChunk(detectedLang);
  };

  activeAudioPlayer.onerror = () => {
    fallbackBrowserSpeech(chunk, detectedLang, () => {
      playNextAudioChunk(detectedLang);
    });
  };

  activeAudioPlayer.play().catch(() => {
    fallbackBrowserSpeech(chunk, detectedLang, () => {
      playNextAudioChunk(detectedLang);
    });
  });
}

function fallbackBrowserSpeech(text, lang, onDone) {
  if (!window.speechSynthesis) {
    if (onDone) onDone();
    return;
  }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === 'en' ? 'en-IN' : (lang === 'hi' ? 'hi-IN' : lang);
  u.rate = 0.95;
  u.onend = () => { if (onDone) onDone(); };
  u.onerror = () => { if (onDone) onDone(); };
  window.speechSynthesis.speak(u);
}

// Master Speech Narration Function
function speakText(text, explicitLang = null) {
  if (!text || !text.trim()) return;

  stopSpeaking();
  state.lastSpokenText = text;

  const detectedLang = explicitLang || detectScriptLanguage(text);
  updateSoundboxDisplay(text, detectedLang);

  audioQueue = splitIntoAudioChunks(text);
  playNextAudioChunk(detectedLang);
}

function updateSoundboxDisplay(text, lang) {
  const label = document.getElementById('soundboxLabel');
  const txt = document.getElementById('soundboxText');

  const langNames = {
    hi: 'हिंदी',
    ta: 'தமிழ்',
    te: 'తెలుగు',
    bn: 'বাংলা',
    kn: 'ಕನ್ನಡ',
    en: 'English'
  };

  const tag = langNames[lang] || 'आवाज़';
  if (label) label.textContent = `सहायक साथी बोल रहा है [${tag}]:`;
  if (txt) txt.textContent = `"${text.substring(0, 110)}${text.length > 110 ? '...' : ''}"`;
}

// ============================================================================
// 2. MICROPHONE & SPEECH RECOGNITION (PUSH TO TALK)
// ============================================================================
let recognition = null;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'hi-IN';

  recognition.onstart = () => {
    state.isListening = true;
    const btn = document.getElementById('mainMicBtn');
    const callout = document.getElementById('micCallout');
    if (btn) btn.classList.add('listening');
    if (callout) callout.textContent = "🔴 सुन रहा हूँ... बोलिए";
  };

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    handleVoiceIntent(transcript);
  };

  recognition.onend = () => { resetMainMic(); };
  recognition.onerror = () => { resetMainMic(); };
}

function resetMainMic() {
  state.isListening = false;
  const btn = document.getElementById('mainMicBtn');
  const callout = document.getElementById('micCallout');
  if (btn) btn.classList.remove('listening');
  if (callout) callout.textContent = state.currentLang === 'hi' ? "माइक दबाएं और बोलें" : "Tap & Speak";
}

function toggleMainMic() {
  if (recognition) {
    if (state.isListening) {
      recognition.stop();
    } else {
      try {
        let recLang = 'hi-IN';
        if (state.currentLang === 'en') recLang = 'en-IN';
        else if (state.currentLang === 'ta') recLang = 'ta-IN';
        else if (state.currentLang === 'te') recLang = 'te-IN';
        else if (state.currentLang === 'bn') recLang = 'bn-IN';
        recognition.lang = recLang;
        recognition.start();
      } catch (err) {
        simulateVoiceFallback();
      }
    }
  } else {
    simulateVoiceFallback();
  }
}

function simulateVoiceFallback() {
  const btn = document.getElementById('mainMicBtn');
  const callout = document.getElementById('micCallout');
  btn.classList.add('listening');
  callout.textContent = "🔴 सुन रहा हूँ...";

  const samples = [
    "Barish me order cancel hua ₹150 penalty kat gayi",
    "Customer ne galat complaint ki ID block ho gayi",
    "Aaj 1500 kamaye petrol kaat ke kitna bacha?",
    "e-Shram card se 2 lakh bima kaise milega?"
  ];
  const query = samples[Math.floor(Math.random() * samples.length)];

  setTimeout(() => {
    resetMainMic();
    handleVoiceIntent(query);
  }, 1000);
}

// ============================================================================
// 3. VOICE INTENT & ANSWERS
// ============================================================================
const voiceIntentAnswers = {
  fine: {
    title: "जुर्माना वापसी (Fine Refund)",
    spoken: "साथी, बारिश या जाम में ऑर्डर कैंसिल होने पर पेनाल्टी लगाना गलत है। कंपनी के क्लॉज 4 के तहत यह पैसा वापस मिलेगा। नीचे दिए गए बटन से अभी WhatsApp पर अपील भेजें!",
    cardHtml: `
      <p><strong>बारिश या खराबी पर कटा जुर्माना 100% वापस मिलेगा:</strong></p>
      <p>कंपनी के नियम <em>(Clause 4 - Weather Exception)</em> के अनुसार खराब मौसम में डिलीवरी पार्टनर पर जुर्माना लगाना मना है।</p>
    `,
    btnLabel: "🛑 अपील पत्र बनाएं और WhatsApp पर भेजें",
    modal: "modalFine"
  },
  ban: {
    title: "आईडी अनब्लॉक (ID Unblock)",
    spoken: "साथी, बिना जांच के और बिना 14 दिन के नोटिस के आईडी बंद करना कानूनन गलत है। हम कंपनी के ग्रीवेंस ऑफिसर को अभी अनब्लॉक करने का नोटिस भेज सकते हैं।",
    cardHtml: `
      <p><strong>बिना नोटिस आईडी बंद करना गलत है:</strong></p>
      <p>गीग वर्कर कानून के तहत कंपनी को आईडी बंद करने से पहले 14 दिन का नोटिस देना अनिवार्य है। तुरंत अपील भेजें।</p>
    `,
    btnLabel: "🛑 आईडी चालू कराने की अपील भेजें",
    modal: "modalFine"
  },
  earning: {
    title: "आज की असली बचत (Net Earning)",
    spoken: "साथी, अगर आपने आज ₹1500 कमाए हैं और ₹400 का पेट्रोल लगा है, तो आपकी शुद्ध बचत ₹1100 है। पूरा हिसाब देखने के लिए नीचे टैप करें।",
    cardHtml: `
      <p><strong>असली कमाई = कुल रुपये - पेट्रोल का खर्चा</strong></p>
      <p>₹1,500 में से ₹400 पेट्रोल निकालने के बाद आपकी जेब में ₹1,100 (लगभग ₹137 प्रति घंटा) शुद्ध बचत बची है।</p>
    `,
    btnLabel: "💰 पूरा हिसाब कैलकुलेटर में देखें",
    modal: "modalEarning"
  },
  insurance: {
    title: "₹2 लाख मुफ्त बीमा (e-Shram)",
    spoken: "ई-श्रम कार्ड पर हर गिग वर्कर को दो लाख रुपये का दुर्घटना बीमा बिल्कुल मुफ्त मिलता है। इसके लिए सिर्फ आधार कार्ड और बैंक खाते से जन सेवा केंद्र पर जाकर फ्री रजिस्ट्रेशन कराएं।",
    cardHtml: `
      <p><strong>e-Shram कार्ड के फायदे:</strong></p>
      <p>• ₹2,00,000 का मुफ्त एक्सीडेंट बीमा<br>• कोई फीस नहीं, 100% फ्री सरकारी योजना<br>• केवल आधार कार्ड और बैंक पासबुक चाहिए</p>
    `,
    btnLabel: "🏛️ सरकारी योजनाएं देखें",
    modal: "modalScheme"
  }
};

function handleVoiceIntent(query) {
  let matched = voiceIntentAnswers.fine;
  const q = query.toLowerCase();

  if (q.includes('kamai') || q.includes('earning') || q.includes('petrol') || q.includes('bacha') || q.includes('rupaye')) {
    matched = voiceIntentAnswers.earning;
  } else if (q.includes('ban') || q.includes('block') || q.includes('rating') || q.includes('id')) {
    matched = voiceIntentAnswers.ban;
  } else if (q.includes('shram') || q.includes('bima') || q.includes('insurance') || q.includes('yojana')) {
    matched = voiceIntentAnswers.insurance;
  }

  const card = document.getElementById('aiLiveCard');
  const content = document.getElementById('liveCardContent');
  const footer = document.getElementById('liveCardFooter');

  content.innerHTML = matched.cardHtml;
  footer.innerHTML = `
    <button class="btn-giant-action" onclick="openLaymanModal('${matched.modal}')">
      ${matched.btnLabel}
    </button>
  `;
  card.style.display = 'flex';
  card.scrollIntoView({ behavior: 'smooth' });

  speakText(matched.spoken);

  document.getElementById('listenAnswerBtn').onclick = () => {
    speakText(matched.spoken);
  };
}

// ============================================================================
// 4. MODAL 1: FINE REFUND & DISPUTE LETTER
// ============================================================================
function generateFineAppeal() {
  const platform = state.selectedFinePlatform;
  const reason = state.selectedFineReason;
  const amt = document.getElementById('fineAmountInput').value || "150";

  let reasonDesc = "भारी बारिश और जलभराव के कारण डिलीवरी में देरी हुई थी।";
  if (reason === 'puncture') reasonDesc = "बाइक का टायर पंचर हो गया था, सपोर्ट को समय पर सूचित किया गया था।";
  else if (reason === 'society') reasonDesc = "कस्टमर की सोसायटी के गेट पर सुरक्षा गार्ड ने वाहन अंदर नहीं जाने दिया।";
  else if (reason === 'customer') reasonDesc = "कस्टमर ने बार-बार कॉल करने पर भी फोन नहीं उठाया।";

  const easyText = `हमने ${platform} की ग्रीवेंस टीम को पत्र में लिखा है कि: "${reasonDesc}". कंपनी के नियमों के तहत यह प्राकृतिक मजबूरी का मामला है। अतः ₹${amt} का काटा गया जुर्माना तुरंत वापस मिले और आईडी से स्ट्राइक हटाई जाए।`;

  const formalNotice = `To: Partner Grievance Officer, ${platform} India
Date: ${new Date().toLocaleDateString('en-IN')}
Subject: Appeal for Reversal of ₹${amt} Penalty - Partner ID #78210

Dear Team,
I am submitting a formal appeal regarding the deduction of ₹${amt} from my partner wallet.
Reason for Delay/Cancellation: ${reasonDesc}

Under the standard Partner Agreement Terms (Clause 4: Force Majeure & Severe Weather Precaution), penalties cannot be imposed when execution is disrupted by circumstances beyond partner control.

I respectfully request the immediate reimbursement of ₹${amt} and clearance of performance record.

Sincerely,
Registered Delivery / Driver Partner (#78210)`;

  document.getElementById('fineSimpleSummary').innerHTML = `<strong>सरल शब्दों में:</strong> ${easyText}`;
  document.getElementById('fineFormalLetter').textContent = formalNotice;

  const waMsg = encodeURIComponent(`*Appeal to ${platform} Support*\n\n${formalNotice}\n\n(Drafted via SahayakAI)`);
  document.getElementById('sendWhatsAppAppealBtn').href = `https://wa.me/?text=${waMsg}`;
  document.getElementById('sendEmailAppealBtn').href = `mailto:grievance-support@${platform.toLowerCase()}.com?subject=Penalty%20Appeal%20₹${amt}&body=${encodeURIComponent(formalNotice)}`;

  const resultBox = document.getElementById('fineAppealResult');
  resultBox.style.display = 'flex';
  resultBox.scrollIntoView({ behavior: 'smooth' });

  speakText(easyText);

  document.getElementById('listenFineAppealBtn').onclick = () => {
    speakText(easyText);
  };
}

// ============================================================================
// 5. MODAL 2: 3-INPUT EARNING CALCULATOR
// ============================================================================
function calculateNetEarnings() {
  const gross = parseFloat(document.getElementById('calcGrossInput').value) || 0;
  const fuel = parseFloat(document.getElementById('calcFuelInput').value) || 0;
  const hours = parseFloat(document.getElementById('calcHoursInput').value) || 1;

  const net = Math.max(0, gross - fuel);
  const hourly = (net / Math.max(1, hours)).toFixed(2);

  document.getElementById('netAmountText').textContent = `₹${net.toLocaleString('en-IN')}`;
  document.getElementById('netHourlyText').textContent = `यानी लगभग ₹${hourly} प्रति घंटा (${hours} घंटे काम)`;

  const advice = `साथी, आज आपने ₹${gross.toLocaleString('en-IN')} का काम किया, जिसमें से ₹${fuel.toLocaleString('en-IN')} का पेट्रोल लगा। आपकी शुद्ध बचत ₹${net.toLocaleString('en-IN')} बची है (यानी लगभग ₹${hourly} रुपये प्रति घंटा)।`;
  document.getElementById('netVoiceSummaryText').textContent = advice;

  speakText(advice);

  document.getElementById('readEarningVoiceBtn').onclick = () => {
    speakText(advice);
  };
}

// ============================================================================
// 6. MODAL 3: NOTICE & MULTILINGUAL SLIP READER
// ============================================================================
const sampleSmsData = {
  fine_sms: {
    lang: 'hi',
    text: "Penalty of ₹150 applied on order #9821 due to delivery delay.",
    p1: "कंपनी ने ऑर्डर लेट होने पर आपके ₹150 काट लिए हैं।",
    p2: "अगर भारी बारिश, ट्रैफिक जाम या बाइक पंचर हुई थी, तो यह जुर्माना गलत है।",
    p3: "कंपनी को नीचे दिए गए बटन से अपील भेजें और पैसे वापस मांगें।",
    speech: "कंपनी ने देर होने पर आपके ₹150 काट लिए हैं। अगर बारिश या जाम था तो यह जुर्माना गलत है। नीचे दिए गए बटन से तुरंत अपील भेजें।"
  },
  id_sms: {
    lang: 'hi',
    text: "Your delivery account is temporarily restricted under Clause 8.2.",
    p1: "कंपनी के कंप्यूटर ने आपकी बाइक का GPS लोकेशन संदिग्ध मानकर आपकी आईडी 2 घंटे के लिए बंद कर दी है।",
    p2: "फोन गर्म होने या नेटवर्क जाने पर ऐसा गलत अलार्म अक्सर आ जाता है।",
    p3: "तुरंत आईडी बहाल कराने का अपील पत्र सपोर्ट टीम को भेजें।",
    speech: "जीपीएस में गड़बड़ी के कारण आपकी आईडी अस्थायी रूप से रोकी गई है। घबराएं नहीं, तुरंत अपील भेजकर इसे चालू कराएं।"
  },
  tds_sms: {
    lang: 'hi',
    text: "TDS 1% has been withheld under Section 194-O.",
    p1: "कंपनी ने सरकारी नियम (Section 194O) के तहत आपकी कमाई से 1% टैक्स काटकर सरकार में जमा किया है।",
    p2: "यह कोई जुर्माना नहीं है! यदि आपकी साल की कमाई 7 लाख से कम है, तो यह पैसा आपको वापस मिल सकता है।",
    p3: "साल के अंत में फ्री जीरो-टैक्स ITR भरकर यह पूरा पैसा वापस पाएं।",
    speech: "यह कोई जुर्माना नहीं है, बल्कि एक प्रतिशत टैक्स कटा है। साल के अंत में यह पूरा पैसा सरकार से वापस लिया जा सकता है।"
  }
};

let activeSmsType = 'fine_sms';

function readSampleLanguage(text) {
  const input = document.getElementById('customSmsInput');
  if (input) input.value = text;
  decodeNotice();
}

function decodeNotice() {
  const custom = document.getElementById('customSmsInput').value.trim();
  let data = sampleSmsData[activeSmsType];

  let speechText = "";
  let detectedLang = 'hi';

  if (custom.length > 2) {
    detectedLang = detectScriptLanguage(custom);
    speechText = custom;

    data = {
      p1: `आपने लिखा है: "${custom}"`,
      p2: "प्लेटफॉर्म के नियमों के तहत कामगार को अपनी सफाई देने और अपील करने का पूरा अधिकार है।",
      p3: "कंपनी के सपोर्ट को लिखित अपील भेजें।",
      speech: custom
    };
  } else {
    speechText = data.speech;
    detectedLang = data.lang || 'hi';
  }

  document.getElementById('decPoint1').textContent = data.p1;
  document.getElementById('decPoint2').textContent = data.p2;
  document.getElementById('decPoint3').textContent = data.p3;

  const box = document.getElementById('decodedNoticeBox');
  box.style.display = 'flex';
  box.scrollIntoView({ behavior: 'smooth' });

  speakText(speechText, detectedLang);

  document.getElementById('readDecodedNoticeBtn').onclick = () => {
    speakText(speechText, detectedLang);
  };
}

// ============================================================================
// 7. MODAL SHEET HELPERS & INITIALIZATION
// ============================================================================
function openLaymanModal(modalId) {
  stopSpeaking();
  const m = document.getElementById(modalId);
  if (m) {
    m.style.display = 'flex';
    m.scrollTop = 0;
  }
}

function closeLaymanModal(modalId) {
  stopSpeaking();
  const m = document.getElementById(modalId);
  if (m) m.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {

  // Main Big Round Mic Tap
  const mainMic = document.getElementById('mainMicBtn');
  if (mainMic) {
    mainMic.addEventListener('click', toggleMainMic);
  }

  // Quick Preset Pills
  document.querySelectorAll('.preset-pill').forEach(pill => {
    pill.addEventListener('click', function () {
      const scenarioKey = this.getAttribute('data-scenario');
      const sc = voiceIntentAnswers[scenarioKey];
      if (sc) {
        handleVoiceIntent(this.innerText);
      }
    });
  });

  // Replay and Stop buttons in Soundbox Bar
  document.getElementById('speakerReplayBtn').addEventListener('click', () => {
    speakText(state.lastSpokenText);
  });

  document.getElementById('speakerStopBtn').addEventListener('click', stopSpeaking);

  // Sunlight Mode Toggle
  document.getElementById('sunlightToggle').addEventListener('click', () => {
    state.sunlightMode = !state.sunlightMode;
    if (state.sunlightMode) {
      document.body.setAttribute('data-theme', 'sunlight');
    } else {
      document.body.removeAttribute('data-theme');
    }
  });

  // Language Dropdown
  document.getElementById('languageSelect').addEventListener('change', function () {
    state.currentLang = this.value;
    const greetings = {
      hi: { text: "नमस्ते साथी! मैं आपका सह-चालक AI सहायक हूँ। नीचे माइक दबाइए और बोलिए!", lang: 'hi' },
      en: { text: "Hello partner! I am your Sahayak AI assistant. Tap the mic below to speak!", lang: 'en' },
      hinglish: { text: "Hello bhai! Main aapka Sahayak AI saathi hoon. Niche mic press karke bolo!", lang: 'hi' },
      ta: { text: "வணக்கம் நண்பரே! நான் உங்கள் சகாயக் AI துணைவன். கீழே உள்ள மைக்கை அழுத்தி பேசுங்கள்!", lang: 'ta' },
      te: { text: "నమస్కారం సోదరా! నేను మీ సహాయక్ AI సహచరుడిని. మాట్లాడటానికి మైక్ నొక్కండి!", lang: 'te' },
      bn: { text: "নমস্কার বন্ধু! আমি আপনার সহায়ক AI সহকারী। কথা বলতে নিচের মাইক টিপুন!", lang: 'bn' }
    };
    const item = greetings[this.value] || greetings.hi;
    speakText(item.text, item.lang);
  });

  // Modal 1: Platform chips
  document.querySelectorAll('#companySelectChips .chip-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#companySelectChips .chip-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      state.selectedFinePlatform = this.getAttribute('data-val');
    });
  });

  // Modal 1: Reason chips
  document.querySelectorAll('#reasonSelectChips .chip-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#reasonSelectChips .chip-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      state.selectedFineReason = this.getAttribute('data-val');
    });
  });

  document.getElementById('btnCreateFineAppeal').addEventListener('click', generateFineAppeal);

  document.getElementById('copyAppealTextBtn').addEventListener('click', () => {
    const txt = document.getElementById('fineFormalLetter').textContent;
    navigator.clipboard.writeText(txt).then(() => {
      alert("अपील पत्र कॉपी हो गया! अब आप इसे कंपनी सपोर्ट में पेस्ट कर सकते हैं।");
    });
  });

  // Modal 2: Run Calculator
  document.getElementById('btnCalculateNet').addEventListener('click', calculateNetEarnings);

  // Modal 3: Sample SMS chips
  document.querySelectorAll('.btn-quick-sms').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.btn-quick-sms').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      activeSmsType = this.getAttribute('data-type');
    });
  });

  document.getElementById('btnDecodeNotice').addEventListener('click', decodeNotice);

  // ---- SOS Emergency — vibration + shake ----
  const sosBtn = document.getElementById('sosFullBtn');
  if (sosBtn) {
    sosBtn.addEventListener('click', () => {
      openLaymanModal('modalSos');
      speakText("आपातकालीन सेवा सक्रिय है। सहायता के लिए तुरंत 112 या 108 पर कॉल करें।", 'hi');
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      sosBtn.classList.add('sos-shake');
      setTimeout(() => sosBtn.classList.remove('sos-shake'), 400);
    });
  }

  document.getElementById('sendDirectSosWhatsapp').addEventListener('click', () => {
    const coords = "रिंग रोड, दिल्ली (Lat: 28.5672, Long: 77.2100)";
    const msg = encodeURIComponent(`🚨 आपातकालीन मदद (EMERGENCY SOS)! मैं सड़क पर हूँ और मुझे तुरंत सहायता चाहिए। मेरी लोकेशन: ${coords}। कृपया तुरंत 112 पर कॉल करें।`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  });

  // ---- Language Pill Buttons ----
  document.querySelectorAll('.lang-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lang-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      state.currentLang = btn.dataset.lang;
      const sel = document.getElementById('languageSelect');
      if (sel) sel.value = state.currentLang;
      if (recognition) {
        const langMap = { hi:'hi-IN', en:'en-IN', ta:'ta-IN', te:'te-IN', bn:'bn-IN', hinglish:'hi-IN' };
        recognition.lang = langMap[state.currentLang] || 'hi-IN';
      }
    });
  });

  // ---- Sunlight Toggle Switch ----
  const sunToggle = document.getElementById('sunlightToggle');
  if (sunToggle) {
    sunToggle.addEventListener('change', () => {
      document.documentElement.dataset.theme = sunToggle.checked ? 'sunlight' : '';
    });
  }

  // ---- Onboarding Carousel (first visit only) ----
  const carousel = document.getElementById('onboardCarousel');
  const nextBtn  = document.getElementById('onboardNextBtn');
  const skipBtn  = document.getElementById('onboardSkipBtn');

  if (carousel && !localStorage.getItem('sahayak_onboard_seen')) {
    carousel.classList.remove('hidden');

    const slideIds   = ['slide0', 'slide1', 'slide2'];
    const narrations = [
      "नीचे बड़ा माइक बटन दबाएं और अपनी परेशानी बताएं। सहायक AI सुनेगा और जवाब देगा।",
      "कटे पैसे वापस पाएं, कमाई देखें, सरकारी बीमा — सब कुछ एक टैप में।",
      "एक्सीडेंट या खतरे में? नीचे लाल SOS बटन दबाएं। 112 और 108 तुरंत मिलेंगे।"
    ];
    let idx = 0;

    const showSlide = i => {
      slideIds.forEach((id, j) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', j !== i);
      });
      ['dot0','dot1','dot2'].forEach((id, j) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('active', j === i);
      });
      speakText(narrations[i], 'hi');
      if (nextBtn) nextBtn.textContent = i === slideIds.length - 1 ? 'समझ गया! ✓' : 'आगे ›';
    };

    showSlide(0);

    nextBtn.addEventListener('click', () => {
      if (idx < slideIds.length - 1) {
        idx++;
        showSlide(idx);
      } else {
        stopSpeaking();
        carousel.classList.add('hidden');
        localStorage.setItem('sahayak_onboard_seen', 'true');
      }
    });

    skipBtn.addEventListener('click', () => {
      stopSpeaking();
      carousel.classList.add('hidden');
      localStorage.setItem('sahayak_onboard_seen', 'true');
    });
  }

  // Initial calculation preview
  calculateNetEarnings();
});

