# 🛵 SahayakAI (सहायक साथी)
### *A Simple Voice Helper App for Gig Workers and Drivers*

---

## ❓ What is SahayakAI?

**SahayakAI** is a super simple, voice-based helper app made for India's delivery riders (Swiggy, Zomato, Blinkit, Zepto) and drivers (Uber, Ola, Rapido).

Most riders have passed 10th class (matric). Many do not know fluent English, and platform rules can be confusing. When companies cut money (penalties), block IDs, or send complicated English messages, riders often don't know what to do.

**SahayakAI works like a PhonePe/Paytm Soundbox:**
- You press a big mic button and speak in your own language (Hindi, Tamil, Telugu, Bengali, or English).
- The app listens and **speaks the answer out loud**.
- You don't have to read long English messages or type complicated emails.

---

## 🎯 4 Big Things This App Does

### 1. 🛑 Get Cut Money Back (Penalty Refund & ID Help)
- **Problem**: Company cuts ₹150 because of rain, tire puncture, or customer delay.
- **Solution**: Tap the red tile, pick what happened (Rain / Puncture / Gate Guard), and tap **"Create Appeal"**.
- **Action**: It makes a ready-made complaint message in proper English. With 1 tap, it opens **WhatsApp** so you can send it directly to company support.

### 2. 💰 Real Daily Savings Calculator (असली कमाई)
- **Problem**: The company app shows ₹1,500 earnings, but riders forget how much went into petrol or EV charging.
- **Solution**: Just enter 3 simple numbers:
  1. Total earnings shown in app (e.g. ₹1,500)
  2. Petrol or charging expense (e.g. ₹400)
  3. Hours worked (e.g. 8 hours)
- **Result**: It tells you your real in-pocket profit (₹1,100) and your hourly rate (₹137/hour), and **reads it out loud to you**.

### 3. 📄 Read & Explain Company Notices (मैसेज समझें)
- **Problem**: Company sends a confusing English SMS like *"Penalty under Section 194O"* or *"Account Suspended"*.
- **Solution**: Paste the message or pick from sample messages.
- **Result**: The app explains it in simple Hindi/regional language in 3 points:
  1. What happened?
  2. Is it fair?
  3. What should you do next?

### 4. 🏛️ Free Govt Insurance (₹2 Lakh - ₹5 Lakh)
- **e-Shram Card**: Explains how every gig worker gets **₹2,00,000 free accident insurance** using just Aadhaar Card and Bank Passbook.
- **Ayushman Card (PM-JAY)**: Explains how to get **₹5,00,000 free hospital treatment** for the family.
- **Worker Rights**: Tells you that companies cannot block your ID without giving a 14-day notice under new Gig Worker laws.

---

## 🚨 Emergency SOS (Road Accidents & Danger)

At the bottom of the screen, there is a **Big Red SOS Bar**:
- Tap it in case of an accident or emergency.
- Your phone vibrates and speaks: *"Emergency services active"*.
- **1 Tap Call**: Directly calls **112** (Police) or **108** (Ambulance).
- **1 Tap WhatsApp**: Sends your exact road location to your family with one click.
- Shows nearest 24/7 free government trauma centers (like AIIMS or Safdarjung).

---

## ☀️ Made for the Road (Special Features)

- **☀️ Sunlight Mode**: A toggle button at the top. If you are on your bike in direct afternoon sunlight, turn this on for bold, high-contrast text that doesn't glare.
- **🔊 Paytm-Style Soundbox**: Every answer has a *"Listen"* button. It speaks aloud so you can listen while wearing your helmet.
- **🌐 5 Languages**: Switch between Hindi, English, Tamil, Telugu, and Bengali with one tap.
- **👆 Giant Buttons**: All buttons are big and easy to tap, even when wearing driving gloves.
- **🎓 First-Time Voice Tour**: When you open the app for the first time, a 3-step voice tour explains how to use everything.

---

## 📁 What is Inside Each File?

| File Name | What It Does (In Simple Words) |
|---|---|
| **`index.html`** | The complete screen layout — top soundbox, the big mic, 4 action boxes, popup sheets, and emergency SOS bar. |
| **`styles.css`** | The design and colors — dark mode, bright outdoor sunlight mode, big readable fonts, and smooth animations. |
| **`app.js`** | The brain of the app — listens to voice, plays audio sentences, calculates earnings, and builds WhatsApp messages. |
| **`server.py`** | The simple Python server — runs the website and converts text into spoken voice audio (`/tts`). |
| **`cloudflared`** | A tool to make a temporary link so you can open the app on your mobile phone. |

---

## 🚀 How to Run the App

### Step 1: Start the Server
Open your computer terminal and run:
```bash
python3 server.py
```

You will see:
```
Starting SahayakAI Server with Multilingual TTS at http://localhost:8080
```

### Step 2: Open in Browser
Open Chrome, Safari, or Edge and go to:
```
http://localhost:8080
```

### Step 3: Use it on Your Mobile Phone
To test it on your actual mobile phone:
```bash
ssh -R 80:localhost:8080 nokey@localhost.run
```
Open the `https://...` link shown on your phone screen!

---

## 💡 Summary

**SahayakAI** makes artificial intelligence as simple as an audio soundbox. No complicated tech words, no typing required — just tap, speak, listen, and solve your daily delivery problems.
