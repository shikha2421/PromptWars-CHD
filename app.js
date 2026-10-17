/**
 * SAHAYAK AI (सहायक) - Multilingual Audio & Layman Controller
 * Features:
 * 1. High-Fidelity Multilingual TTS Stream (Hindi, Tamil, Telugu, Bengali, Kannada, English)
 * 2. Automatic Script Detection for Any Written / Pasted Multilingual Data
 * 3. Continuous Multi-Sentence Audio Queue Engine
 * 4. 1-Tap Layman Workflows (Fine Dispute, Earning Calc, Scheme Guide, SOS)
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

// Global audio player instance
let activeAudioPlayer = new Audio();
let audioQueue = [];
let isQueuePlaying = false;

// Script Detection
function detectScriptLanguage(text) {
  if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Devanagari (Hindi, Marathi)
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
  if (/[\u0980-\u09FF]/.test(text)) return 'bn'; // Bengali
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn'; // Kannada
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml'; // Malayalam
  return state.currentLang || 'hi';
}

// Split text into readable chunks for streaming
function splitIntoAudioChunks(text) {
  const clean = text
    .replace(/[#*_`]/g, '')
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
    .trim();

  // Split on punctuation (।, ., ?, !, newlines, commas)
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

// Stop any current audio
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

// Play next chunk in queue
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

  activeAudioPlayer.onerror = (e) => {
    console.warn("Audio stream error, falling back to WebSpeech:", e);
    // Fallback to local synthesis if network fails
    fallbackWebSpeech(chunk, detectedLang, () => {
      playNextAudioChunk(detectedLang);
    });
  };

  activeAudioPlayer.play().catch(err => {
    console.warn("Autoplay was prevented or audio failed:", err);
    fallbackWebSpeech(chunk, detectedLang, () => {
      playNextAudioChunk(detectedLang);
    });
  });
}

// Fallback browser synthesis
function fallbackWebSpeech(text, lang, onDone) {
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

// Primary High-Fidelity Multilingual Speech Function
function speakText(text, explicitLang = null) {
  if (!text || !text.trim()) return;

  stopSpeaking();
  state.lastSpokenText = text;

  const detectedLang = explicitLang || detectScriptLanguage(text);

  // Update Visual Subtitle Bar
  updateSubtitleDisplay(text, detectedLang);

  // Prepare Chunks & Start Queue
  audioQueue = splitIntoAudioChunks(text);
  playNextAudioChunk(detectedLang);
}

function updateSubtitleDisplay(text, lang) {
  const bar = document.getElementById('voiceSpeakerBar');
  const title = document.getElementById('speakerTitle');
  const subs = document.getElementById('speakerSubtitles');

  const langNames = {
    hi: 'हिंदी (Hindi)',
    ta: 'தமிழ் (Tamil)',
    te: 'తెలుగు (Telugu)',
    bn: 'বাংলা (Bengali)',
    kn: 'ಕನ್ನಡ (Kannada)',
    en: 'English'
  };

  const currentLangLabel = langNames[lang] || 'आवाज़';

  if (title) title.textContent = `🔊 सहायक बोल रहा है [${currentLangLabel}]:`;
  if (subs) subs.textContent = `"${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`;
  if (bar) bar.style.display = 'flex';
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

  recognition.onend = () => {
    resetMainMic();
  };

  recognition.onerror = () => {
    resetMainMic();
  };
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
        simulateMicFallback();
      }
    }
  } else {
    simulateMicFallback();
  }
}

function simulateMicFallback() {
  const btn = document.getElementById('mainMicBtn');
  const callout = document.getElementById('micCallout');
  btn.classList.add('listening');
  callout.textContent = "🔴 सुन रहा हूँ...";

  const samples = [
    "Barish me order cancel hua ₹150 penalty kat gayi",
    "Customer ne galat complaint ki ID block ho gayi",
    "Aaj 1200 kamaye petrol kaat ke kitna bacha?",
    "e-Shram card se 2 lakh bima kaise milega?"
  ];
  const query = samples[Math.floor(Math.random() * samples.length)];

  setTimeout(() => {
    resetMainMic();
    handleVoiceIntent(query);
  }, 1000);
}

// ============================================================================
// 3. VOICE INTENT & REALISTIC LAYMAN RESPONSES
// ============================================================================
const voiceIntentAnswers = {
  fine: {
    title: "जुर्माना वापसी (Fine Refund)",
    spokenHindi: "साथी, बारिश या जाम में ऑर्डर कैंसिल होने पर पेनाल्टी लगाना गलत है। कंपनी के क्लॉज 4 के तहत यह पैसा वापस मिलेगा। मैंने अपील तैयार कर दी है, नीचे दिए गए बटन पर टैप करके तुरंत WhatsApp या ईमेल से भेजें!",
    cardHtml: `
      <p><strong>बारिश या तकनीकी समस्या के कारण कटा जुर्माना 100% वापस मिलना चाहिए।</strong></p>
      <p>कंपनी के नियम <em>(Clause 4 - Severe Weather Exception)</em> के अनुसार खराब मौसम में डिलीवरी पार्टनर पर जुर्माना नहीं लगाया जा सकता।</p>
    `,
    actionBtnText: "🛑 अपील पत्र खोलें और WhatsApp पर भेजें",
    modalToOpen: "modalFine"
  },
  ban: {
    title: "आईडी अनब्लॉक (ID Unblock)",
    spokenHindi: "साथी, बिना जांच के और बिना 14 दिन के नोटिस के आईडी बंद करना कानूनन गलत है। हम कंपनी के ग्रीवेंस ऑफिसर को अभी अनब्लॉक करने का नोटिस भेज सकते हैं।",
    cardHtml: `
      <p><strong>बिना नोटिस आईडी बंद करना गलत है:</strong></p>
      <p>गीग वर्कर नियमों के तहत कंपनी को आईडी बंद करने से पहले कारण बताना अनिवार्य है। तुरंत अपील भेजकर अपनी आईडी बहाल कराएं।</p>
    `,
    actionBtnText: "🛑 आईडी अनब्लॉक करने की अपील भेजें",
    modalToOpen: "modalFine"
  },
  earning: {
    title: "आज की असली बचत (Net Earning)",
    spokenHindi: "साथी, अगर आपने आज ₹1200 कमाए हैं और ₹300 का पेट्रोल लगा है, तो आपकी शुद्ध बचत ₹900 है। अपना पूरा हिसाब लगाने के लिए नीचे टैप करें।",
    cardHtml: `
      <p><strong>असली कमाई = कुल रुपये - पेट्रोल व पेनाल्टी</strong></p>
      <p>₹1,200 ग्रॉस में से ₹300 पेट्रोल के बाद आपके हाथ में ₹900 (लगभग ₹112 प्रति घंटा) बचे हैं।</p>
    `,
    actionBtnText: "💰 पूरा हिसाब कैलकुलेटर में देखें",
    modalToOpen: "modalEarning"
  },
  insurance: {
    title: "₹2 लाख मुफ्त बीमा (e-Shram)",
    spokenHindi: "ई-श्रम कार्ड पर हर गिग वर्कर को दो लाख रुपये का दुर्घटना बीमा बिल्कुल मुफ्त मिलता है। इसके लिए सिर्फ आधार कार्ड और बैंक खाते से जन सेवा केंद्र पर जाकर फ्री रजिस्ट्रेशन कराएं।",
    cardHtml: `
      <p><strong>e-Shram कार्ड के फायदे:</strong></p>
      <p>• ₹2,00,000 का मुफ्त एक्सीडेंट बीमा<br>• कोई मासिक फीस या प्रीमियम नहीं<br>• केवल आधार कार्ड और बैंक खाता चाहिए</p>
    `,
    actionBtnText: "🏛️ सरकारी योजनाएं देखें",
    modalToOpen: "modalScheme"
  },
  heat: {
    title: "गर्मी व धूप सुरक्षा अधिकार (Heatwave SOP)",
    spokenHindi: "42 डिग्री से ज्यादा धूप में काम करने पर आपको हर घंटे 15 मिनट छांव में रुकने और पानी पीने का अधिकार है। इसके कारण ट्रिप छोड़ने पर कंपनी पेनल्टी नहीं लगा सकती।",
    cardHtml: `
      <p><strong>गर्मी में आपके सुरक्षा अधिकार:</strong></p>
      <p>• दोपहर 1 से 4 बजे के बीच अनिवार्य हाइड्रेशन ब्रेक लें<br>• डिहाइड्रेशन या चक्कर आने पर ट्रिप कैंसिल करने पर पेनाल्टी माफ है</p>
    `,
    actionBtnText: "🏛️ सुरक्षा नियम देखें",
    modalToOpen: "modalScheme"
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
  } else if (q.includes('heat') || q.includes('dhoop') || q.includes('garmi') || q.includes('safety')) {
    matched = voiceIntentAnswers.heat;
  }

  // Show Live Answer Card
  const card = document.getElementById('liveAnswerCard');
  const bodyText = document.getElementById('answerBodyText');
  const actionsWrap = document.getElementById('answerActionsWrap');

  bodyText.innerHTML = matched.cardHtml;
  actionsWrap.innerHTML = `
    <button class="btn-create-letter" onclick="openSectionModal('${matched.modalToOpen}')">
      ${matched.actionBtnText}
    </button>
  `;
  card.style.display = 'flex';
  card.scrollIntoView({ behavior: 'smooth' });

  // Automatically Speak with natural audio
  speakText(matched.spokenHindi);

  document.getElementById('listenAnswerBtn').onclick = () => {
    speakText(matched.spokenHindi);
  };
}

// ============================================================================
// 4. MODAL 1: FINE REFUND & DISPUTE LETTER
// ============================================================================
function generateFineLetter() {
  const platform = state.selectedFinePlatform;
  const reason = state.selectedFineReason;
  const amt = document.getElementById('fineAmountInput').value || "150";

  let reasonDesc = "भारी बारिश और जलभराव के कारण डिलीवरी में देरी हुई थी।";
  if (reason === 'puncture') reasonDesc = "बाइक का टायर पंचर हो गया था, सपोर्ट को समय पर सूचित किया गया था।";
  else if (reason === 'society') reasonDesc = "कस्टमर की सोसायटी के गेट पर सुरक्षा गार्ड ने वाहन अंदर नहीं जाने दिया।";
  else if (reason === 'customer') reasonDesc = "कस्टमर ने बार-बार कॉल करने पर भी फोन नहीं उठाया।";

  const easyText = `हमने ${platform} की ग्रीवेंस टीम को पत्र में लिखा है कि: "${reasonDesc}". कंपनी के नियमों के तहत यह प्राकृतिक मजबूरी का मामला है। अतः ₹${amt} का काटा गया जुर्माना तुरंत वापस मिले और आपकी आईडी से स्ट्राइक हटाई जाए।`;

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

  document.getElementById('easySummaryText').innerHTML = `<strong>सरल शब्दों में:</strong> ${easyText}`;
  document.getElementById('formalLetterPreview').textContent = formalNotice;

  const waMsg = encodeURIComponent(`*Appeal to ${platform} Support*\n\n${formalNotice}\n\n(Drafted via SahayakAI)`);
  document.getElementById('sendWaLetterBtn').href = `https://wa.me/?text=${waMsg}`;
  document.getElementById('sendEmailLetterBtn').href = `mailto:grievance-support@${platform.toLowerCase()}.com?subject=Penalty%20Appeal%20₹${amt}&body=${encodeURIComponent(formalNotice)}`;

  const card = document.getElementById('letterResultCard');
  card.style.display = 'flex';
  card.scrollIntoView({ behavior: 'smooth' });

  // Read aloud automatically
  speakText(easyText);

  document.getElementById('readLetterBtn').onclick = () => {
    speakText(easyText);
  };
}

// ============================================================================
// 5. MODAL 2: 3-INPUT EARNING CALCULATOR
// ============================================================================
function runEarningCalculator() {
  const gross = parseFloat(document.getElementById('calcGrossInput').value) || 0;
  const fuel = parseFloat(document.getElementById('calcFuelInput').value) || 0;
  const hours = parseFloat(document.getElementById('calcHoursInput').value) || 1;

  const net = Math.max(0, gross - fuel);
  const hourly = (net / Math.max(1, hours)).toFixed(2);

  document.getElementById('outcomeNetText').textContent = `₹${net.toLocaleString('en-IN')}`;
  document.getElementById('outcomeHourlyText').textContent = `यानी लगभग ₹${hourly} प्रति घंटा (${hours} घंटे काम)`;

  const advice = `साथी, आज आपने कुल ₹${gross.toLocaleString('en-IN')} का काम किया, जिसमें से ₹${fuel.toLocaleString('en-IN')} का पेट्रोल लगा। आपके हाथ में कुल ₹${net.toLocaleString('en-IN')} की असली बचत बची है (यानी लगभग ₹${hourly} रुपये प्रति घंटा)।`;
  document.getElementById('outcomeAdviceText').textContent = advice;

  // Automatically read aloud
  speakText(advice);

  document.getElementById('readEarningAudioBtn').onclick = () => {
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
    meaning: "कंपनी ने कल रात ऑर्डर रद्द होने पर आपके ₹150 काट लिए हैं।",
    fairness: "अगर भारी बारिश, ट्रैफिक जाम या बाइक पंचर हुई थी, तो यह जुर्माना पूरी तरह गलत है।",
    action: "कंपनी को नीचे दिए गए बटन से अपील भेजें और पैसे वापस मांगें।",
    speech: "कंपनी ने देर होने पर आपके ₹150 काट लिए हैं। अगर बारिश या जाम था तो यह जुर्माना गलत है। नीचे दिए गए बटन से तुरंत अपील भेजें।"
  },
  id_sms: {
    lang: 'hi',
    text: "Your delivery account is temporarily restricted under Clause 8.2.",
    meaning: "कंपनी के कंप्यूटर ने आपकी बाइक का GPS लोकेशन संदिग्ध मानकर आपकी आईडी 2 घंटे के लिए बंद कर दी है।",
    fairness: "फोन गर्म होने या नेटवर्क जाने पर ऐसा गलत अलार्म अक्सर आ जाता है।",
    action: "तुरंत आईडी बहाल कराने का अपील पत्र सपोर्ट टीम को भेजें।",
    speech: "जीपीएस में गड़बड़ी के कारण आपकी आईडी अस्थायी रूप से रोकी गई है। घबराएं नहीं, तुरंत अपील भेजकर इसे चालू कराएं।"
  },
  tds_sms: {
    lang: 'hi',
    text: "TDS 1% has been withheld under Section 194-O.",
    meaning: "कंपनी ने सरकारी नियम (Section 194O) के तहत आपकी कमाई से 1% टैक्स काटकर सरकार में जमा किया है।",
    fairness: "यह कोई जुर्माना नहीं है! यदि आपकी साल की कमाई 7 लाख से कम है, तो यह पैसा आपको वापस मिल सकता है।",
    action: "साल के अंत में फ्री जीरो-टैक्स ITR भरकर यह पूरा पैसा वापस पाएं।",
    speech: "यह कोई जुर्माना नहीं है, बल्कि एक प्रतिशत टैक्स कटा है। साल के अंत में यह पूरा पैसा सरकार से वापस लिया जा सकता है।"
  }
};

let activeSmsType = 'fine_sms';

function testMultilingualText(text) {
  const input = document.getElementById('customSmsInput');
  if (input) {
    input.value = text;
  }
  decodeSms();
}

function decodeSms() {
  const custom = document.getElementById('customSmsInput').value.trim();
  let data = sampleSmsData[activeSmsType];

  let speechTextToRead = "";
  let detectedLang = 'hi';

  if (custom.length > 2) {
    detectedLang = detectScriptLanguage(custom);
    speechTextToRead = custom; // READ THE EXACT MULTILINGUAL DATA WRITTEN!

    data = {
      meaning: `आपने लिखा है [भाषा: ${detectedLang.toUpperCase()}]: "${custom}"`,
      fairness: "इस मामले में कामगार को अपनी सफाई देने और अपील करने का पूरा अधिकार है।",
      action: "नीचे दिए गए बटन से तुरंत अपील तैयार करें।",
      speech: custom
    };
  } else {
    speechTextToRead = data.speech;
    detectedLang = data.lang || 'hi';
  }

  document.getElementById('decodedMeaning').textContent = data.meaning;
  document.getElementById('decodedFairness').textContent = data.fairness;
  document.getElementById('decodedAction').textContent = data.action;

  const box = document.getElementById('decodedOutcomeBox');
  box.style.display = 'flex';
  box.scrollIntoView({ behavior: 'smooth' });

  // Read aloud the exact multilingual data written!
  speakText(speechTextToRead, detectedLang);

  document.getElementById('readDocAudioBtn').onclick = () => {
    speakText(speechTextToRead, detectedLang);
  };
}

// ============================================================================
// 7. MODAL HELPERS & EVENT INITIALIZATION
// ============================================================================
function openSectionModal(modalId) {
  stopSpeaking();
  const m = document.getElementById(modalId);
  if (m) {
    m.style.display = 'flex';
    m.scrollTop = 0;
  }
}

function closeSectionModal(modalId) {
  stopSpeaking();
  const m = document.getElementById(modalId);
  if (m) m.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {

  // Main Big Mic Tap
  const mainMic = document.getElementById('mainMicBtn');
  if (mainMic) {
    mainMic.addEventListener('click', toggleMainMic);
  }

  // Quick Spoken Pills
  document.querySelectorAll('.voice-question-pill').forEach(pill => {
    pill.addEventListener('click', function() {
      const scenarioKey = this.getAttribute('data-scenario');
      const sc = voiceIntentAnswers[scenarioKey];
      if (sc) {
        handleVoiceIntent(this.innerText);
      }
    });
  });

  // Replay and Stop buttons in Subtitle Bar
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
  document.getElementById('languageSelect').addEventListener('change', function() {
    state.currentLang = this.value;
    const greetings = {
      hi: { text: "नमस्ते साथी! मैं आपका सह-चालक AI सहायक हूँ। नीचे माइक दबाइए और बोलिए!", lang: 'hi' },
      en: { text: "Hello partner! I am your Sahayak AI assistant. Tap the mic below to speak!", lang: 'en' },
      hinglish: { text: "Hello bhai! Main aapka Sahayak AI saathi hoon. Niche mic press karke bolo!", lang: 'hi' },
      ta: { text: "வணக்கம் நண்பரே! நான் உங்கள் சகாயக் AI துணைவன். கீழே உள்ள மைக்கை அழுத்தி பேசுங்கள்!", lang: 'ta' },
      te: { text: "నమస్కారం సోదరా! నేను మీ సహాయక్ AI సహచరుడిని. మాట్లాడటానికి మైక్ నొక్కండి!", lang: 'te' },
      bn: { text: "নমস্কার বন্ধু! আমি আপনার সহায়ক AI সহকারী। কথা বলতে নিচের মাইক টিপুন!", lang: 'bn' },
      kn: { text: "ನಮಸ್ಕಾರ ಸ್ನೇಹಿತರೆ! ನಾನು ನಿಮ್ಮ ಸಹಾಯಕ AI ಸಹಾಯಕ.", lang: 'kn' }
    };
    const item = greetings[this.value] || greetings.hi;
    speakText(item.text, item.lang);
  });

  // Modal 1: Platform chips
  document.querySelectorAll('#finePlatformChips .chip-choice').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#finePlatformChips .chip-choice').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      state.selectedFinePlatform = this.getAttribute('data-val');
    });
  });

  // Modal 1: Reason chips
  document.querySelectorAll('#fineReasonChips .chip-choice').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#fineReasonChips .chip-choice').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      state.selectedFineReason = this.getAttribute('data-val');
    });
  });

  document.getElementById('btnCreateLetter').addEventListener('click', generateFineLetter);

  document.getElementById('copyLetterBtn').addEventListener('click', () => {
    const txt = document.getElementById('formalLetterPreview').textContent;
    navigator.clipboard.writeText(txt).then(() => {
      alert("अपील पत्र कॉपी हो गया! अब आप इसे कंपनी सपोर्ट में पेस्ट कर सकते हैं।");
    });
  });

  // Modal 2: Run Calculator
  document.getElementById('btnRunCalc').addEventListener('click', runEarningCalculator);

  // Modal 3: Sample SMS chips
  document.querySelectorAll('.btn-sample-sms').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.btn-sample-sms').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      activeSmsType = this.getAttribute('data-type');
    });
  });

  document.getElementById('btnDecodeSms').addEventListener('click', decodeSms);

  // SOS Emergency Modal Trigger
  document.getElementById('sosTriggerBtn').addEventListener('click', () => {
    openSectionModal('modalSos');
    speakText("आपातकालीन सेवा सक्रिय है। सहायता के लिए तुरंत 112 या 108 पर कॉल करें।", 'hi');
  });

  document.getElementById('sendSosWaDirectBtn').addEventListener('click', () => {
    const coords = "रिंग रोड, दिल्ली (Lat: 28.5672, Long: 77.2100)";
    const msg = encodeURIComponent(`🚨 आपातकालीन मदद (EMERGENCY SOS)! मैं सड़क पर हूँ और मुझे तुरंत सहायता चाहिए। मेरी लोकेशन: ${coords}। कृपया तुरंत 112 पर कॉल करें।`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  });

  // Initial greeting
  runEarningCalculator();
});
