#[starknet::contract]
mod nami_vault {
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use core::array::ArrayTrait;
    use core::traits::Into;

    // Interface for ERC20 tokens
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
        weth_address: ContractAddress,
        usdc_address: ContractAddress,
        usdt_address: ContractAddress,
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
        token: u8,
        amount: felt252,
    }

    #[constructor]
    fn constructor(ref self: ContractState) {}

    #[starknet::interface]
    trait INamiVault<TContractState> {
        fn initialize(
            ref self: TContractState,
            vault_factory: ContractAddress,
            weth: ContractAddress,
            usdc: ContractAddress,
            usdt: ContractAddress,
        );
        fn withdraw_value(
            ref self: TContractState,
            beneficiary: ContractAddress,
            eth_amount: u256,
            weth_amount: u256,
            usdc_amount: u256,
            usdt_amount: u256,
        ) -> bool;
    }

    #[abi(embed_v0)]
    impl NamiVaultImpl of INamiVault<ContractState> {
        fn initialize(
            ref self: ContractState,
            vault_factory: ContractAddress,
            weth: ContractAddress,
            usdc: ContractAddress,
            usdt: ContractAddress,
        ) {
            assert(!self.initialized.read(), 'Already initialized');

            self.vault_factory.write(vault_factory);
            self.weth_address.write(weth);
            self.usdc_address.write(usdc);
            self.usdt_address.write(usdt);

            self.initialized.write(true);
        }

        fn withdraw_value(
            ref self: ContractState,
            beneficiary: ContractAddress,
            eth_amount: u256,
            weth_amount: u256,
            usdc_amount: u256,
            usdt_amount: u256,
        ) -> bool {
            assert_only_vault_factory(@self);
            if weth_amount > 0.into() {
                self._withdraw_token(beneficiary, 0, self.weth_address.read(), weth_amount);
            }

            if usdc_amount > 0.into() {
                self._withdraw_token(beneficiary, 1, self.usdc_address.read(), usdc_amount);
            }

            if usdt_amount > 0.into() {
                self._withdraw_token(beneficiary, 2, self.usdt_address.read(), usdt_amount);
            }

            true
        }
    }

    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        fn _withdraw_token(
            ref self: ContractState,
            beneficiary: ContractAddress,
            token_index: u8,
            token_address: ContractAddress,
            amount: u256,
        ) {
            let this_contract = get_contract_address();

            if token_address == starknet::contract_address_const::<0>() {
                return;
            }

            let token = IERC20Dispatcher { contract_address: token_address };

            let balance_felt: felt252 = token.balance_of(this_contract);
            let balance: u256 = balance_felt.into();

            if balance < amount {
                return;
            }

            let amount_felt: felt252 = amount.low.into();

            token.transfer(beneficiary, amount_felt);

            self
                .emit(
                    Event::Withdrawal(
                        Withdrawal {
                            recipient: beneficiary, token: token_index, amount: amount_felt,
                        },
                    ),
                );
        }
    }

    fn assert_only_vault_factory(self: @ContractState) {
        let caller = get_caller_address();
        assert(caller == self.vault_factory.read(), 'Invalid caller');
    }
}
