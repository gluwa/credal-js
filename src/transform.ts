import { ApiPromise } from '@polkadot/api';
import { PalletCreditcoinAddress } from '@polkadot/types/lookup';
import { Address } from './model';

export module AddressConverter {
    export const toModel = ({ value, blockchain, owner }: PalletCreditcoinAddress): Address => {
        return {
            accountId: owner.toString(),
            blockchain: blockchain.type,
            externalAddress: value.toString(),
        };
    };

    export const fromModel = (
        api: ApiPromise,
        { accountId, blockchain, externalAddress }: Address,
    ): PalletCreditcoinAddress =>
        api.createType('PalletCreditcoinAddress', {
            owner: accountId,
            blockchain,
            value: externalAddress,
        });
}
