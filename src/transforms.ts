import { PalletCreditcoinAddress, PalletCreditcoinAskOrder } from '@polkadot/types/lookup';
import { Address } from './model';

export const createAddress = ({ value, blockchain, owner }: PalletCreditcoinAddress): Address => {
    return {
        accountId: owner.toString(),
        blockchain: blockchain.type,
        externalAddress: value.toString(),
    };
};

export const createAskOrder = ({
    blockchain,
    terms,
    lenderAddressId,
    expirationBlock,
    block,
    lender,
}: PalletCreditcoinAskOrder) => ({
    blockchain: blockchain.type,
    blockNumber: block.toNumber(),
    expirationBlock: expirationBlock.toNumber(),
    loanTerms: {
        amount: terms.amount.toNumber(),
        interestRate: terms.interestRate.toNumber(),
        maturity: new Date(terms.maturity.toNumber()),
    },
    lenderAddressId: lenderAddressId.toString(),
    lenderAccountId: lender.toString(),
});
