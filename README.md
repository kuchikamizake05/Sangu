# Sangu — Send Money Home as Easily as Sending a Message

> **Sangu** (Javanese/Sundanese): the money or provisions you give someone setting off on a
> journey. This is remittance for Indonesian migrant workers (PMI), built on
> **Stellar / Soroban**. The recipient cashes out from a **single link** — no app, no
> account, no bank, even **cash pickup** — while the sender's wallet and the escrow stay
> **non-custodial**.
>
> Submission for the **Stellar APAC Hackathon** — track: **Payment & Consumer Applications**.

---

## Table of Contents

1. [The Problem](#the-problem)
2. [The Solution](#the-solution)
3. [Why the Receiver Experience Is the Real Product](#why-the-receiver-experience-is-the-real-product)
4. [Features](#features)
5. [Positioning vs Competitors](#positioning-vs-competitors)
6. [Why Stellar](#why-stellar)
7. [Architecture](#architecture)
8. [Escrow Contract Interface](#escrow-contract-interface)
9. [Security Model](#security-model)
10. [REST API Surface](#rest-api-surface)
11. [Anchor Integration (SEP-24)](#anchor-integration-sep-24)
12. [What Is Real vs Simulated](#what-is-real-vs-simulated)
13. [On-Chain Proof (Testnet)](#on-chain-proof-testnet)
14. [Tech Stack](#tech-stack)
15. [Repository Structure](#repository-structure)
16. [Running Locally](#running-locally)
17. [Roadmap](#roadmap)
18. [Team](#team)

---

## The Problem

Indonesian migrant workers send home **~US$15.5 billion per year** — Indonesia is the
world's **4th-largest remittance recipient**. Yet cross-border transfers still cost
**6–7% on average** (the UN target is 3%) and take **1–2 days**.

The biggest wall is not on the sender's side — it is on the **receiver's**. Nearly every
service (Wise, Western Union, bank transfers, crypto apps) requires the family back home
to have an app, an account, or a bank account. Many PMI families in rural villages are
**unbanked**: the money is there, but they cannot reach it.

Where the workers are (2024 placements, BP2MI): Hong Kong (~100k), Taiwan (~85k),
Malaysia (~52k), Japan (~13k, fastest-growing), Singapore (~11k). Where the money comes
from (2023): Malaysia $4.6B, Saudi Arabia $4.0B, Taiwan $2.0B, Hong Kong $1.8B. The five
largest corridors account for **~90%** of total PMI remittance — and most of them are
in APAC.

## The Solution

**One killer feature: send money through a link — the recipient cashes out with no app,
no account, no knowledge of crypto, even as physical cash.**

1. **Sender** (migrant worker abroad) logs in with a **passkey** — a non-custodial
   Soroban smart wallet behind Face ID / fingerprint, no seed phrase, crypto fully
   hidden (the user only ever sees Rupiah/local currency). They enter an amount and get
   a **claim link** to share on WhatsApp.
2. **Recipient** (family in Indonesia) opens the link in any mobile browser — zero
   install, zero registration, zero cost — verifies with an **SMS OTP**, and picks how
   to cash out: **e-wallet (DANA/GoPay), bank account, or cash at a nearby outlet** for
   the fully unbanked.
3. Funds arrive in Rupiah at the real FX rate. If the link is never claimed, the
   on-chain escrow **auto-refunds** the sender after expiry (default 72h) — "sent it to
   the wrong person? The money comes back by itself."

Supported corridors: **Malaysia (MYR)** — cash-out for unbanked families,
**Hong Kong (HKD)** — digital e-wallet payout, **Japan (JPY)**, and
**United States (USD)**.

### Core flow

```
deposit (passkey wallet signs, USDC → Soroban escrow, relayer pays fees)
   → WhatsApp claim link (opaque token only — no secrets in the URL)
      → recipient opens link → SMS OTP → claim (backend reveals secret; destination
        must be on the contract's anchor allowlist)
         → SEP-24 withdraw via anchor (e-wallet / bank / cash pickup)
expiry passed → refund (permissionless, run by a keeper; funds can only return to sender)
```

## Why the Receiver Experience Is the Real Product

Competitors polish the **sender's** app. Sangu is designed around **10 seconds of the
receiver's experience**: a 55-year-old mother, a cheap Android phone, patchy signal,
possibly no bank account. So the claim side is:

- Opened from WhatsApp, runs in the **browser** — no app store.
- Simple Indonesian, big buttons, minimal text (full i18n ID/EN).
- Familiar payout rails: DANA, GoPay, bank transfer, **cash at an outlet**.
- Recipients who receive monthly get a **lightweight account**: preferences remembered,
  next month's claim is one tap.

This asymmetry is deliberate: the sender (motivated, digitally literate) carries the
heavy side — KYC, funding, the app. The receiver carries **nothing**.

## Features

**Core (the killer flow):**
- **Invisible crypto, non-custodial** — no "USDC", no "wallet", no seed phrase on any
  screen; keys stay with the user (passkey smart wallet).
- **Gasless** — the sender never needs XLM; a relayer fee-bumps every transaction.
- **Zero-friction recipient** — open a link, done. No install, no signup, no funds
  needed for account creation.
- **Send by phone number / contact**, never by wallet address.
- **Escrow + claim link** with expiry and automatic refund, enforced on-chain.

**Wow features:**
- ⭐ **Cash pickup for the unbanked** — a real SEP-24 withdraw flow (SDF Test Anchor;
  protocol-identical to MoneyGram Ramps — see [honesty table](#what-is-real-vs-simulated)).
- **Brutal fee transparency** — live FX quote on the send screen with a side-by-side
  comparison: *"Western Union takes Rp 82,000. Us: Rp 150."*
- **Sangu Bulanan** — recurring monthly transfers ("send to Mom every payday"), with a
  scheduler that flags due transfers (each send still requires a passkey signature —
  non-custodial means no silent spending).

**Sender account & auth:**
- Registration/recovery via phone OTP; daily login via **passkey (WebAuthn)**.
- All sender routes JWT-scoped per sender; transfer history, recipient masking, wallet
  balance display in USD/MYR/HKD/JPY.

## Positioning vs Competitors

| | Western Union | Wise / Flip | Morse (Sling) | **Sangu** |
|---|---|---|---|---|
| Fees | 6–7% | low–medium | low | ~0 (sponsored) |
| Speed | 1–2 days | minutes–hours | seconds | seconds |
| Recipient needs app/account? | no (but expensive) | **yes** | **yes** | **NO** |
| Cash-out for unbanked | yes (expensive) | no | no | **yes (link + agent)** |
| Focus on Indonesian migrant workers | generic | generic | generic | **specific** |

The gap Sangu fills: cheap + instant **AND** no app/account on the receiving side
**AND** cash pickup — a combination no incumbent offers.

## Why Stellar

Every piece of the killer feature that would be mocked or bolted on elsewhere is a
**native Stellar primitive**:

| Product element | On other chains | **On Stellar (native)** |
|---|---|---|
| Escrow + claim link + expiry + auto-refund | Custom escrow program, fragile | **Soroban escrow contract** — hashlock claim + timelock refund enforced on-chain; refund can only return to the sender |
| Hide crypto, no seed phrase, still non-custodial | Third-party embedded/custodial wallet | **Passkey smart wallet (Soroban)** — secp256r1 signer = Face ID / fingerprint; keys never leave the device |
| Gasless UX | Fee-abstraction bolt-on | **Fee-bump + relayer** — the app pays fees; the smart wallet only authorizes |
| Cash pickup for the unbanked | Fully mocked | **SEP-24 anchors** — real interactive withdraw flow; MoneyGram Ramps runs this exact protocol on Stellar |
| Fiat on/off-ramp (e-wallet/bank) | Mocked (MoonPay/Transak) | **Anchors + SEP-24** — Stellar's official fiat rail; FX to IDR happens at the anchor edge |
| Settlement asset | — | **USDC on Stellar** — 3–5s finality, ~$0.00001 fees |

Cross-currency note: on-chain settlement is entirely USDC; FX (MYR/HKD/JPY/USD → IDR)
happens at the fiat edge (anchor), not via path payments — a deliberate choice for the
non-custodial MVP.

## Architecture

```
frontend/    Sender app + claim page (Next.js PWA, Tailwind, i18n ID/EN)
backend/     REST API + relayer + keeper + SEP-24 anchor bridge (Fastify/TS, Postgres)
contracts/   Soroban escrow contract (Rust)
```

### Account & custody model

| Actor | Account | Custody |
|---|---|---|
| **Sender (PMI)** | Passkey smart wallet (`C...`, secp256r1 signer) | **Non-custodial** — key on device, never on a server |
| **Escrow** | Soroban contract holding USDC (via the Stellar Asset Contract) | Trustless — funds obey contract rules, not any party |
| **Recipient** | **No wallet at all** — funds flow escrow → settlement → anchor on claim | Zero friction; the recipient never custodies crypto |
| **Relayer/backend** | Service accounts: pay fees, submit txs, trigger claim after OTP | Cannot divert funds (allowlist), **but** controls claim timing and the fiat leg |

**Honest non-custodial boundary** (we do not over-claim): the **sender's wallet and the
escrow are non-custodial** — the backend never holds the sender's key and cannot redirect
funds to an arbitrary address. The **off-ramp leg is trusted**: the backend controls when
`claim` fires (post-OTP), the settlement account, and the anchor conversion — as with
every fiat off-ramp. The precise claim is: *"sender wallet + escrow non-custodial;
off-ramp trusted."*

### Backend components

- **Relayer:** builds unsigned deposit XDR (the passkey wallet signs in the browser),
  fee-bumps and submits all transactions — the backend never spends user funds.
- **Keeper:** watches expiries and calls the permissionless `refund` — "auto-refund" is
  contract logic on-chain plus an untrusted off-chain trigger (Stellar has no on-chain cron).
- **Anchor poller:** drives the SEP-24 withdraw lifecycle — initiates the interactive
  flow, then pays the anchor (with memo) exactly once when the transaction reaches
  `pending_user_transfer_start`, and keeps the payout status in sync.
- **Scheduler:** recurring "Sangu Bulanan" due-date checks.
- **DB:** Postgres (Supabase) — transfer ↔ escrow ↔ token mapping, secrets, sender
  accounts, OTP state, anchor transaction state.

## Escrow Contract Interface

State per transfer:

```rust
pub enum EscrowStatus { Pending, Claimed, Refunded }

pub struct Escrow {
    pub sender: Address,                  // sender's passkey smart wallet
    pub amount: i128,                     // USDC, 7 decimals (stroops)
    pub hashlock: BytesN<32>,             // sha256(secret) — secret held by backend, NEVER in a URL
    pub recipient_commitment: BytesN<32>, // server-side HMAC — not publicly reconstructable
    pub expiry: u64,                      // unix seconds (ledger timestamp)
    pub status: EscrowStatus,
}
```

| Function | Auth | Rules |
|---|---|---|
| `__constructor(admin, usdc_token, anchor_allowlist)` | — (deploy-time) | sets admin, token, allowlist |
| `deposit(sender, amount, hashlock, recipient_commitment, expiry) -> escrow_id` | `sender.require_auth()` | transfers USDC → contract |
| `claim(escrow_id, secret, payout_destination)` | none — secret + allowlist | `status == Pending && now < expiry && sha256(secret) == hashlock && destination ∈ allowlist` |
| `refund(escrow_id)` | **permissionless** | `status == Pending && now >= expiry`; funds can **only** return to `sender` |
| `get_escrow(escrow_id)` | view | |
| `add_anchor` / `remove_anchor` | admin | manage the settlement allowlist |

Events (`deposit`/`claim`/`refund` with escrow id, amounts, parties) are emitted for the
backend to track. Errors are numbered panics (NotFound, AlreadySettled, Expired,
NotYetExpired, BadSecret, DestinationNotAllowed, Unauthorized, InsufficientAmount) that
the backend maps to user-facing messages.

## Security Model

Who holds what:

- **`secret`** — a random 32-byte value, generated and held **only by the backend**;
  `sha256(secret)` is stored on-chain as the hashlock. It is **never in the URL**.
- **Claim link** — carries only an **opaque token** that maps (in the DB) to
  `{escrow_id, secret, recipient phone, nonce}`. A leaked link alone cannot move money.
- **OTP gate** — the recipient must pass an SMS OTP to their registered number before
  the backend fires `claim`. Sales pitch: *"only Mom can cash it out."*
- **Anchor allowlist (on-chain)** — even a fully compromised backend cannot send escrow
  funds to an arbitrary address; `claim` only pays allowlisted settlement accounts.
- **Recipient commitment** — `HMAC(server_key, E.164 phone ‖ nonce)`, not
  `sha256(phone)`: phone numbers are a small, brute-forceable space, so a plain hash
  would leak them. Phone lookups in the DB use the same HMAC scheme.
- **Expiry + auto-refund** — a mistaken or unclaimed transfer returns to the sender
  automatically; the keeper is untrusted because `refund` is permissionless and
  sender-bound.
- **Sender auth** — WebAuthn passkey login, OTP only for registration/recovery, 30-day
  JWTs, all sender routes scoped by `senderId`, phone numbers HMAC-indexed and masked in
  responses.

## REST API Surface

Money values travel as decimal strings (no float error). Transfer status enum:
`PENDING → CLAIMED → PAID_OUT | REFUNDED | EXPIRED`.

**Sender (JWT-authenticated, except `/api/quote`):**

```
GET  /api/quote?corridor=MY&amountForeign=500   live FX rate (labeled estimate + source + timestamp)
POST /api/send/prepare                          → { transferId, unsignedXDR, quote, expiry }
POST /api/send/submit                           { transferId, signedXDR } → { escrowId, claimUrl }
GET  /api/transfers                             transfer history (recipient masked)
GET  /api/transfers/:transferId                 transfer detail
POST /api/recurring                             set up "Sangu Bulanan" (monthly recurring)
GET  /api/recurring                             list schedules (+ pause/resume/sent actions)
GET  /api/wallet/balance?currency=USD|MYR|HKD|JPY
POST /api/wallet/topup                          mock on-ramp (hackathon)
POST /api/wallet/deploy                         deploy the passkey smart wallet
```

Sending is deliberately **two-step** (`prepare` → sign in browser → `submit`): the
backend builds unsigned XDR and never spends user funds.

**Auth (`/api/auth/*`):**

```
POST /api/auth/otp/request | /otp/verify        phone OTP — registration & recovery only
POST /api/auth/passkey/register/options|verify  WebAuthn registration
POST /api/auth/passkey/login/options|verify     WebAuthn daily login
GET  /api/auth/me                               profile (name + masked phone)
```

**Recipient (no login — access via the link token):**

```
GET  /api/claim/:token                → { senderName, amountIdr, corridor, status }
POST /api/claim/:token/otp/request    send SMS OTP
POST /api/claim/:token/otp/verify     { code } → claim session
POST /api/claim/:token/payout         { method: "dana"|"gopay"|"bank"|"cash", details }
                                      → SEP-24 withdraw (interactive URL, cash code / instructions)
```

## Anchor Integration (SEP-24)

Cash-out runs the **real SEP-24 interactive withdraw protocol** against the **SDF Test
Anchor** — SEP-10 authentication, interactive flow, then an on-chain USDC payment with
memo from the settlement account. The backend:

1. Initiates the withdraw and stores the anchor transaction (`anchorTxId`, status,
   amounts, interactive URL) with the payout.
2. Polls the anchor and **pays the memo'd deposit exactly once** when the transaction
   reaches `pending_user_transfer_start`.
3. Respects anchor limits discovered via `GET /info` (the SDF Test Anchor caps USDC
   withdrawals at 10 per transaction — clamped automatically).

This matters because **MoneyGram Ramps — Stellar's cash-pickup network — uses this exact
same SEP-24 protocol**. Production cash pickup is a partner allowlist away, not a
rewrite: swap the anchor endpoint and asset, and the integration carries over unchanged.

## What Is Real vs Simulated

We keep the demo copy honest:

| Piece | Status |
|---|---|
| Escrow `deposit` / `claim` / `refund` on testnet | **REAL** — verifiable in a Stellar explorer |
| Passkey smart wallet (biometric, non-custodial) | **REAL** |
| Gasless via relayer fee-bump | **REAL** |
| SEP-24 withdraw protocol (SEP-10 → interactive → memo payment → polling) | **REAL**, against the SDF Test Anchor |
| IDR / cash settlement (DANA / GoPay / outlet) | **SIMULATED at the anchor layer** — the Test Anchor returns instructions/codes; Indonesian fiat settlement is not live |
| FX rates (MYR/HKD/JPY/USD → IDR) | **REAL rates** from an FX API, labeled as reference estimates with source + timestamp; fee comparison is an estimate |
| Recipient OTP | **REAL flow** (mock/sandbox SMS provider in dev) |
| On-ramp (sender top-up) | **MOCK** (test USDC) |
| MoneyGram Ramps | **Pending partner allowlist** — same SEP-24 integration, swap-in ready |
| KYC / licensing | Out of hackathon scope (production roadmap) |

End-to-end status: the full flow — deposit → claim → SEP-24 withdraw, plus keeper
refund, OTP guards, and sender-auth isolation — has been **exercised end-to-end on
Stellar testnet** against the deployed escrow contract and the SDF Test Anchor.

## On-Chain Proof (Testnet)

Everything below is live on Stellar testnet and clickable — the contract page lists
every `deposit` / `claim` / `refund` invocation and its transactions:

| What | Link |
|---|---|
| **Escrow contract** (✅ **source verified** on stellar.expert against this repo, `contracts/escrow`) | [`CC7HMK…M6R7`](https://stellar.expert/explorer/testnet/contract/CC7HMK6K2LYJLMXT5BLVXLJOUWZREAXTL7SRSWFS5TSOA3PZQSVJM6R7) |
| **USDC token (SAC)** held by the escrow | [`CBIELT…DAMA`](https://stellar.expert/explorer/testnet/contract/CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA) |
| **Relayer account** — fee-bumps & submits every transaction (gasless UX) | [`GAD5XL…BUYI`](https://stellar.expert/explorer/testnet/account/GAD5XLOXQY35FVI4U4ZXDE6PAS3Q5XISFT7TY2OVTBWAGM6HTYFKBUYI) |
| **Settlement account** — allowlisted `claim` destination; pays the SEP-24 anchor (with memo) | [`GAMJFA…KNOT`](https://stellar.expert/explorer/testnet/account/GAMJFAOO4R3E6TU3UTT4AH2OZUA2CC7O6LVM2YDRYYIOYNFWAHSKKNOT) |

The contract's Rust source is **verified** on stellar.expert (build reproduced from this
repository), so reviewers can diff the deployed WASM against `contracts/escrow` directly.

## Tech Stack

- **Chain:** Stellar Testnet (Soroban RPC + Horizon + friendbot)
- **Contract:** Rust, Soroban SDK, `stellar-cli`
- **Smart wallet:** passkey-based (secp256r1 / WebAuthn signer)
- **Client SDK:** `@stellar/stellar-sdk` v16
- **Stablecoin:** USDC (test asset) via the Stellar Asset Contract
- **Backend:** Node.js/TypeScript, Fastify, `@fastify/jwt`, `@simplewebauthn/server`,
  Postgres (Supabase)
- **Frontend:** Next.js (App Router) + Tailwind CSS, PWA-oriented, i18n ID/EN
- **Anchor:** SEP-24 + SEP-10 against the SDF Test Anchor
- **FX:** live FX rate API for quotes and payout math

## Repository Structure

```
contracts/   Soroban escrow contract (Rust)              → contracts/README.md
backend/     REST API + relayer + anchor bridge (TS)     → backend/README.md
frontend/    Sender app + claim page (Next.js)           → frontend/README.md
.env.example Shared configuration template
```

## Running Locally

Prerequisites: Node.js 20+, Rust + `wasm32v1-none` target, `stellar-cli`.

```bash
cp .env.example .env      # shared config — fill in testnet keys / contract id

# 1. Contract (already deployed to testnet; rebuild if needed)
cd contracts && stellar contract build      # see contracts/README.md for deploy steps

# 2. Backend — http://localhost:4000 (GET /health)
cd backend && npm install && npm run dev    # see backend/README.md for env details

# 3. Frontend — http://localhost:3000
cd frontend && npm install && NEXT_PUBLIC_API_URL=http://localhost:4000 npm run dev
```

Key shared env: `RPC_URL`, `HORIZON_URL`, `USDC_SAC`, `ESCROW_ID`, `ANCHOR_SEP24_URL`,
`RELAYER_SECRET`, `SETTLEMENT_SECRET`, `COMMITMENT_KEY`, `DATABASE_URL`. Dev mode ships
sane defaults, a mock OTP provider, and a mock on-ramp so the whole flow runs locally
against testnet.

## Roadmap

- **MoneyGram Ramps allowlist** → live cash pickup at physical outlets (same SEP-24
  integration, endpoint swap).
- **Indonesian anchor** for real IDR e-wallet/bank settlement.
- **Recipient light accounts** — remembered payout preferences, one-tap monthly claims.
- **On-chain remittance history as credit** — the foundation for micro-loans to
  remittance families (history is already recorded from day one).
- **Growth loop:** today's recipient is tomorrow's sender (a sibling going abroad);
  frequently-cashing-out village shops become cash-out agents.

## Team

Solo developer: **Kuchikamizake05** — smart contract (Soroban escrow, Rust), backend
(REST API, relayer, keeper, SEP-24 bridge, sender auth), and frontend (sender app +
claim page, Next.js).
