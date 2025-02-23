#[starknet::contract]
mod vault_factory {
    use starknet::{ContractAddress, get_caller_address, get_contract_address, ClassHash};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess, StoragePathEntry, Map,
    };
    use core::array::ArrayTrait;
    use core::option::OptionTrait;
    use core::traits::Into;

    // Interface for NamiVault
    #[starknet::interface]
    trait INamiVault<TContractState> {
        fn initialize(
            ref self: TContractState, vault_factory: ContractAddress, usdc: ContractAddress,
        );
        fn withdraw_value(
            ref self: TContractState, beneficiary: ContractAddress, amount: u256,
        ) -> bool;
    }

    #[storage]
    struct Storage {
        initialized: bool,
        authorized_caller: ContractAddress,
        usdc_address: ContractAddress,
        vaults: Map<u256, ContractAddress>,
        owner: ContractAddress,
        vault_class_hash: ClassHash,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        FundsClaimed: FundsClaimed,
    }

    #[derive(Drop, starknet::Event)]
    struct FundsClaimed {
        vault: ContractAddress,
        beneficiary: ContractAddress,
        amount: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState) {
        self.owner.write(get_caller_address());
    }

    #[starknet::interface]
    trait IVaultFactory<TContractState> {
        fn initialize(
            ref self: TContractState,
            authorized_caller: ContractAddress,
            usdc: ContractAddress,
            vault_class_hash: ClassHash,
        );
        fn set_authorized_caller(ref self: TContractState, authorized_caller: ContractAddress);
        fn create_vault(ref self: TContractState, salt: u256) -> ContractAddress;
        fn claim_funds(
            ref self: TContractState, disaster_id: u256, beneficiary: ContractAddress, amount: u256,
        );
        fn get_vault_address(self: @TContractState, disaster_id: u256) -> ContractAddress;
    }

    #[abi(embed_v0)]
    impl VaultFactoryImpl of IVaultFactory<ContractState> {
        fn initialize(
            ref self: ContractState,
            authorized_caller: ContractAddress,
            usdc: ContractAddress,
            vault_class_hash: ClassHash,
        ) {
            assert(!self.initialized.read(), 'Already initialized');
            assert_only_owner(@self);

            self.authorized_caller.write(authorized_caller);
            self.usdc_address.write(usdc);
            self.vault_class_hash.write(vault_class_hash);

            self.initialized.write(true);
        }

        fn set_authorized_caller(ref self: ContractState, authorized_caller: ContractAddress) {
            assert_only_owner(@self);
            self.authorized_caller.write(authorized_caller);
        }

        fn create_vault(ref self: ContractState, salt: u256) -> ContractAddress {
            assert_only_authorized(@self);

            let deployed = self._create_vault(salt);
            deployed
        }

        fn claim_funds(
            ref self: ContractState, disaster_id: u256, beneficiary: ContractAddress, amount: u256,
        ) {
            assert_only_authorized(@self);

            let vault = self.vaults.entry(disaster_id).read();
            if vault == starknet::contract_address_const::<0>() {
                let deployed = self._create_vault(disaster_id);
                self._claim_funds(deployed, beneficiary, amount);
            } else {
                self._claim_funds(vault, beneficiary, amount);
            }
        }

        fn get_vault_address(self: @ContractState, disaster_id: u256) -> ContractAddress {
            self.vaults.entry(disaster_id).read()
        }
    }

    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        fn _create_vault(ref self: ContractState, salt: u256) -> ContractAddress {
            let contract_address_salt = salt.try_into().unwrap();
            let class_hash = self.vault_class_hash.read();
            let mut constructor_calldata = ArrayTrait::new();
            let (deployed_address, _) = starknet::syscalls::deploy_syscall(
                class_hash, contract_address_salt, constructor_calldata.span(), false,
            )
                .unwrap();
            let vault = INamiVaultDispatcher { contract_address: deployed_address };
            vault.initialize(get_contract_address(), self.usdc_address.read());
            self.vaults.entry(salt).write(deployed_address);

            deployed_address
        }

        fn _claim_funds(
            ref self: ContractState,
            vault: ContractAddress,
            beneficiary: ContractAddress,
            amount: u256,
        ) {
            assert(vault != starknet::contract_address_const::<0>(), 'Vault does not exist');

            let vault_dispatcher = INamiVaultDispatcher { contract_address: vault };
            let success = vault_dispatcher.withdraw_value(beneficiary, amount);

            if success {
                self.emit(Event::FundsClaimed(FundsClaimed { vault, beneficiary, amount }));
            }
        }
    }

    fn assert_only_owner(self: @ContractState) {
        let caller = get_caller_address();
        assert(caller == self.owner.read(), 'Not authorized');
    }

    fn assert_only_authorized(self: @ContractState) {
        let caller = get_caller_address();
        let authorized = self.authorized_caller.read();
        assert(caller == authorized || caller == self.owner.read(), 'Not authorized');
    }
}
