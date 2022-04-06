import { ApiPromise } from '@polkadot/api';
import {
    PalletCreditcoinAddress,
    PalletCreditcoinAskOrder,
    PalletCreditcoinBidOrder,
    PalletCreditcoinLoanTerms,
} from '@polkadot/types/lookup';
import { Address, AskOrder, LoanTerms, BidOrder } from './model';

export const createAddress = ({ value, blockchain, owner }: PalletCreditcoinAddress): Address => ({
    accountId: owner.toString(),
    blockchain: blockchain.type,
    externalAddress: value.toString(),
});

export const createLoanTerms = ({ amount, interestRate, maturity }: PalletCreditcoinLoanTerms): LoanTerms => ({
    amount: amount.toBigInt(),
    interestRate: interestRate.toNumber(),
    maturity: new Date(maturity.toNumber()),
});

export const createCreditcoinLoanTerms = (
    api: ApiPromise,
    { amount, interestRate, maturity }: LoanTerms,
): PalletCreditcoinLoanTerms =>
    api.createType('PalletCreditcoinLoanTerms', {
        amount,
        interestRate,
        maturity: Math.floor(maturity.getTime()),
    });

export const createAskOrder = ({
    blockchain,
    terms,
    lenderAddressId,
    expirationBlock,
    block,
    lender,
}: PalletCreditcoinAskOrder): AskOrder => ({
    blockchain: blockchain.type,
    blockNumber: block.toNumber(),
    expirationBlock: expirationBlock.toNumber(),
    loanTerms: createLoanTerms(terms),
    lenderAddressId: lenderAddressId.toString(),
    lenderAccountId: lender.toString(),
});

export const createBidOrder = ({
    blockchain,
    terms,
    borrowerAddressId,
    expirationBlock,
    block,
    borrower,
}: PalletCreditcoinBidOrder): BidOrder => ({
    blockchain: blockchain.type,
    blockNumber: block.toNumber(),
    expirationBlock: expirationBlock.toNumber(),
    loanTerms: createLoanTerms(terms),
    borrowerAddressId: borrowerAddressId.toString(),
    borrowerAccountId: borrower.toString(),
});
