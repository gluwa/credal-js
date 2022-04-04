import { PalletCreditcoinAddress } from '@polkadot/types/lookup';
import { Address } from './model';

export const createAddress = ({ value, blockchain, owner }: PalletCreditcoinAddress): Address => {
    return {
        accountId: owner.toString(),
        blockchain: blockchain.type,
        externalAddress: value.toString(),
    };
};
