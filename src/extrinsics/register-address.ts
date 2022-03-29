import { ApiPromise } from '@polkadot/api';
import { Blockchain } from 'model';
import { KeyringPair } from '@polkadot/keyring/types';

export const registerAddress = async (
    api: ApiPromise,
    externalAddress: string,
    blockchain: Blockchain,
    signer: KeyringPair,
) => {
    const unsubscribe = await api.tx.creditcoin
        .registerAddress(blockchain, externalAddress)
        .signAndSend(signer, { nonce: -1 });
    console.log(unsubscribe);
};
