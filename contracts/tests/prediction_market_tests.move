#[test_only]
module chess_escrow::prediction_market_tests {
    use chess_escrow::prediction_market;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::{Self, AptosCoin};
    use std::signer;
    use aptos_framework::account;

    // Test constants
    const OUTCOME_PLAYER1: u8 = 1;
    const OUTCOME_PLAYER2: u8 = 2;
    const OUTCOME_DRAW: u8 = 3;
    const STATUS_ACTIVE: u8 = 1;
    const STATUS_RESOLVED: u8 = 2;

    // Error codes
    const EMARKET_NOT_FOUND: u64 = 2;
    const EMARKET_ALREADY_EXISTS: u64 = 3;
    const EMARKET_ALREADY_RESOLVED: u64 = 4;
    const EINVALID_OUTCOME: u64 = 5;
    const EZERO_BET: u64 = 6;
    const ENOT_RESOLVED: u64 = 7;
    const ENO_SHARES: u64 = 8;
    const EALREADY_CLAIMED: u64 = 9;

    /// Setup function for tests
    fun setup_test(
        aptos_framework: &signer,
        admin: &signer,
        user1: &signer,
        user2: &signer,
        user3: &signer,
    ) {
        // Initialize the accounts
        account::create_account_for_test(signer::address_of(aptos_framework));
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user1));
        account::create_account_for_test(signer::address_of(user2));
        account::create_account_for_test(signer::address_of(user3));

        // Initialize AptosCoin
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(aptos_framework);

        // Register and mint coins for users
        coin::register<AptosCoin>(admin);
        coin::register<AptosCoin>(user1);
        coin::register<AptosCoin>(user2);
        coin::register<AptosCoin>(user3);

        aptos_coin::mint(aptos_framework, signer::address_of(admin), 1000000);
        aptos_coin::mint(aptos_framework, signer::address_of(user1), 1000000);
        aptos_coin::mint(aptos_framework, signer::address_of(user2), 1000000);
        aptos_coin::mint(aptos_framework, signer::address_of(user3), 1000000);

        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @chess_escrow)]
    /// Test: Initialize market store
    fun test_initialize(aptos_framework: &signer, admin: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        prediction_market::initialize(admin);
        
        // Verify initialization by checking if we can create a market
        let player1 = @0x123;
        let player2 = @0x456;
        prediction_market::create_market(admin, 1, player1, player2);
        
        assert!(prediction_market::market_exists(signer::address_of(admin), 1), 0);
    }

    #[test(aptos_framework = @0x1, admin = @chess_escrow)]
    /// Test: Create market successfully
    fun test_create_market(aptos_framework: &signer, admin: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        prediction_market::initialize(admin);
        
        let match_id = 1;
        let player1 = @0x123;
        let player2 = @0x456;
        
        prediction_market::create_market(admin, match_id, player1, player2);
        
        // Verify market exists
        assert!(prediction_market::market_exists(signer::address_of(admin), match_id), 0);
        
        // Verify market stats
        let (status, winning_outcome, total_pool, p1_shares, p2_shares, draw_shares) = 
            prediction_market::get_market_stats(signer::address_of(admin), match_id);
        
        assert!(status == STATUS_ACTIVE, 1);
        assert!(winning_outcome == 0, 2);
        assert!(total_pool == 0, 3);
        assert!(p1_shares == 0, 4);
        assert!(p2_shares == 0, 5);
        assert!(draw_shares == 0, 6);
    }

    #[test(aptos_framework = @0x1, admin = @chess_escrow)]
    #[expected_failure(abort_code = EMARKET_ALREADY_EXISTS, location = chess_escrow::prediction_market)]
    /// Test: Cannot create duplicate market
    fun test_create_duplicate_market(aptos_framework: &signer, admin: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        prediction_market::initialize(admin);
        
        let match_id = 1;
        let player1 = @0x123;
        let player2 = @0x456;
        
        prediction_market::create_market(admin, match_id, player1, player2);
        prediction_market::create_market(admin, match_id, player1, player2); // Should fail
    }

    #[test(aptos_framework = @0x1, admin = @chess_escrow, user1 = @0x123)]
    /// Test: Place bet successfully
    fun test_place_bet(aptos_framework: &signer, admin: &signer, user1: &signer) {
        setup_test(aptos_framework, admin, user1, user1, user1);
        prediction_market::initialize(admin);
        
        let match_id = 1;
        let player1 = @0x789;
        let player2 = @0xabc;
        
        prediction_market::create_market(admin, match_id, player1, player2);
        
        let bet_amount = 1000;
        let initial_balance = coin::balance<AptosCoin>(signer::address_of(user1));
        
        // Place bet on player1
        prediction_market::bet(user1, signer::address_of(admin), match_id, OUTCOME_PLAYER1, bet_amount);
        
        // Verify balance decreased
        let final_balance = coin::balance<AptosCoin>(signer::address_of(user1));
        assert!(final_balance == initial_balance - bet_amount, 0);
        
        // Verify market stats updated
        let (_, _, total_pool, p1_shares, _, _) = 
            prediction_market::get_market_stats(signer::address_of(admin), match_id);
        assert!(total_pool == bet_amount, 1);
        assert!(p1_shares == bet_amount, 2);
        
        // Verify user shares
        let user_shares = prediction_market::get_user_shares(
            signer::address_of(admin), 
            match_id, 
            OUTCOME_PLAYER1, 
            signer::address_of(user1)
        );
        assert!(user_shares == bet_amount, 3);
    }

    #[test(aptos_framework = @0x1, admin = @chess_escrow, user1 = @0x123)]
    #[expected_failure(abort_code = EZERO_BET, location = chess_escrow::prediction_market)]
    /// Test: Cannot place zero bet
    fun test_zero_bet(aptos_framework: &signer, admin: &signer, user1: &signer) {
        setup_test(aptos_framework, admin, user1, user1, user1);
        prediction_market::initialize(admin);
        
        let match_id = 1;
        prediction_market::create_market(admin, match_id, @0x789, @0xabc);
        
        prediction_market::bet(user1, signer::address_of(admin), match_id, OUTCOME_PLAYER1, 0);
    }

    #[test(aptos_framework = @0x1, admin = @chess_escrow, user1 = @0x123)]
    #[expected_failure(abort_code = EINVALID_OUTCOME, location = chess_escrow::prediction_market)]
    /// Test: Cannot bet on invalid outcome
    fun test_invalid_outcome(aptos_framework: &signer, admin: &signer, user1: &signer) {
        setup_test(aptos_framework, admin, user1, user1, user1);
        prediction_market::initialize(admin);
        
        let match_id = 1;
        prediction_market::create_market(admin, match_id, @0x789, @0xabc);
        
        prediction_market::bet(user1, signer::address_of(admin), match_id, 99, 1000);
    }

    #[test(aptos_framework = @0x1, admin = @chess_escrow, user1 = @0x123, user2 = @0x456)]
    /// Test: Multiple users place bets
    fun test_multiple_bets(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) {
        setup_test(aptos_framework, admin, user1, user2, user2);
        prediction_market::initialize(admin);
        
        let match_id = 1;
        prediction_market::create_market(admin, match_id, @0x789, @0xabc);
        
        // User1 bets on player1
        prediction_market::bet(user1, signer::address_of(admin), match_id, OUTCOME_PLAYER1, 1000);
        
        // User2 bets on player2
        prediction_market::bet(user2, signer::address_of(admin), match_id, OUTCOME_PLAYER2, 2000);
        
        // Verify market stats
        let (_, _, total_pool, p1_shares, p2_shares, _) = 
            prediction_market::get_market_stats(signer::address_of(admin), match_id);
        
        assert!(total_pool == 3000, 0);
        assert!(p1_shares == 1000, 1);
        assert!(p2_shares == 2000, 2);
    }

    #[test(aptos_framework = @0x1, admin = @chess_escrow, user1 = @0x123)]
    /// Test: User can bet multiple times
    fun test_multiple_bets_same_user(aptos_framework: &signer, admin: &signer, user1: &signer) {
        setup_test(aptos_framework, admin, user1, user1, user1);
        prediction_market::initialize(admin);
        
        let match_id = 1;
        prediction_market::create_market(admin, match_id, @0x789, @0xabc);
        
        // Place first bet
        prediction_market::bet(user1, signer::address_of(admin), match_id, OUTCOME_PLAYER1, 1000);
        
        // Place second bet
        prediction_market::bet(user1, signer::address_of(admin), match_id, OUTCOME_PLAYER1, 500);
        
        // Verify total shares
        let user_shares = prediction_market::get_user_shares(
            signer::address_of(admin), 
            match_id, 
            OUTCOME_PLAYER1, 
            signer::address_of(user1)
        );
        assert!(user_shares == 1500, 0);
    }

    #[test(aptos_framework = @0x1, admin = @chess_escrow)]
    /// Test: Resolve market successfully
    fun test_resolve_market(aptos_framework: &signer, admin: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        prediction_market::initialize(admin);
        
        let match_id = 1;
        prediction_market::create_market(admin, match_id, @0x789, @0xabc);
        
        // Resolve market
        prediction_market::resolve_market(admin, match_id, OUTCOME_PLAYER1);
        
        // Verify market is resolved
        let (status, winning_outcome, _, _, _, _) = 
            prediction_market::get_market_stats(signer::address_of(admin), match_id);
        
        assert!(status == STATUS_RESOLVED, 0);
        assert!(winning_outcome == OUTCOME_PLAYER1, 1);
    }

    #[test(aptos_framework = @0x1, admin = @chess_escrow)]
    #[expected_failure(abort_code = EMARKET_ALREADY_RESOLVED, location = chess_escrow::prediction_market)]
    /// Test: Cannot resolve market twice
    fun test_resolve_twice(aptos_framework: &signer, admin: &signer) {
        account::create_account_for_test(signer::address_of(admin));
        prediction_market::initialize(admin);
        
        let match_id = 1;
        prediction_market::create_market(admin, match_id, @0x789, @0xabc);
        
        prediction_market::resolve_market(admin, match_id, OUTCOME_PLAYER1);
        prediction_market::resolve_market(admin, match_id, OUTCOME_PLAYER2); // Should fail
    }

    #[test(aptos_framework = @0x1, admin = @chess_escrow, user1 = @0x123)]
    #[expected_failure(abort_code = EMARKET_ALREADY_RESOLVED, location = chess_escrow::prediction_market)]
    /// Test: Cannot bet after market is resolved
    fun test_bet_after_resolve(aptos_framework: &signer, admin: &signer, user1: &signer) {
        setup_test(aptos_framework, admin, user1, user1, user1);
        prediction_market::initialize(admin);
        
        let match_id = 1;
        prediction_market::create_market(admin, match_id, @0x789, @0xabc);
        
        prediction_market::resolve_market(admin, match_id, OUTCOME_PLAYER1);
        prediction_market::bet(user1, signer::address_of(admin), match_id, OUTCOME_PLAYER1, 1000);
    }

    #[test(aptos_framework = @0x1, admin = @chess_escrow, user1 = @0x123, user2 = @0x456)]
    /// Test: Claim rewards successfully
    fun test_claim_rewards(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) {
        setup_test(aptos_framework, admin, user1, user2, user2);
        prediction_market::initialize(admin);
        
        let match_id = 1;
        prediction_market::create_market(admin, match_id, @0x789, @0xabc);
        
        // User1 bets 1000 on player1
        prediction_market::bet(user1, signer::address_of(admin), match_id, OUTCOME_PLAYER1, 1000);
        
        // User2 bets 2000 on player2
        prediction_market::bet(user2, signer::address_of(admin), match_id, OUTCOME_PLAYER2, 2000);
        
        let user1_balance_before = coin::balance<AptosCoin>(signer::address_of(user1));
        
        // Resolve with player1 winning
        prediction_market::resolve_market(admin, match_id, OUTCOME_PLAYER1);
        
        // User1 claims
        prediction_market::claim_rewards(user1, signer::address_of(admin), match_id);
        
        let user1_balance_after = coin::balance<AptosCoin>(signer::address_of(user1));
        
        // User1 should get all 3000 (their 1000 + user2's 2000)
        assert!(user1_balance_after == user1_balance_before + 3000, 0);
        
        // Verify user has claimed
        assert!(prediction_market::has_claimed(signer::address_of(admin), match_id, signer::address_of(user1)), 1);
    }

    #[test(aptos_framework = @0x1, admin = @chess_escrow, user1 = @0x123, user2 = @0x456, user3 = @0x789)]
    /// Test: Multiple winners split pool proportionally
    fun test_multiple_winners_split(
        aptos_framework: &signer, 
        admin: &signer, 
        user1: &signer, 
        user2: &signer,
        user3: &signer
    ) {
        setup_test(aptos_framework, admin, user1, user2, user3);
        prediction_market::initialize(admin);
        
        let match_id = 1;
        prediction_market::create_market(admin, match_id, @0x111, @0x222);
        
        // User1 bets 2000 on player1
        prediction_market::bet(user1, signer::address_of(admin), match_id, OUTCOME_PLAYER1, 2000);
        
        // User2 bets 1000 on player1
        prediction_market::bet(user2, signer::address_of(admin), match_id, OUTCOME_PLAYER1, 1000);
        
        // User3 bets 3000 on player2 (will lose)
        prediction_market::bet(user3, signer::address_of(admin), match_id, OUTCOME_PLAYER2, 3000);
        
        let user1_balance_before = coin::balance<AptosCoin>(signer::address_of(user1));
        let user2_balance_before = coin::balance<AptosCoin>(signer::address_of(user2));
        
        // Resolve with player1 winning
        prediction_market::resolve_market(admin, match_id, OUTCOME_PLAYER1);
        
        // Both winners claim
        prediction_market::claim_rewards(user1, signer::address_of(admin), match_id);
        prediction_market::claim_rewards(user2, signer::address_of(admin), match_id);
        
        let user1_balance_after = coin::balance<AptosCoin>(signer::address_of(user1));
        let user2_balance_after = coin::balance<AptosCoin>(signer::address_of(user2));
        
        // Total pool is 6000
        // User1 has 2000/3000 shares = 2/3 of pool = 4000
        // User2 has 1000/3000 shares = 1/3 of pool = 2000
        assert!(user1_balance_after == user1_balance_before + 4000, 0);
        assert!(user2_balance_after == user2_balance_before + 2000, 1);
    }

    #[test(aptos_framework = @0x1, admin = @chess_escrow, user1 = @0x123)]
    #[expected_failure(abort_code = ENOT_RESOLVED, location = chess_escrow::prediction_market)]
    /// Test: Cannot claim before market resolved
    fun test_claim_before_resolve(aptos_framework: &signer, admin: &signer, user1: &signer) {
        setup_test(aptos_framework, admin, user1, user1, user1);
        prediction_market::initialize(admin);
        
        let match_id = 1;
        prediction_market::create_market(admin, match_id, @0x789, @0xabc);
        
        prediction_market::bet(user1, signer::address_of(admin), match_id, OUTCOME_PLAYER1, 1000);
        prediction_market::claim_rewards(user1, signer::address_of(admin), match_id);
    }

    #[test(aptos_framework = @0x1, admin = @chess_escrow, user1 = @0x123, user2 = @0x456)]
    #[expected_failure(abort_code = ENO_SHARES, location = chess_escrow::prediction_market)]
    /// Test: Losing bettor cannot claim
    fun test_loser_cannot_claim(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) {
        setup_test(aptos_framework, admin, user1, user2, user2);
        prediction_market::initialize(admin);
        
        let match_id = 1;
        prediction_market::create_market(admin, match_id, @0x789, @0xabc);
        
        prediction_market::bet(user1, signer::address_of(admin), match_id, OUTCOME_PLAYER1, 1000);
        prediction_market::bet(user2, signer::address_of(admin), match_id, OUTCOME_PLAYER2, 2000);
        
        prediction_market::resolve_market(admin, match_id, OUTCOME_PLAYER1);
        
        // User2 lost, should not be able to claim
        prediction_market::claim_rewards(user2, signer::address_of(admin), match_id);
    }

    #[test(aptos_framework = @0x1, admin = @chess_escrow, user1 = @0x123)]
    #[expected_failure(abort_code = EALREADY_CLAIMED, location = chess_escrow::prediction_market)]
    /// Test: Cannot claim twice
    fun test_double_claim(aptos_framework: &signer, admin: &signer, user1: &signer) {
        setup_test(aptos_framework, admin, user1, user1, user1);
        prediction_market::initialize(admin);
        
        let match_id = 1;
        prediction_market::create_market(admin, match_id, @0x789, @0xabc);
        
        prediction_market::bet(user1, signer::address_of(admin), match_id, OUTCOME_PLAYER1, 1000);
        prediction_market::resolve_market(admin, match_id, OUTCOME_PLAYER1);
        
        prediction_market::claim_rewards(user1, signer::address_of(admin), match_id);
        prediction_market::claim_rewards(user1, signer::address_of(admin), match_id); // Should fail
    }

    #[test(aptos_framework = @0x1, admin = @chess_escrow, user1 = @0x123)]
    /// Test: Get potential reward before resolution
    fun test_potential_reward(aptos_framework: &signer, admin: &signer, user1: &signer) {
        setup_test(aptos_framework, admin, user1, user1, user1);
        prediction_market::initialize(admin);
        
        let match_id = 1;
        prediction_market::create_market(admin, match_id, @0x789, @0xabc);
        
        prediction_market::bet(user1, signer::address_of(admin), match_id, OUTCOME_PLAYER1, 1000);
        
        let potential = prediction_market::get_potential_reward(
            signer::address_of(admin),
            match_id,
            OUTCOME_PLAYER1,
            signer::address_of(user1)
        );
        
        // With only one bettor, they should get back their full bet
        assert!(potential == 1000, 0);
    }

    #[test(aptos_framework = @0x1, admin = @chess_escrow, user1 = @0x123, user2 = @0x456)]
    /// Test: Get potential reward with multiple bettors
    fun test_potential_reward_multiple(
        aptos_framework: &signer, 
        admin: &signer, 
        user1: &signer, 
        user2: &signer
    ) {
        setup_test(aptos_framework, admin, user1, user2, user2);
        prediction_market::initialize(admin);
        
        let match_id = 1;
        prediction_market::create_market(admin, match_id, @0x789, @0xabc);
        
        // User1 bets 1000 on player1
        prediction_market::bet(user1, signer::address_of(admin), match_id, OUTCOME_PLAYER1, 1000);
        
        // User2 bets 2000 on player2
        prediction_market::bet(user2, signer::address_of(admin), match_id, OUTCOME_PLAYER2, 2000);
        
        let potential_user1 = prediction_market::get_potential_reward(
            signer::address_of(admin),
            match_id,
            OUTCOME_PLAYER1,
            signer::address_of(user1)
        );
        
        // If user1 wins, they get all 3000 (100% of player1 shares)
        assert!(potential_user1 == 3000, 0);
    }

    #[test(aptos_framework = @0x1, admin = @chess_escrow, user1 = @0x123)]
    /// Test: Get user all shares
    fun test_get_user_all_shares(aptos_framework: &signer, admin: &signer, user1: &signer) {
        setup_test(aptos_framework, admin, user1, user1, user1);
        prediction_market::initialize(admin);
        
        let match_id = 1;
        prediction_market::create_market(admin, match_id, @0x789, @0xabc);
        
        // Bet on all outcomes
        prediction_market::bet(user1, signer::address_of(admin), match_id, OUTCOME_PLAYER1, 1000);
        prediction_market::bet(user1, signer::address_of(admin), match_id, OUTCOME_PLAYER2, 2000);
        prediction_market::bet(user1, signer::address_of(admin), match_id, OUTCOME_DRAW, 500);
        
        let (p1, p2, draw) = prediction_market::get_user_all_shares(
            signer::address_of(admin),
            match_id,
            signer::address_of(user1)
        );
        
        assert!(p1 == 1000, 0);
        assert!(p2 == 2000, 1);
        assert!(draw == 500, 2);
    }

    #[test(aptos_framework = @0x1, admin = @chess_escrow, user1 = @0x123)]
    /// Test: Draw outcome works correctly
    fun test_draw_outcome(aptos_framework: &signer, admin: &signer, user1: &signer) {
        setup_test(aptos_framework, admin, user1, user1, user1);
        prediction_market::initialize(admin);
        
        let match_id = 1;
        prediction_market::create_market(admin, match_id, @0x789, @0xabc);
        
        let initial_balance = coin::balance<AptosCoin>(signer::address_of(user1));
        
        // Bet on draw
        prediction_market::bet(user1, signer::address_of(admin), match_id, OUTCOME_DRAW, 1000);
        
        // Resolve as draw
        prediction_market::resolve_market(admin, match_id, OUTCOME_DRAW);
        
        // Claim rewards
        prediction_market::claim_rewards(user1, signer::address_of(admin), match_id);
        
        let final_balance = coin::balance<AptosCoin>(signer::address_of(user1));
        
        // User should get their money back
        assert!(final_balance == initial_balance, 0);
    }
}