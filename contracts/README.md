# contracts/ — Soroban Escrow (Rust)

Owner: **Smart Contract** team. **Do not change function signatures without team agreement.**

## Prerequisites
- Rust + `wasm32v1-none` target
- [`stellar-cli`](https://developers.stellar.org/docs/tools/developer-tools) (formerly `soroban-cli`)

```bash
rustup target add wasm32v1-none
cargo install --locked stellar-cli
```

## Build & test
```bash
cd contracts
cargo test                 # unit tests (extend failure cases in escrow/src/test.rs)
stellar contract build     # produces .wasm in target/wasm32v1-none/release/
```

## Deploy to testnet (example)
```bash
stellar keys generate admin --network testnet --fund

# The contract runs via __constructor (no separate `init` function) — constructor args
# are supplied directly at deploy time: admin, token = the USDC SAC ACCEPTED by the anchor
# (Spike 2), anchors = [settlement account].
stellar contract deploy --wasm target/wasm32v1-none/release/escrow.wasm \
  --source admin --network testnet \
  -- --admin <ADMIN_G...> --usdc_token <USDC_SAC> --anchor_allowlist '[ "<SETTLEMENT_G...>" ]'
# -> note the CONTRACT_ID, fill it into the shared .env (ESCROW_ID)
```

## Hand off to the team
- `ESCROW_ID`, `USDC_SAC`, the allowlisted settlement address
- **Event** format (`deposit`/`claim`/`refund`) — backend reads these
- Spec/ABI from the build

## Functions
| Function | Auth | Notes |
|---|---|---|
| `__constructor` | — (once, at deploy) | sets admin, token, anchor allowlist |
| `deposit` | `sender.require_auth()` | transfers USDC→escrow; returns `escrow_id` |
| `claim` | no auth (secret+allowlist) | called by backend post-OTP |
| `refund` | permissionless | only after expiry; funds to sender |
| `get_escrow` | view | |
| `add/remove_anchor` | admin | manage the allowlist |
