export type AddressId = string;

export type AccountId = string;

export type ExternalAddress = string;

export type Blockchain = 'Ethereum' | 'Rinkeby' | 'Luniverse' | 'Bitcoin' | 'Other';

export type Address = {
    accountId: AccountId;
    blockchain: Blockchain;
    externalAddress: ExternalAddress;
};

export type LoanTerms = {
    amount: number;
    interestRate: number;
    maturity: Date;
};

type AskOrBidOrderBase = {
    loanTerms: LoanTerms;
    expirationBlock: number;
    blockNumber: number;
    blockchain: Blockchain;
};

export type AskOrder = AskOrBidOrderBase & {
    lenderAddressId: AddressId;
    lenderAccountId: AccountId;
};

export type BidOrder = AskOrBidOrderBase & {
    borrowerAddressId: AddressId;
    borrowerAccountId: AccountId;
};
