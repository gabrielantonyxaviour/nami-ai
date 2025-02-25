#[starknet::contract]
mod NamiCore {
    use starknet::{ContractAddress, get_caller_address, ClassHash};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess, StoragePathEntry, Map,
    };
    use core::array::ArrayTrait;
    use core::traits::Into;
    use core::byte_array::ByteArray;

    #[storage]
    struct Storage {
        allowed_addresses: Map<ContractAddress, bool>,
        disasters: Map<u256, ContractAddress>,
        disaster_count: u256,
        disaster_class_hash: ClassHash,
        usdc_address: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        DisasterCreated: DisasterCreated,
    }

    #[derive(Drop, starknet::Event)]
    struct DisasterCreated {
        disaster_id: u256,
        disaster_address: ContractAddress,
        funds_needed: u256,
        ipfs_uri: ByteArray,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState, disaster_class_hash: ClassHash, usdc_address: ContractAddress,
    ) {
        self.disaster_class_hash.write(disaster_class_hash);
        self.usdc_address.write(usdc_address);
    }

    #[starknet::interface]
    trait ICore<TContractState> {
        fn get_allowed_addresses(self: @TContractState, address: ContractAddress) -> bool;
        fn set_allowed_addresses(ref self: TContractState, address: ContractAddress);
        fn create_disaster(
            ref self: TContractState, funds_needed: u256, ipfs_uri: ByteArray,
        ) -> ContractAddress;
        fn get_disaster(self: @TContractState, disaster_id: u256) -> ContractAddress;
        fn get_all_disasters(self: @TContractState) -> Array<ContractAddress>;
    }

    #[abi(embed_v0)]
    impl CoreImpl of ICore<ContractState> {
        fn get_allowed_addresses(self: @ContractState, address: ContractAddress) -> bool {
            self.allowed_addresses.entry(address).read()
        }

        fn set_allowed_addresses(ref self: ContractState, address: ContractAddress) {
            self.allowed_addresses.entry(address).write(true);
        }

        fn create_disaster(
            ref self: ContractState, funds_needed: u256, ipfs_uri: ByteArray,
        ) -> ContractAddress {
            let caller = get_caller_address();
            assert(self.allowed_addresses.entry(caller).read(), 'Not allowed');

            let disaster_id = self.disaster_count.read();
            let mut constructor_calldata = ArrayTrait::new();
            constructor_calldata.append(funds_needed.low.into());
            constructor_calldata.append(funds_needed.high.into());
            constructor_calldata.append(ipfs_uri.len().into());
            constructor_calldata.append(caller.into());
            constructor_calldata.append(self.usdc_address.read().into());
            let (deployed_address, _) = starknet::syscalls::deploy_syscall(
                self.disaster_class_hash.read(),
                disaster_id.try_into().unwrap(),
                constructor_calldata.span(),
                false,
            )
                .unwrap();
            self.disasters.entry(disaster_id).write(deployed_address);
            self.disaster_count.write(disaster_id + 1.into());
            self
                .emit(
                    Event::DisasterCreated(
                        DisasterCreated {
                            disaster_id, disaster_address: deployed_address, funds_needed, ipfs_uri,
                        },
                    ),
                );

            deployed_address
        }

        fn get_disaster(self: @ContractState, disaster_id: u256) -> ContractAddress {
            self.disasters.entry(disaster_id).read()
        }

        fn get_all_disasters(self: @ContractState) -> Array<ContractAddress> {
            let mut result = ArrayTrait::new();
            let mut i: u256 = 0;
            let count = self.disaster_count.read();

            while i < count {
                result.append(self.disasters.entry(i).read());
                i = i + 1.into();
            };

            result
        }
    }
}
