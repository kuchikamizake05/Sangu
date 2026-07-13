#![cfg(test)]
//! Test skeleton — cover every path (Spike + acceptance criteria §3).
//! Run: `cargo test`.

use crate::{DataKey, EscrowContract, EscrowContractClient, EscrowStatus};
use soroban_sdk::{
    testutils::{
        storage::{Instance as _, Persistent as _},
        Address as _, Deployer as _, Ledger, MockAuth, MockAuthInvoke,
    },
    token, vec, Address, Bytes, BytesN, Env, IntoVal,
};

const TEST_BALANCE: i128 = 100_0000000;
const TEST_AMOUNT: i128 = 50_0000000;

/// Create a test USDC (SAC) + mint to `to`.
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
fn constructor_initializes_escrow_configuration() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let anchor = Address::generate(&env);
    let token = setup_token(&env, &admin, &sender, 100_0000000);
    let contract_id = env.register(EscrowContract, (admin, token, vec![&env, anchor.clone()]));
    let client = EscrowContractClient::new(&env, &contract_id);

    let secret = Bytes::from_array(&env, &[7u8; 32]);
    let hashlock = sha256_32(&env, &secret);
    let recipient_commitment = BytesN::from_array(&env, &[1u8; 32]);
    let expiry = env.ledger().timestamp() + 72 * 3600;

    let id = client.deposit(&sender, &50_0000000, &hashlock, &recipient_commitment, &expiry);
    client.claim(&id, &secret, &anchor);

    assert_eq!(client.get_escrow(&id).status, EscrowStatus::Claimed);
}

#[test]
fn constructor_binds_the_admin() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let attacker = Address::generate(&env);
    let token = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();
    let initial_anchor = Address::generate(&env);
    let attacker_anchor = Address::generate(&env);
    let contract_id = env.register(EscrowContract, (admin, token, vec![&env, initial_anchor]));
    let client = EscrowContractClient::new(&env, &contract_id);

    let result = client
        .mock_auths(&[MockAuth {
            address: &attacker,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "add_anchor",
                args: (&attacker, &attacker_anchor).into_val(&env),
                sub_invokes: &[],
            },
        }])
        .try_add_anchor(&attacker, &attacker_anchor);

    assert!(result.is_err());
}

const UPGRADE_WASM: &[u8] = include_bytes!("../test_wasm/upgrade.wasm");

#[test]
fn upgrade_requires_admin_auth_for_uploaded_wasm() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let token = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();
    let anchor = Address::generate(&env);
    let wasm_hash = env.deployer().upload_contract_wasm(UPGRADE_WASM);
    let contract_id = env.register(EscrowContract, (admin, token, vec![&env, anchor]));
    let client = EscrowContractClient::new(&env, &contract_id);

    assert!(client.try_upgrade(&wasm_hash).is_err());
}

#[test]
fn upgrade_rejects_non_admin_for_uploaded_wasm() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let attacker = Address::generate(&env);
    let token = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();
    let anchor = Address::generate(&env);
    let wasm_hash = env.deployer().upload_contract_wasm(UPGRADE_WASM);
    let contract_id = env.register(EscrowContract, (admin, token, vec![&env, anchor]));
    let client = EscrowContractClient::new(&env, &contract_id);

    let result = client
        .mock_auths(&[MockAuth {
            address: &attacker,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "upgrade",
                args: (&wasm_hash,).into_val(&env),
                sub_invokes: &[],
            },
        }])
        .try_upgrade(&wasm_hash);

    assert!(result.is_err());
}

#[test]
fn upgrade_accepts_admin_for_uploaded_wasm() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let token = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();
    let anchor = Address::generate(&env);
    let wasm_hash = env.deployer().upload_contract_wasm(UPGRADE_WASM);
    let contract_id = env.register(EscrowContract, (admin, token, vec![&env, anchor]));
    let client = EscrowContractClient::new(&env, &contract_id);

    client.upgrade(&wasm_hash);
    assert!(env.deployer().get_contract_code_ttl(&contract_id) > 0);
}

#[test]
fn happy_path_claim() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let anchor = Address::generate(&env);

    let token = setup_token(&env, &admin, &sender, 100_0000000);
    let contract_id = env.register(EscrowContract, (admin, token, vec![&env, anchor.clone()]));
    let client = EscrowContractClient::new(&env, &contract_id);

    let secret = Bytes::from_array(&env, &[7u8; 32]);
    let hashlock = sha256_32(&env, &secret);
    let recipient_commitment = BytesN::from_array(&env, &[1u8; 32]);
    let expiry = env.ledger().timestamp() + 72 * 3600;

    let id = client.deposit(&sender, &50_0000000, &hashlock, &recipient_commitment, &expiry);
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
    let contract_id = env.register(EscrowContract, (admin, token, vec![&env, anchor.clone()]));
    let client = EscrowContractClient::new(&env, &contract_id);

    let secret = Bytes::from_array(&env, &[7u8; 32]);
    let hashlock = sha256_32(&env, &secret);
    let recipient_commitment = BytesN::from_array(&env, &[1u8; 32]);
    let expiry = env.ledger().timestamp() + 100;

    let id = client.deposit(&sender, &50_0000000, &hashlock, &recipient_commitment, &expiry);

    env.ledger().set_timestamp(expiry + 1); // pass expiry
    client.refund(&id);

    assert_eq!(client.get_escrow(&id).status, EscrowStatus::Refunded);
}

#[test]
fn deposit_rejects_expiry_at_current_ledger_time_without_transferring_tokens() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(100);

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let anchor = Address::generate(&env);
    let token = setup_token(&env, &admin, &sender, 100_0000000);
    let contract_id = env.register(EscrowContract, (admin, token.clone(), vec![&env, anchor]));
    let client = EscrowContractClient::new(&env, &contract_id);
    let token_client = token::Client::new(&env, &token);
    let secret = Bytes::from_array(&env, &[7u8; 32]);
    let sender_before = token_client.balance(&sender);

    let result = client.try_deposit(
        &sender,
        &1,
        &sha256_32(&env, &secret),
        &BytesN::from_array(&env, &[1u8; 32]),
        &env.ledger().timestamp(),
    );

    assert!(result.is_err());
    assert_eq!(token_client.balance(&sender), sender_before);
    assert_eq!(token_client.balance(&contract_id), 0);
}

#[test]
fn deposit_rejects_expiry_before_current_ledger_time() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(100);

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let anchor = Address::generate(&env);
    let token = setup_token(&env, &admin, &sender, 100_0000000);
    let contract_id = env.register(EscrowContract, (admin, token, vec![&env, anchor]));
    let client = EscrowContractClient::new(&env, &contract_id);
    let secret = Bytes::from_array(&env, &[7u8; 32]);

    assert!(client
        .try_deposit(
            &sender,
            &1,
            &sha256_32(&env, &secret),
            &BytesN::from_array(&env, &[1u8; 32]),
            &(env.ledger().timestamp() - 1),
        )
        .is_err());
}

#[test]
fn deposit_rejects_expiry_beyond_storage_lifetime() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let anchor = Address::generate(&env);
    let token = setup_token(&env, &admin, &sender, TEST_BALANCE);
    let contract_id = env.register(EscrowContract, (admin, token.clone(), vec![&env, anchor]));
    let client = EscrowContractClient::new(&env, &contract_id);
    let token_client = token::Client::new(&env, &token);
    let secret = Bytes::from_array(&env, &[7u8; 32]);

    assert!(client
        .try_deposit(
            &sender,
            &TEST_AMOUNT,
            &sha256_32(&env, &secret),
            &BytesN::from_array(&env, &[1u8; 32]),
            &(env.ledger().timestamp() + 90 * 24 * 60 * 60 + 1),
        )
        .is_err());
    assert_eq!(token_client.balance(&sender), TEST_BALANCE);
    assert_eq!(token_client.balance(&contract_id), 0);
}

#[test]
fn deposit_rejects_zero_amount_without_transferring_tokens() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let anchor = Address::generate(&env);
    let token = setup_token(&env, &admin, &sender, TEST_BALANCE);
    let contract_id = env.register(EscrowContract, (admin, token.clone(), vec![&env, anchor]));
    let client = EscrowContractClient::new(&env, &contract_id);
    let token_client = token::Client::new(&env, &token);
    let secret = Bytes::from_array(&env, &[7u8; 32]);
    let sender_before = token_client.balance(&sender);

    assert!(client
        .try_deposit(
            &sender,
            &0,
            &sha256_32(&env, &secret),
            &BytesN::from_array(&env, &[1u8; 32]),
            &(env.ledger().timestamp() + 1),
        )
        .is_err());
    assert_eq!(token_client.balance(&sender), sender_before);
    assert_eq!(token_client.balance(&contract_id), 0);
}

#[test]
fn deposit_rejects_negative_amount_without_transferring_tokens() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let anchor = Address::generate(&env);
    let token = setup_token(&env, &admin, &sender, TEST_BALANCE);
    let contract_id = env.register(EscrowContract, (admin, token.clone(), vec![&env, anchor]));
    let client = EscrowContractClient::new(&env, &contract_id);
    let token_client = token::Client::new(&env, &token);
    let secret = Bytes::from_array(&env, &[7u8; 32]);
    let sender_before = token_client.balance(&sender);

    assert!(client
        .try_deposit(
            &sender,
            &-1,
            &sha256_32(&env, &secret),
            &BytesN::from_array(&env, &[1u8; 32]),
            &(env.ledger().timestamp() + 1),
        )
        .is_err());
    assert_eq!(token_client.balance(&sender), sender_before);
    assert_eq!(token_client.balance(&contract_id), 0);
}

#[test]
fn claim_rejects_bad_secret_without_transferring_tokens() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let anchor = Address::generate(&env);
    let token = setup_token(&env, &admin, &sender, TEST_BALANCE);
    let contract_id = env.register(
        EscrowContract,
        (admin, token.clone(), vec![&env, anchor.clone()]),
    );
    let client = EscrowContractClient::new(&env, &contract_id);
    let token_client = token::Client::new(&env, &token);
    let secret = Bytes::from_array(&env, &[7u8; 32]);
    let bad_secret = Bytes::from_array(&env, &[8u8; 32]);
    let id = client.deposit(
        &sender,
        &TEST_AMOUNT,
        &sha256_32(&env, &secret),
        &BytesN::from_array(&env, &[1u8; 32]),
        &(env.ledger().timestamp() + 1),
    );
    let contract_before = token_client.balance(&contract_id);
    let anchor_before = token_client.balance(&anchor);

    assert!(client.try_claim(&id, &bad_secret, &anchor).is_err());
    assert_eq!(token_client.balance(&contract_id), contract_before);
    assert_eq!(token_client.balance(&anchor), anchor_before);
}

#[test]
fn claim_rejects_destination_outside_allowlist_without_transferring_tokens() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let anchor = Address::generate(&env);
    let destination = Address::generate(&env);
    let token = setup_token(&env, &admin, &sender, TEST_BALANCE);
    let contract_id = env.register(EscrowContract, (admin, token.clone(), vec![&env, anchor]));
    let client = EscrowContractClient::new(&env, &contract_id);
    let token_client = token::Client::new(&env, &token);
    let secret = Bytes::from_array(&env, &[7u8; 32]);
    let id = client.deposit(
        &sender,
        &TEST_AMOUNT,
        &sha256_32(&env, &secret),
        &BytesN::from_array(&env, &[1u8; 32]),
        &(env.ledger().timestamp() + 1),
    );
    let contract_before = token_client.balance(&contract_id);
    let destination_before = token_client.balance(&destination);

    assert!(client.try_claim(&id, &secret, &destination).is_err());
    assert_eq!(token_client.balance(&contract_id), contract_before);
    assert_eq!(token_client.balance(&destination), destination_before);
}

#[test]
fn claim_rejects_at_expiry_boundary() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let anchor = Address::generate(&env);
    let token = setup_token(&env, &admin, &sender, TEST_BALANCE);
    let contract_id = env.register(EscrowContract, (admin, token, vec![&env, anchor.clone()]));
    let client = EscrowContractClient::new(&env, &contract_id);
    let secret = Bytes::from_array(&env, &[7u8; 32]);
    let expiry = env.ledger().timestamp() + 1;
    let id = client.deposit(
        &sender,
        &TEST_AMOUNT,
        &sha256_32(&env, &secret),
        &BytesN::from_array(&env, &[1u8; 32]),
        &expiry,
    );

    env.ledger().set_timestamp(expiry);
    assert!(client.try_claim(&id, &secret, &anchor).is_err());
}

#[test]
fn refund_succeeds_at_expiry_boundary_and_restores_sender_balance() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let anchor = Address::generate(&env);
    let token = setup_token(&env, &admin, &sender, TEST_BALANCE);
    let contract_id = env.register(EscrowContract, (admin, token.clone(), vec![&env, anchor]));
    let client = EscrowContractClient::new(&env, &contract_id);
    let token_client = token::Client::new(&env, &token);
    let secret = Bytes::from_array(&env, &[7u8; 32]);
    let expiry = env.ledger().timestamp() + 1;
    let id = client.deposit(
        &sender,
        &TEST_AMOUNT,
        &sha256_32(&env, &secret),
        &BytesN::from_array(&env, &[1u8; 32]),
        &expiry,
    );

    env.ledger().set_timestamp(expiry);
    client.refund(&id);

    assert_eq!(client.get_escrow(&id).status, EscrowStatus::Refunded);
    assert_eq!(token_client.balance(&sender), TEST_BALANCE);
    assert_eq!(token_client.balance(&contract_id), 0);
}

#[test]
fn claim_is_permissionless_after_authorized_deposit() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let anchor = Address::generate(&env);
    let token = setup_token(&env, &admin, &sender, TEST_BALANCE);
    let contract_id = env.register(EscrowContract, (admin, token, vec![&env, anchor.clone()]));
    let client = EscrowContractClient::new(&env, &contract_id);
    let secret = Bytes::from_array(&env, &[7u8; 32]);
    let id = client.deposit(
        &sender,
        &TEST_AMOUNT,
        &sha256_32(&env, &secret),
        &BytesN::from_array(&env, &[1u8; 32]),
        &(env.ledger().timestamp() + 1),
    );

    client.mock_auths(&[]).claim(&id, &secret, &anchor);

    assert_eq!(client.get_escrow(&id).status, EscrowStatus::Claimed);
}

#[test]
fn claim_cannot_run_twice_and_transfers_full_balance_to_anchor() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let anchor = Address::generate(&env);
    let token = setup_token(&env, &admin, &sender, TEST_BALANCE);
    let contract_id = env.register(
        EscrowContract,
        (admin, token.clone(), vec![&env, anchor.clone()]),
    );
    let client = EscrowContractClient::new(&env, &contract_id);
    let token_client = token::Client::new(&env, &token);
    let secret = Bytes::from_array(&env, &[7u8; 32]);
    let anchor_before = token_client.balance(&anchor);
    let id = client.deposit(
        &sender,
        &TEST_AMOUNT,
        &sha256_32(&env, &secret),
        &BytesN::from_array(&env, &[1u8; 32]),
        &(env.ledger().timestamp() + 1),
    );

    client.claim(&id, &secret, &anchor);

    assert_eq!(token_client.balance(&sender), TEST_BALANCE - TEST_AMOUNT);
    assert_eq!(token_client.balance(&contract_id), 0);
    assert_eq!(token_client.balance(&anchor), anchor_before + TEST_AMOUNT);
    assert!(client.try_claim(&id, &secret, &anchor).is_err());
}

#[test]
fn refund_is_permissionless_after_expiry() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let anchor = Address::generate(&env);
    let token = setup_token(&env, &admin, &sender, TEST_BALANCE);
    let contract_id = env.register(EscrowContract, (admin, token, vec![&env, anchor]));
    let client = EscrowContractClient::new(&env, &contract_id);
    let secret = Bytes::from_array(&env, &[7u8; 32]);
    let expiry = env.ledger().timestamp() + 1;
    let id = client.deposit(
        &sender,
        &TEST_AMOUNT,
        &sha256_32(&env, &secret),
        &BytesN::from_array(&env, &[1u8; 32]),
        &expiry,
    );

    env.ledger().set_timestamp(expiry);
    client.mock_auths(&[]).refund(&id);

    assert_eq!(client.get_escrow(&id).status, EscrowStatus::Refunded);
}

#[test]
fn refund_rejects_before_expiry_without_transferring_tokens() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let anchor = Address::generate(&env);
    let token = setup_token(&env, &admin, &sender, TEST_BALANCE);
    let contract_id = env.register(EscrowContract, (admin, token.clone(), vec![&env, anchor]));
    let client = EscrowContractClient::new(&env, &contract_id);
    let token_client = token::Client::new(&env, &token);
    let secret = Bytes::from_array(&env, &[7u8; 32]);
    let expiry = env.ledger().timestamp() + 1;
    let id = client.deposit(
        &sender,
        &TEST_AMOUNT,
        &sha256_32(&env, &secret),
        &BytesN::from_array(&env, &[1u8; 32]),
        &expiry,
    );

    assert!(client.try_refund(&id).is_err());
    assert_eq!(client.get_escrow(&id).status, EscrowStatus::Pending);
    assert_eq!(token_client.balance(&sender), TEST_BALANCE - TEST_AMOUNT);
    assert_eq!(token_client.balance(&contract_id), TEST_AMOUNT);
}

#[test]
fn refund_cannot_run_twice() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let anchor = Address::generate(&env);
    let token = setup_token(&env, &admin, &sender, TEST_BALANCE);
    let contract_id = env.register(EscrowContract, (admin, token, vec![&env, anchor]));
    let client = EscrowContractClient::new(&env, &contract_id);
    let secret = Bytes::from_array(&env, &[7u8; 32]);
    let expiry = env.ledger().timestamp() + 1;
    let id = client.deposit(
        &sender,
        &TEST_AMOUNT,
        &sha256_32(&env, &secret),
        &BytesN::from_array(&env, &[1u8; 32]),
        &expiry,
    );

    env.ledger().set_timestamp(expiry);
    client.refund(&id);

    assert!(client.try_refund(&id).is_err());
}

#[test]
fn escrow_access_refreshes_instance_and_persistent_ttl() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let anchor = Address::generate(&env);
    let token = setup_token(&env, &admin, &sender, TEST_BALANCE);
    let contract_id = env.register(EscrowContract, (admin, token, vec![&env, anchor]));
    let client = EscrowContractClient::new(&env, &contract_id);
    let secret = Bytes::from_array(&env, &[7u8; 32]);
    let id = client.deposit(
        &sender,
        &TEST_AMOUNT,
        &sha256_32(&env, &secret),
        &BytesN::from_array(&env, &[1u8; 32]),
        &(env.ledger().timestamp() + 1),
    );

    let initial_instance_ttl = env.as_contract(&contract_id, || env.storage().instance().get_ttl());
    env.ledger()
        .set_sequence_number(env.ledger().sequence() + initial_instance_ttl - 518_400 + 1);

    client.get_escrow(&id);

    let instance_ttl = env.as_contract(&contract_id, || env.storage().instance().get_ttl());
    let escrow_ttl = env.as_contract(&contract_id, || {
        env.storage().persistent().get_ttl(&DataKey::Escrow(id))
    });

    assert!(instance_ttl >= 2_073_600);
    assert!(escrow_ttl >= 2_073_600);
}

#[test]
fn deposit_requires_sender_auth() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let anchor = Address::generate(&env);
    let token = setup_token(&env, &admin, &sender, TEST_BALANCE);
    let contract_id = env.register(EscrowContract, (admin, token, vec![&env, anchor]));
    let client = EscrowContractClient::new(&env, &contract_id);
    let secret = Bytes::from_array(&env, &[7u8; 32]);

    let result = client.mock_auths(&[]).try_deposit(
        &sender,
        &TEST_AMOUNT,
        &sha256_32(&env, &secret),
        &BytesN::from_array(&env, &[1u8; 32]),
        &(env.ledger().timestamp() + 1),
    );

    assert!(result.is_err());
}

#[test]
fn admin_can_add_and_remove_anchor_for_claims() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let initial_anchor = Address::generate(&env);
    let added_anchor = Address::generate(&env);
    let token = setup_token(&env, &admin, &sender, TEST_BALANCE);
    let contract_id = env.register(
        EscrowContract,
        (admin.clone(), token, vec![&env, initial_anchor]),
    );
    let client = EscrowContractClient::new(&env, &contract_id);
    let secret = Bytes::from_array(&env, &[7u8; 32]);

    client.add_anchor(&admin, &added_anchor);
    let first_id = client.deposit(
        &sender,
        &TEST_AMOUNT,
        &sha256_32(&env, &secret),
        &BytesN::from_array(&env, &[1u8; 32]),
        &(env.ledger().timestamp() + 1),
    );
    client.claim(&first_id, &secret, &added_anchor);

    client.remove_anchor(&admin, &added_anchor);
    let second_id = client.deposit(
        &sender,
        &TEST_AMOUNT,
        &sha256_32(&env, &secret),
        &BytesN::from_array(&env, &[2u8; 32]),
        &(env.ledger().timestamp() + 1),
    );

    assert!(client
        .try_claim(&second_id, &secret, &added_anchor)
        .is_err());
}

#[test]
fn remove_anchor_rejects_non_admin() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let attacker = Address::generate(&env);
    let anchor = Address::generate(&env);
    let token = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();
    let contract_id = env.register(EscrowContract, (admin, token, vec![&env, anchor.clone()]));
    let client = EscrowContractClient::new(&env, &contract_id);

    let result = client
        .mock_auths(&[MockAuth {
            address: &attacker,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "remove_anchor",
                args: (&attacker, &anchor).into_val(&env),
                sub_invokes: &[],
            },
        }])
        .try_remove_anchor(&attacker, &anchor);

    assert!(result.is_err());
}
