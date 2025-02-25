#[starknet::contract]
mod NamiDisaster {
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use core::traits::Into;
    use core::array::ArrayTrait;
    use core::byte_array::ByteArray;

    #[starknet::interface]
    trait IERC20<TContractState> {
        fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
        fn transfer_from(
            ref self: TContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256,
        ) -> bool;
        fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    }

    #[storage]
    struct Storage {
        funds_needed: u256,
        ipfs_uri: ByteArray,
        owner: ContractAddress,
        usdc_address: ContractAddress,
        total_donated: u256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        DonationReceived: DonationReceived,
        WithdrawalMade: WithdrawalMade,
        DirectTransferReceived: DirectTransferReceived,
    }

    #[derive(Drop, starknet::Event)]
    struct DonationReceived {
        donor: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct WithdrawalMade {
        to: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct DirectTransferReceived {
        from: ContractAddress,
        amount: u256,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        funds_needed_low: felt252,
        funds_needed_high: felt252,
        ipfs_uri: ByteArray,
        owner: ContractAddress,
        usdc_address: ContractAddress,
    ) {
        self
            .funds_needed
            .write(
                u256 {
                    low: funds_needed_low.try_into().unwrap(),
                    high: funds_needed_high.try_into().unwrap(),
                },
            );
        self.ipfs_uri.write(ipfs_uri);
        self.owner.write(owner);
        self.usdc_address.write(usdc_address);
        self.total_donated.write(0.into());
    }

    #[starknet::interface]
    trait IDisaster<TContractState> {
        fn donate(ref self: TContractState, amount: u256);
        fn withdraw(ref self: TContractState, to: ContractAddress, amount: u256);
        fn get_balance(self: @TContractState) -> u256;
        fn get_funds_needed(self: @TContractState) -> u256;
        fn get_ipfs_uri(self: @TContractState) -> ByteArray;
        fn get_total_donated(self: @TContractState) -> u256;
        fn handle_direct_transfer(ref self: TContractState, from: ContractAddress, amount: u256);
    }

    #[abi(embed_v0)]
    impl DisasterImpl of IDisaster<ContractState> {
        fn donate(ref self: ContractState, amount: u256) {
            assert(amount > 0.into(), 'Amount must be positive');

            let usdc = IERC20Dispatcher { contract_address: self.usdc_address.read() };
            let caller = get_caller_address();

            let success = usdc.transfer_from(caller, starknet::get_contract_address(), amount);
            assert(success, 'USDC transfer failed');

            let current_total = self.total_donated.read();
            self.total_donated.write(current_total + amount);

            self.emit(Event::DonationReceived(DonationReceived { donor: caller, amount }));
        }

        fn withdraw(ref self: ContractState, to: ContractAddress, amount: u256) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Not authorized');
            assert(to != starknet::contract_address_const::<0>(), 'Invalid recipient');

            let usdc = IERC20Dispatcher { contract_address: self.usdc_address.read() };
            let current_balance = usdc.balance_of(starknet::get_contract_address());
            assert(amount <= current_balance, 'Insufficient balance');

            let success = usdc.transfer(to, amount);
            assert(success, 'USDC transfer failed');

            self.emit(Event::WithdrawalMade(WithdrawalMade { to, amount }));
        }

        fn get_balance(self: @ContractState) -> u256 {
            let usdc = IERC20Dispatcher { contract_address: self.usdc_address.read() };
            usdc.balance_of(starknet::get_contract_address())
        }

        fn get_funds_needed(self: @ContractState) -> u256 {
            self.funds_needed.read()
        }

        fn get_ipfs_uri(self: @ContractState) -> ByteArray {
            self.ipfs_uri.read()
        }

        fn get_total_donated(self: @ContractState) -> u256 {
            self.total_donated.read()
        }

        fn handle_direct_transfer(ref self: ContractState, from: ContractAddress, amount: u256) {
            assert(amount > 0.into(), 'Amount must be positive');

            let current_total = self.total_donated.read();
            self.total_donated.write(current_total + amount);

            self.emit(Event::DirectTransferReceived(DirectTransferReceived { from, amount }));
        }
    }
}
