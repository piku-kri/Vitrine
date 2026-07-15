#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::Env;

fn setup(env: &Env) -> (VitrineContractClient, Address) {
    let contract_id = env.register(VitrineContract, ());
    let client = VitrineContractClient::new(env, &contract_id);
    let admin = Address::generate(env);
    client.initialize(&admin, &String::from_str(env, "Test Gallery"));
    (client, admin)
}

#[test]
fn test_mint_assigns_sequential_ids_and_ownership() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let artist = Address::generate(&env);
    let id1 = client.mint(&artist, &String::from_str(&env, "Sunset No. 1"), &String::from_str(&env, "oil on canvas"));
    let id2 = client.mint(&artist, &String::from_str(&env, "Sunset No. 2"), &String::from_str(&env, "oil on canvas"));

    assert_eq!(id1, 0);
    assert_eq!(id2, 1);
    assert_eq!(client.total_supply(), 2);

    let item = client.get_item(&id1);
    assert_eq!(item.owner, artist);
    assert_eq!(item.creator, artist);
}

#[test]
fn test_empty_title_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let artist = Address::generate(&env);
    let result = client.try_mint(&artist, &String::from_str(&env, ""), &String::from_str(&env, "ink"));
    assert!(result.is_err());
}

#[test]
fn test_transfer_changes_owner() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let artist = Address::generate(&env);
    let collector = Address::generate(&env);
    let id = client.mint(&artist, &String::from_str(&env, "Study in Blue"), &String::from_str(&env, "watercolor"));

    client.transfer(&artist, &collector, &id);

    let item = client.get_item(&id);
    assert_eq!(item.owner, collector);
    assert_eq!(item.creator, artist);
}

#[test]
fn test_non_owner_cannot_transfer() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let artist = Address::generate(&env);
    let stranger = Address::generate(&env);
    let collector = Address::generate(&env);
    let id = client.mint(&artist, &String::from_str(&env, "Study in Blue"), &String::from_str(&env, "watercolor"));

    let result = client.try_transfer(&stranger, &collector, &id);
    assert!(result.is_err());
}

#[test]
#[should_panic(expected = "gallery already initialized")]
fn test_double_initialize_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);
    client.initialize(&admin, &String::from_str(&env, "Again"));
}
