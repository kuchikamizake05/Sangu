# contracts/ — Soroban Escrow (Rust)

Owner: tim **Smart Contract**. Interface = `docs/spesifikasi-teknis-pembagian-kerja.md` §2.1
(**jangan ubah signature tanpa kesepakatan tim**).

## Prasyarat
- Rust + target `wasm32v1-none`
- [`stellar-cli`](https://developers.stellar.org/docs/tools/developer-tools) (dulu `soroban-cli`)

```bash
rustup target add wasm32v1-none
cargo install --locked stellar-cli
```

## Build & test
```bash
cd contracts
cargo test                 # unit test (lengkapi kasus gagal di escrow/src/test.rs)
stellar contract build     # hasilkan .wasm di target/wasm32v1-none/release/
```

## Deploy ke testnet (contoh)
```bash
stellar keys generate admin --network testnet --fund

# Kontrak dijalankan via __constructor (tidak ada fungsi `init` terpisah) — arg constructor
# diberikan langsung saat deploy: admin, token = SAC USDC yang DITERIMA anchor (Spike 2),
# anchors = [settlement account].
stellar contract deploy --wasm target/wasm32v1-none/release/escrow.wasm \
  --source admin --network testnet \
  -- --admin <ADMIN_G...> --usdc_token <USDC_SAC> --anchor_allowlist '[ "<SETTLEMENT_G...>" ]'
# -> catat CONTRACT_ID, isi ke .env bersama (ESCROW_ID)
```

## Serahkan ke tim
- `ESCROW_ID`, `USDC_SAC`, address settlement yang di-allowlist
- Format **event** (`deposit`/`claim`/`refund`) — backend membacanya
- Spec/ABI hasil build

## Fungsi
| Fungsi | Auth | Catatan |
|---|---|---|
| `__constructor` | — (sekali, saat deploy) | set admin, token, anchor allowlist |
| `deposit` | `sender.require_auth()` | transfer USDC→escrow; return `escrow_id` |
| `claim` | tanpa auth (secret+allowlist) | dipanggil backend pasca-OTP |
| `refund` | permissionless | hanya setelah expiry; dana ke sender |
| `get_escrow` | view | |
| `add/remove_anchor` | admin | kelola allowlist |
