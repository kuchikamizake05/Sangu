# Demo Video Script & Production Guide — Sangu

> Target: a **~3-minute** hackathon demo video for the Stellar APAC Hackathon,
> Payment & Consumer Applications track.
> Core message: **"Sending money home should be as easy as sending a message —
> recipients cash out with no app and no bank account."**

---

## 1. Preparation before recording

### 1.1 Run the app (demo/mock mode)

```bash
# Terminal 1 — backend (port 4000)
cd backend && npm run dev

# Terminal 2 — frontend (port 3000)
cd frontend && npm run dev
```

Make sure the backend `.env` uses the **`mock` OTP provider** — with it, every OTP
is **`000000`** (both sender login and recipient claim). The UI placeholders also
show `000000`, so judges trying the app themselves will figure it out instantly.

### 1.2 Pre-recording checklist

- [ ] Backend & frontend running; open `http://localhost:3000` and confirm the landing page loads.
- [ ] Do one full dry run **before** recording (login → send → claim) so there are
      no surprises; clean up test data if it clutters the history.
- [ ] Prepare **two browser windows**: one for the sender (normal), one for the
      recipient (incognito / separate profile) — it makes "two different people" visually obvious.
- [ ] Passkey: use Chrome on macOS with Touch ID, **or** enable the
      *virtual authenticator* (DevTools → WebAuthn) so the fingerprint prompt
      appears smoothly without awkward pauses.
- [ ] Hide the bookmarks bar, silence OS notifications (Do Not Disturb), close other tabs.
- [ ] Window size: **mobile viewport** (DevTools device toolbar, e.g. iPhone 14 /
      390×844) — Sangu is mobile-first and looks best that way.
- [ ] Prepare consistent demo phone numbers, e.g. `+62 812-3456-7890` (sender)
      and one recipient number.
- [ ] Browser zoom at 100%; move the cursor slowly and deliberately.

### 1.3 Recommended recording tools

- **Screen:** QuickTime (macOS) / OBS — record at 1080p, 30/60 fps.
- **Narration:** record the voice-over **separately** after the video is cut,
  then sync — much cleaner than talking while operating the app.
- **Editing:** CapCut / DaVinci Resolve / iMovie; cut loading pauses, speed up
  typing sections 1.5–2×.

> Note: the app UI is in Indonesian (it's built for Indonesian migrant workers —
> that's a feature, not a bug). Narrate in English and let the on-screen labels
> speak for themselves; add small English overlay captions in editing where a
> label matters (e.g. "Cairkan sekarang" → *"Claim now"*).

---

## 2. Video structure (~3 minutes total)

| # | Scene | Duration | Content |
|---|-------|----------|---------|
| 1 | Hook + problem | 0:00–0:25 | Migrant-worker story; remittance cost & friction |
| 2 | Solution & landing | 0:25–0:40 | Introduce Sangu, core value proposition |
| 3 | Sender login | 0:40–1:05 | Phone number → OTP `000000` → enable fingerprint |
| 4 | Send money | 1:05–1:50 | Recipient → amount & FX rate → fingerprint confirm → WhatsApp link |
| 5 | Recipient claim | 1:50–2:30 | Open link with no app → OTP → choose payout → cash out |
| 6 | Dashboard & extras | 2:30–2:45 | Balance, history, scheduled transfers |
| 7 | Tech & closing | 2:45–3:00 | Stellar/Soroban, non-custodial, CTA |

---

## 3. Scene-by-scene script (visuals + narration)

> Narration is written in a relaxed pitch tone. Adapt it to your own voice —
> what matters is that the bolded points land.

### Scene 1 — Hook + problem (0:00–0:25)

**Visuals:** "Sangu" title card on a plain background, then cut to a stock
photo/illustration of migrant workers (optional), or go straight to a slow
scroll of the landing page.

**Narration:**
> "There are over 9 million Indonesian migrant workers abroad. Every month they
> send money home — and every time, they lose a big cut to fees, queue at agents,
> and their family back home needs a bank account or a specific app just to
> receive it. We thought: this should be as easy as sending a WhatsApp message."

### Scene 2 — Solution & landing (0:25–0:40)

**Visuals:** Landing page at `localhost:3000` — slow scroll past the hero,
features, and security sections.

**Narration:**
> "Meet **Sangu**. Send money from Malaysia, Singapore, Hong Kong, Japan, or the
> US to Indonesia. The recipient needs **no app and no bank account** — just one
> link. And under the hood, everything runs on the Stellar network."

### Scene 3 — Sender login (0:40–1:05)

**Visuals:**
1. Click sign-in from the landing page → `/login`.
2. Pick a country (e.g. 🇲🇾 Malaysia), type the phone number → continue.
3. OTP screen: **enter `000000`** (linger on it briefly — the placeholder is `000000` too).
4. Fill in the name (first-time registration) → verify & sign in.
5. "Enable fingerprint" screen → click → Touch ID prompt appears → success.

**Narration:**
> "The sender signs up with just a phone number and an SMS code. Then they enable
> **fingerprint sign-in** — and here's the twist: behind that fingerprint, Sangu
> creates a **non-custodial smart wallet** on Stellar, owned by the sender.
> No seed phrase, no crypto jargon. Just a finger."

**Recording note:** if Touch ID is slow to appear, cut the pause in editing.
Never show DevTools if you're using the virtual authenticator.

### Scene 4 — Send money (1:05–1:50)

**Visuals:**
1. Dashboard `/app` — show the balance briefly (top up via "Isi saldo" *before*
   recording if the balance is empty).
2. Click **"Kirim uang"** (*Send money*) → step 1: pick/enter the recipient
   (name + Indonesian phone number).
3. Step 2: type the amount (e.g. RM 500) — highlight that the **FX rate and the
   estimated Rupiah amount update in real time**.
4. Step 3: confirmation screen → confirm → **fingerprint prompt** → success.
5. Success screen: highlight the **WhatsApp share button** + copy-link button.
   **Copy the link** (you'll use it in Scene 5).

**Narration:**
> "Now let's send money. Pick a recipient, type the amount — the rate and the
> exact Rupiah the family receives are shown up front, **transparent, no hidden
> fees**. Confirm with a fingerprint — at this moment the funds move into an
> **escrow on a Soroban smart contract**, not into our bank account. Done.
> What the sender gets is **a link** — just forward it on WhatsApp like any
> other message."

### Scene 5 — Recipient claim (1:50–2:30) — **the most important scene**

**Visuals:**
1. Switch to the **incognito** window (make it visually explicit: different
   window = different person; add a text label like "Recipient's phone" in editing).
2. Paste the claim link → the page shows "**[Name] mengirimimu Rp X**"
   (*[Name] sent you Rp X*) with the line "you don't need a Sangu account or any app."
3. Click "Cairkan sekarang" (*Claim now*) → enter OTP `000000` → verify.
4. Payout method screen: **DANA / GoPay / Bank transfer / Cash pickup at a
   convenience store** — hover over each option slowly, pick one (e.g. DANA),
   enter the destination number.
5. Click "Cairkan uang" (*Cash out*) → success screen.

**Narration:**
> "This is the recipient's side — a mother, a father, family back in the village.
> They open the link… and immediately see who sent it and how much, in Rupiah.
> **No install, no account.** Verify an SMS code, then choose how to receive:
> DANA, GoPay, bank transfer — or **cash pickup at a local store** for those with
> no bank account at all. One tap, and the funds are released from escrow through
> a Stellar anchor. That's it."

### Scene 6 — Dashboard & supporting features (2:30–2:45)

**Visuals:** Back to the sender window → `/app`: the transfer's status has
changed in the history (sent/claimed) → open the transfer detail → quick glance
at the **scheduled transfers** page (`/recurring`).

**Narration:**
> "The sender can track every transfer in real time. And since migrant workers
> typically send money every payday, there are **scheduled transfers** — set it
> once, it runs automatically. If a link is never claimed before it expires, the
> funds are **automatically refunded** by the smart contract."

### Scene 7 — Tech & closing (2:45–3:00)

**Visuals:** A simple closing slide (one static frame is fine):
Sangu logo + 3 bullets: "Non-custodial passkey wallet" · "Soroban escrow" ·
"Stellar settlement, local-anchor payout". End on the tagline.

**Narration:**
> "Under the hood: a non-custodial passkey wallet, escrow on a Soroban smart
> contract, and cheap, fast settlement on Stellar — and the user never has to
> learn a single one of those words. **Sangu. Sending money home, as easy as
> sending a message.** Thank you."

---

## 4. Detailed shooting guide

### 4.1 General principles

- **One scene = one take.** Record per scene, not one 3-minute run — retaking a
  failed part is far easier.
- **Move the cursor slowly** and pause (~0.5 s) before each click so viewers can follow.
- **Cut loading pauses** in editing; if a load takes > 2 seconds, cover it with a
  cut or a speed-up.
- Whatever the narration mentions must be **visible on screen** at that moment
  (e.g. when you say "transparent rate", the cursor points at the rate figure).

### 4.2 Tricks specific to this demo

- **OTP `000000`:** type it at a moderate pace — this quietly tells the judges
  the demo code without having to say it.
- **Two personas:** add editing overlays — "📱 Sender (Malaysia)" and
  "📱 Recipient (Indonesia)" — so the window switches never confuse the viewer.
- **Fingerprint prompt:** the biggest "wow" moment — leave a beat of silence in
  the narration when the Touch ID prompt appears; don't talk over it.
- **WhatsApp link:** showing the share & copy buttons is enough; no need to
  actually open WhatsApp (saves time and avoids recording personal data).
- **Indonesian UI:** add small English caption overlays for the labels that carry
  the story ("Cairkan sekarang" → *Claim now*, "Kirim uang" → *Send money*).

### 4.3 What NOT to do

- Don't show the terminal, backend logs, DevTools, or `.env`.
- Don't use crypto jargon on user-facing screens (the UI is already jargon-free —
  the narration may mention Stellar/Soroban only in scenes 4 and 7).
- Don't let stray errors/toasts slip into a frame; retake the scene.
- Don't exceed 3 minutes — judges watch dozens of videos.

### 4.4 Suggested production workflow

1. Full dry run of the whole flow once, without recording.
2. Record scenes 3–6 (the app flow) — the parts most likely to need retakes.
3. Record scene 2 (landing) and the material for scenes 1 & 7.
4. Rough cut: order the scenes, trim pauses.
5. Record the voice-over per scene while watching the rough cut.
6. Sync, add labels/overlays, quiet background music (volume ≤ 20%).
7. Watch the final cut twice: once for visuals, once for narration.
8. Export 1080p MP4; check file size & the hackathon's upload rules.

---

## 5. Selling-point cheat sheet (for improvising)

1. **Recipient needs no app & no bank account** — just a link + SMS; cash pickup available.
2. **Non-custodial** — the sender's funds live in their own passkey smart wallet;
   in-flight funds sit in a smart-contract escrow, not in Sangu's bank account.
3. **Zero-jargon UX** — no seed phrases or crypto terms anywhere in the UI.
4. **Transparent real-time FX** — the exact Rupiah amount is known before sending.
5. **Automatic refunds** — link expires → funds return to the sender on their own.
6. **Scheduled transfers** — matches the monthly payday rhythm of migrant workers.
