#[starknet::contract]
mod nami_ai_client {
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess, StoragePathEntry, Map,
    };
    use core::traits::Into;
    use core::array::ArrayTrait;

    #[derive(Drop, Serde)]
    struct Disaster {
        name: felt252,
        description: felt252,
        disaster_type: felt252,
        location: felt252,
        funds_needed: u256,
        ens_name: felt252,
        base_name: felt252,
    }

    #[derive(Drop, Serde)]
    struct UnlockFunds {
        beneficiary_name: felt252,
        beneficiary_address: ContractAddress,
        comments: felt252,
    }

    #[storage]
    struct Storage {
        nami_core: ContractAddress,
        vault_factory: ContractAddress,
        owner: ContractAddress,
        allowlisted_addresses: Map<ContractAddress, bool>,
        disaster_id_to_attestation_id: Map<u256, u64>,
        sp_instance: ContractAddress,
        create_disaster_schema_id: u64,
        unlock_funds_schema_id: u64,
        disaster_count: u256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        CreateDisasterInitiated: CreateDisasterInitiated,
        UnlockFundsInitiated: UnlockFundsInitiated,
    }

    #[derive(Drop, starknet::Event)]
    struct CreateDisasterInitiated {
        attestation_id: u64,
        disaster: Disaster,
        vault_address: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct UnlockFundsInitiated {
        disaster_id: u256,
        attestation_id: u64,
        unlock_funds: UnlockFunds,
        amount_in_usd: u256,
    }

    // Interface for VaultFactory
    #[starknet::interface]
    trait IVaultFactory<TContractState> {
        fn get_vault_address(self: @TContractState, disaster_id: u256) -> ContractAddress;
    }

    // Interface for SignProtocol (SP)
    #[starknet::interface]
    trait ISignProtocol<TContractState> {
        fn attest(
            ref self: TContractState,
            attestation: Attestation,
            sig_r: felt252,
            sig_s: felt252,
            sig_v: felt252,
        ) -> u64;
    }

    #[derive(Drop, Serde)]
    struct Attestation {
        schema_id: u64,
        linked_attestation_id: u64,
        attest_timestamp: u64,
        revoke_timestamp: u64,
        attester: ContractAddress,
        valid_until: u64,
        revoked: bool,
        data: Array<felt252>,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        sp_instance: ContractAddress,
        nami_core: ContractAddress,
        nami_mpc_wallet: ContractAddress,
        vault_factory: ContractAddress,
        create_disaster_schema_id: u64,
        unlock_funds_schema_id: u64,
    ) {
        self.owner.write(owner);
        self.sp_instance.write(sp_instance);
        self.nami_core.write(nami_core);
        self.vault_factory.write(vault_factory);
        self.create_disaster_schema_id.write(create_disaster_schema_id);
        self.unlock_funds_schema_id.write(unlock_funds_schema_id);
        self.allowlisted_addresses.entry(nami_mpc_wallet).write(true);
    }

    #[starknet::interface]
    trait INamiAiClient<TContractState> {
        fn allowlist_ai_agent(ref self: TContractState, ai_agent: ContractAddress);
        fn update_schema_ids(
            ref self: TContractState, create_disaster_schema_id: u64, unlock_funds_schema_id: u64,
        );
        fn create_disaster(ref self: TContractState, params: Disaster);
        fn unlock_funds(
            ref self: TContractState, disaster_id: u256, params: UnlockFunds, amount: u256,
        );
        fn get_vault_address(self: @TContractState, disaster_id: u256) -> ContractAddress;
    }

    #[abi(embed_v0)]
    impl NamiAiClientImpl of INamiAiClient<ContractState> {
        fn allowlist_ai_agent(ref self: ContractState, ai_agent: ContractAddress) {
            assert_only_owner(@self);
            self.allowlisted_addresses.entry(ai_agent).write(true);
        }

        fn update_schema_ids(
            ref self: ContractState, create_disaster_schema_id: u64, unlock_funds_schema_id: u64,
        ) {
            assert_only_owner(@self);
            self.create_disaster_schema_id.write(create_disaster_schema_id);
            self.unlock_funds_schema_id.write(unlock_funds_schema_id);
        }

        fn create_disaster(ref self: ContractState, params: Disaster) {
            assert_only_ai_agent(@self);

            let disaster_id = self.disaster_count.read();
            let vault_address = self.get_vault_address(disaster_id);

            // Create attestation data
            let mut data = ArrayTrait::new();
            data.append(params.name);
            data.append(params.description);
            data.append(params.disaster_type);
            data.append(params.location);
            data.append(starknet::get_block_timestamp().into());
            // TODO: Add funds_needed (need to handle u256)
            data.append(vault_address.into());
            data.append(params.ens_name);
            data.append(params.base_name);

            let attestation = Attestation {
                schema_id: self.create_disaster_schema_id.read(),
                linked_attestation_id: 0,
                attest_timestamp: 0,
                revoke_timestamp: 0,
                attester: starknet::get_contract_address(),
                valid_until: 0,
                revoked: false,
                data: data,
            };

            let sp = ISignProtocolDispatcher { contract_address: self.sp_instance.read() };
            let attestation_id = sp.attest(attestation, 0, 0, 0);

            self.disaster_id_to_attestation_id.entry(disaster_id).write(attestation_id);

            self
                .emit(
                    Event::CreateDisasterInitiated(
                        CreateDisasterInitiated { attestation_id, disaster: params, vault_address },
                    ),
                );

            self.disaster_count.write(disaster_id + 1.into());
        }

        fn unlock_funds(
            ref self: ContractState, disaster_id: u256, params: UnlockFunds, amount: u256,
        ) {
            assert_only_ai_agent(@self);

            // Create attestation data
            let mut data = ArrayTrait::new();
            data.append(params.beneficiary_name);
            // TODO: Add amount (need to handle u256)
            data.append(params.comments);
            data.append(params.beneficiary_address.into());

            let attestation = Attestation {
                schema_id: self.unlock_funds_schema_id.read(),
                linked_attestation_id: self.disaster_id_to_attestation_id.entry(disaster_id).read(),
                attest_timestamp: 0,
                revoke_timestamp: 0,
                attester: starknet::get_contract_address(),
                valid_until: 0,
                revoked: false,
                data: data,
            };

            let sp = ISignProtocolDispatcher { contract_address: self.sp_instance.read() };
            let attestation_id = sp.attest(attestation, 0, 0, 0);

            self
                .emit(
                    Event::UnlockFundsInitiated(
                        UnlockFundsInitiated {
                            disaster_id,
                            attestation_id,
                            unlock_funds: params,
                            amount_in_usd: amount,
                        },
                    ),
                );
        }

        fn get_vault_address(self: @ContractState, disaster_id: u256) -> ContractAddress {
            let vault_factory_addr = self.vault_factory.read();
            let vault_factory = IVaultFactoryDispatcher { contract_address: vault_factory_addr };
            vault_factory.get_vault_address(disaster_id)
        }
    }

    // Helper functions
    fn assert_only_owner(self: @ContractState) {
        let caller = get_caller_address();
        assert(caller == self.owner.read(), 'Not authorized');
    }

    fn assert_only_ai_agent(self: @ContractState) {
        let caller = get_caller_address();
        assert(self.allowlisted_addresses.entry(caller).read(), 'Not AI agent');
    }
}
