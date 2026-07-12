#![no_std]
//! Sangu — Escrow contract (non-custodial link-claim + timelock refund).
//!
//! Interface = source of truth di docs/spesifikasi-teknis-pembagian-kerja.md §2.1.
//! JANGAN ubah signature tanpa kesepakatan tim (mengikat backend & frontend).
//!
//! Model otorisasi:
//! - deposit : sender.require_auth() (passkey smart wallet). Fee dibayar relayer (fee-bump).
//! - claim   : TANPA require_auth. Keamanan = secret (hashlock) + destination ∈ allowlist.
//! - refund  : permissionless. Dana HANYA balik ke sender.
//!
//! NOTE: skeleton — verifikasi terhadap versi soroban-sdk kamu via `cargo test`.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, token,
    Address, Bytes, BytesN, Env, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    NotFound = 1,
    AlreadySettled = 2,
    Expired = 3,
    NotYetExpired = 4,
    BadSecret = 5,
    DestinationNotAllowed = 6,
    Unauthorized = 7,
    InsufficientAmount = 8,
    NotInitialized = 9,
    AlreadyInitialized = 10,
}

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum EscrowStatus {
    Pending,
    Claimed,
    Refunded,
}

#[contracttype]
#[derive(Clone)]
pub struct Escrow {
    pub sender: Address,
    pub amount: i128,          // USDC, 7 desimal (stroops)
    pub hashlock: BytesN<32>,  // sha256(secret) — secret dipegang backend
    pub phone_hash: BytesN<32>,// sha256(nomor HP E.164)
    pub expiry: u64,           // unix seconds (ledger timestamp)
    pub status: EscrowStatus,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Token,        // Address SAC USDC
    Anchors,      // Vec<Address> allowlist tujuan payout
    Counter,      // u64 escrow id terakhir
    Escrow(u64),  // escrow_id -> Escrow
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// Dipanggil sekali saat deploy.
    pub fn init(env: Env, admin: Address, usdc_token: Address, anchor_allowlist: Vec<Address>) {
        let store = env.storage().instance();
        if store.has(&DataKey::Admin) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        store.set(&DataKey::Admin, &admin);
        store.set(&DataKey::Token, &usdc_token);
        store.set(&DataKey::Anchors, &anchor_allowlist);
        store.set(&DataKey::Counter, &0u64);
    }

    /// PENGIRIM menyetor dana ke escrow. Return escrow_id.
    pub fn deposit(
        env: Env,
        sender: Address,
        amount: i128,
        hashlock: BytesN<32>,
        phone_hash: BytesN<32>,
        expiry: u64,
    ) -> u64 {
        sender.require_auth();
        if amount <= 0 {
            panic_with_error!(&env, Error::InsufficientAmount);
        }

        let token_addr = Self::token(&env);
        token::Client::new(&env, &token_addr).transfer(
            &sender,
            &env.current_contract_address(),
            &amount,
        );

        let mut id: u64 = env.storage().instance().get(&DataKey::Counter).unwrap_or(0);
        id += 1;
        env.storage().instance().set(&DataKey::Counter, &id);

        let escrow = Escrow {
            sender: sender.clone(),
            amount,
            hashlock,
            phone_hash,
            expiry,
            status: EscrowStatus::Pending,
        };
        env.storage().persistent().set(&DataKey::Escrow(id), &escrow);

        env.events()
            .publish((symbol_short!("deposit"), id), (sender, amount, expiry));
        id
    }

    /// CLAIM oleh backend setelah OTP. `secret` membuka hashlock; `payout_destination` wajib ∈ allowlist.
    pub fn claim(env: Env, escrow_id: u64, secret: Bytes, payout_destination: Address) {
        let key = DataKey::Escrow(escrow_id);
        let mut escrow = Self::load(&env, &key);

        if escrow.status != EscrowStatus::Pending {
            panic_with_error!(&env, Error::AlreadySettled);
        }
        if env.ledger().timestamp() >= escrow.expiry {
            panic_with_error!(&env, Error::Expired);
        }
        // verifikasi secret
        let computed: BytesN<32> = env.crypto().sha256(&secret).into();
        if computed != escrow.hashlock {
            panic_with_error!(&env, Error::BadSecret);
        }
        // destination harus anchor allowlist
        let anchors: Vec<Address> = env.storage().instance().get(&DataKey::Anchors).unwrap();
        if !anchors.contains(&payout_destination) {
            panic_with_error!(&env, Error::DestinationNotAllowed);
        }

        let token_addr = Self::token(&env);
        token::Client::new(&env, &token_addr).transfer(
            &env.current_contract_address(),
            &payout_destination,
            &escrow.amount,
        );

        escrow.status = EscrowStatus::Claimed;
        env.storage().persistent().set(&key, &escrow);
        env.events().publish(
            (symbol_short!("claim"), escrow_id),
            (payout_destination, escrow.amount),
        );
    }

    /// REFUND — permissionless setelah expiry; dana hanya ke sender.
    pub fn refund(env: Env, escrow_id: u64) {
        let key = DataKey::Escrow(escrow_id);
        let mut escrow = Self::load(&env, &key);

        if escrow.status != EscrowStatus::Pending {
            panic_with_error!(&env, Error::AlreadySettled);
        }
        if env.ledger().timestamp() < escrow.expiry {
            panic_with_error!(&env, Error::NotYetExpired);
        }

        let token_addr = Self::token(&env);
        token::Client::new(&env, &token_addr).transfer(
            &env.current_contract_address(),
            &escrow.sender,
            &escrow.amount,
        );

        escrow.status = EscrowStatus::Refunded;
        env.storage().persistent().set(&key, &escrow);
        env.events().publish(
            (symbol_short!("refund"), escrow_id),
            (escrow.sender.clone(), escrow.amount),
        );
    }

    pub fn get_escrow(env: Env, escrow_id: u64) -> Escrow {
        Self::load(&env, &DataKey::Escrow(escrow_id))
    }

    pub fn add_anchor(env: Env, admin: Address, anchor: Address) {
        Self::require_admin(&env, &admin);
        let mut anchors: Vec<Address> = env.storage().instance().get(&DataKey::Anchors).unwrap();
        anchors.push_back(anchor);
        env.storage().instance().set(&DataKey::Anchors, &anchors);
    }

    pub fn remove_anchor(env: Env, admin: Address, anchor: Address) {
        Self::require_admin(&env, &admin);
        let anchors: Vec<Address> = env.storage().instance().get(&DataKey::Anchors).unwrap();
        let mut next = Vec::new(&env);
        for a in anchors.iter() {
            if a != anchor {
                next.push_back(a);
            }
        }
        env.storage().instance().set(&DataKey::Anchors, &next);
    }

    // ── helper ──────────────────────────────────────────────────────────────
    fn load(env: &Env, key: &DataKey) -> Escrow {
        env.storage()
            .persistent()
            .get(key)
            .unwrap_or_else(|| panic_with_error!(env, Error::NotFound))
    }

    fn token(env: &Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Token)
            .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
    }

    fn require_admin(env: &Env, admin: &Address) {
        admin.require_auth();
        let stored: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized));
        if stored != *admin {
            panic_with_error!(env, Error::Unauthorized);
        }
    }
}

mod test;
