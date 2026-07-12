#![cfg(test)]
//! Test skeleton — lengkapi tiap jalur (Spike + acceptance criteria §3).
//! Jalankan: `cargo test`.

use crate::{EscrowContract, EscrowContractClient, EscrowStatus};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token, vec, Address, Bytes, BytesN, Env,
};

/// Buat USDC test (SAC) + mint ke `to`.
fn setup_token(env: &Env, admin: &Address, to: &Address, amount: i128) -> Address {
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token_admin = token::StellarAssetClient::new(env, &sac.address());
    token_admin.mint(to, &amount);
    sac.address()
}

fn sha256_32(env: &Env, secret: &Bytes) -> BytesN<32> {
    env.crypto().sha256(secret).into()
}

#[test]
fn happy_path_claim() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let anchor = Address::generate(&env);

    let token = setup_token(&env, &admin, &sender, 100_0000000);
    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(&env, &contract_id);
    client.init(&admin, &token, &vec![&env, anchor.clone()]);

    let secret = Bytes::from_array(&env, &[7u8; 32]);
    let hashlock = sha256_32(&env, &secret);
    let commitment = BytesN::from_array(&env, &[1u8; 32]); // HMAC server-side (uji: dummy)
    let expiry = env.ledger().timestamp() + 72 * 3600;

    let id = client.deposit(&sender, &50_0000000, &hashlock, &commitment, &expiry);
    client.claim(&id, &secret, &anchor);

    assert_eq!(client.get_escrow(&id).status, EscrowStatus::Claimed);
}

#[test]
fn refund_after_expiry() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let anchor = Address::generate(&env);

    let token = setup_token(&env, &admin, &sender, 100_0000000);
    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(&env, &contract_id);
    client.init(&admin, &token, &vec![&env, anchor.clone()]);

    let secret = Bytes::from_array(&env, &[7u8; 32]);
    let hashlock = sha256_32(&env, &secret);
    let commitment = BytesN::from_array(&env, &[1u8; 32]); // HMAC server-side (uji: dummy)
    let expiry = env.ledger().timestamp() + 100;

    let id = client.deposit(&sender, &50_0000000, &hashlock, &commitment, &expiry);

    env.ledger().set_timestamp(expiry + 1); // lewati expiry
    client.refund(&id);

    assert_eq!(client.get_escrow(&id).status, EscrowStatus::Refunded);
}

// TODO: bad_secret, destination_not_allowed, double_claim, claim_after_expiry, refund_before_expiry
