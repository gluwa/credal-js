export type AddressId = string;

export type AccountId = string;

export type ExternalAddress = string;

export type Blockchain = 'Ethereum' | 'Rinkeby' | 'Luniverse' | 'Bitcoin' | 'Other';

export type Address = {
    accountId: AccountId;
    blockchain: Blockchain;
    externalAddress: ExternalAddress;
};

export type Duration = {
    secs: number;
    nanos: number;
};

export type InterestRate = {
    ratePerPeriod: number;
    decimals: number;
    period: Duration;
};

export type LoanTerms = {
    amount: BigInt;
    interestRate: InterestRate;
    termLength: Duration;
};

type TupleId = [number, string];
export type AskOrderId = TupleId;
export type BidOrderId = TupleId;

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

export type OfferId = TupleId;

export type Offer = {
    blockchain: Blockchain;
    askOrderId: AskOrderId;
    bidOrderId: BidOrderId;
    expirationBlock: number;
    blockNumber: number;
    lenderAccountId: AccountId;
};

export type DealOrderId = TupleId;

export type DealOrder = {
    offerId: OfferId;
    lenderAddressId: AddressId;
    borrowerAddressId: AddressId;
    loanTerms: LoanTerms;
    expirationBlock: number;
    timestamp: Date;
    fundingTransferId?: string;
    repaymentTransferId?: string;
    lock?: string;
    borrower: AccountId;
};
