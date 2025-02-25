#[starknet::contract]
mod nami_vault {
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use core::traits::Into;
    #[starknet::interface]
    trait IERC20<TContractState> {
        fn get_name(self: @TContractState) -> felt252;
        fn get_symbol(self: @TContractState) -> felt252;
        fn get_decimals(self: @TContractState) -> u8;
        fn get_total_supply(self: @TContractState) -> felt252;
        fn balance_of(self: @TContractState, account: ContractAddress) -> felt252;
        fn allowance(
            self: @TContractState, owner: ContractAddress, spender: ContractAddress,
        ) -> felt252;
        fn transfer(ref self: TContractState, recipient: ContractAddress, amount: felt252);
        fn transfer_from(
            ref self: TContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: felt252,
        );
        fn approve(ref self: TContractState, spender: ContractAddress, amount: felt252);
    }

    #[storage]
    struct Storage {
        vault_factory: ContractAddress,
        usdc_address: ContractAddress,
        initialized: bool,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Withdrawal: Withdrawal,
    }

    #[derive(Drop, starknet::Event)]
    struct Withdrawal {
        recipient: ContractAddress,
        amount: felt252,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
    ) { // Empty constructor - initialization happens in the initialize function
    }

    #[starknet::interface]
    trait INamiVault<TContractState> {
        fn initialize(
            ref self: TContractState, vault_factory: ContractAddress, usdc: ContractAddress,
        );
        fn withdraw_value(
            ref self: TContractState, beneficiary: ContractAddress, amount: u256,
        ) -> bool;
    }

    #[abi(embed_v0)]
    impl NamiVaultImpl of INamiVault<ContractState> {
        fn initialize(
            ref self: ContractState, vault_factory: ContractAddress, usdc: ContractAddress,
        ) {
            assert(!self.initialized.read(), 'Already initialized');

            self.vault_factory.write(vault_factory);
            self.usdc_address.write(usdc);

            self.initialized.write(true);
        }

        fn withdraw_value(
            ref self: ContractState, beneficiary: ContractAddress, amount: u256,
        ) -> bool {
            assert_only_vault_factory(@self);

            // Skip if no amount to withdraw
            if amount <= 0.into() {
                return true;
            }

            let this_contract = get_contract_address();
            let usdc_address = self.usdc_address.read();

            // Skip if USDC address not configured
            if usdc_address == starknet::contract_address_const::<0>() {
                return false;
            }

            let usdc = IERC20Dispatcher { contract_address: usdc_address };

            // Check balance
            let balance_felt: felt252 = usdc.balance_of(this_contract);
            let balance: u256 = balance_felt.into();

            if balance < amount {
                return false;
            }

            let amount_felt: felt252 = amount.low.into();

            // Transfer tokens
            usdc.transfer(beneficiary, amount_felt);

            self
                .emit(
                    Event::Withdrawal(Withdrawal { recipient: beneficiary, amount: amount_felt }),
                );

            true
        }
    }

    fn assert_only_vault_factory(self: @ContractState) {
        let caller = get_caller_address();
        assert(caller == self.vault_factory.read(), 'Invalid caller');
    }
}
