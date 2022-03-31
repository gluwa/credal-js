export type AddressId = string;

export type AccountId = string;

export type ExternalAddress = string;

export type Blockchain = 'Ethereum' | 'Rinkeby' | 'Luniverse' | 'Bitcoin' | 'Other';

export type Address = {
    accountId: AccountId;
    blockchain: Blockchain;
    externalAddress: ExternalAddress;
};
