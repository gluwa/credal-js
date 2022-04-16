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

export type TupleId = [number, string];
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
    block?: number;
};

export type TransferId = string;

export type Erc20 = { kind: 'Erc20'; contractAddress: ExternalAddress };
export type Ethless = { kind: 'Ethless'; contractAddress: ExternalAddress };
export type Other = { kind: 'Other'; value: ExternalAddress };
export type Native = { kind: 'Native' };
export type TransferKind = Erc20 | Ethless | Native | Other;

export type Transfer = {
    blockchain: Blockchain;
    kind: TransferKind;
    from: AddressId;
    to: AddressId;
    orderId: DealOrderId;
    amount: BigInt;
    txHash: string;
    blockNumber: number;
    processed: boolean;
    accountId: AccountId;
    timestamp?: Date;
};
