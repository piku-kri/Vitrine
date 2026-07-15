#![no_std]

//! Vitrine — a public, on-chain gallery registry.
//!
//! Anyone can `mint` a simple collectible entry (title + medium),
//! becoming its first owner. Ownership can be `transfer`red. This is a
//! lightweight custom registry, not a full NFT standard (no
//! approvals/operators, no royalties) — see the README for why that
//! tradeoff was made deliberately for this scope.
//!
//! Flow:
//! 1. `initialize` — the admin sets the gallery's name, once.
//! 2. `mint`       — any address mints an item under its own name.
//!    Emits a `minted` event so every connected viewer's gallery grid
//!    updates in real time without re-fetching everything.
//! 3. `transfer`   — the current owner hands the item to someone else.

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol};

#[derive(Clone)]
#[contracttype]
pub struct Item {
    pub id: u64,
    pub title: String,
    pub medium: String,
    pub image_url: String,
    pub creator: Address,
    pub owner: Address,
    pub minted_at: u64,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    GalleryName,
    TotalSupply,
    Item(u64),
}

const MINT_EVENT: Symbol = symbol_short!("minted");
const XFER_EVENT: Symbol = symbol_short!("xfer");

const MAX_TITLE_LEN: u32 = 80;
const MAX_MEDIUM_LEN: u32 = 40;
const MAX_IMAGE_URL_LEN: u32 = 200;

#[contract]
pub struct VitrineContract;

#[contractimpl]
impl VitrineContract {
    /// Name the gallery. Can only be called once per contract instance.
    pub fn initialize(env: Env, admin: Address, gallery_name: String) {
        admin.require_auth();

        if env.storage().instance().has(&DataKey::GalleryName) {
            panic!("gallery already initialized");
        }

        env.storage().instance().set(&DataKey::GalleryName, &gallery_name);
        env.storage().instance().set(&DataKey::TotalSupply, &0u64);
        env.storage().instance().extend_ttl(100_000, 518_400);
    }

    /// Mint a new item. `owner` becomes both creator and first owner —
    /// requires `owner`'s signature so it's genuinely the connected
    /// wallet minting, not an admin minting on someone's behalf.
    pub fn mint(env: Env, owner: Address, title: String, medium: String, image_url: String) -> u64 {
        owner.require_auth();

        if title.len() == 0 || title.len() > MAX_TITLE_LEN {
            panic!("title must be 1-80 characters");
        }
        if medium.len() == 0 || medium.len() > MAX_MEDIUM_LEN {
            panic!("medium must be 1-40 characters");
        }
        if image_url.len() == 0 || image_url.len() > MAX_IMAGE_URL_LEN {
            panic!("image_url must be 1-200 characters");
        }

        let mut supply: u64 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);

        let id = supply;
        let item = Item {
            id,
            title,
            medium,
            image_url,
            creator: owner.clone(),
            owner: owner.clone(),
            minted_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&DataKey::Item(id), &item);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Item(id), 100_000, 518_400);

        supply += 1;
        env.storage().instance().set(&DataKey::TotalSupply, &supply);

        env.events().publish((MINT_EVENT,), (id, owner));

        id
    }

    /// Hand an item to a new owner. Requires the current owner's
    /// signature.
    pub fn transfer(env: Env, from: Address, to: Address, id: u64) {
        from.require_auth();

        let mut item: Item = env
            .storage()
            .persistent()
            .get(&DataKey::Item(id))
            .expect("item not found");

        if item.owner != from {
            panic!("caller does not own this item");
        }

        item.owner = to.clone();
        env.storage().persistent().set(&DataKey::Item(id), &item);

        env.events().publish((XFER_EVENT,), (id, from, to));
    }

    pub fn get_item(env: Env, id: u64) -> Item {
        env.storage()
            .persistent()
            .get(&DataKey::Item(id))
            .expect("item not found")
    }

    pub fn total_supply(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::TotalSupply).unwrap_or(0)
    }

    pub fn gallery_name(env: Env) -> String {
        env.storage()
            .instance()
            .get(&DataKey::GalleryName)
            .expect("gallery not initialized")
    }
}

mod test;
