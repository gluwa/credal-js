import { ApiPromise } from '@polkadot/api';
import { Blockchain } from 'model';
import { KeyringPair } from '@polkadot/keyring/types';
import { handleTransaction } from 'utils';
import { TxOnFail, TxOnSuccess } from 'types';

export const registerAddress = async (
    api: ApiPromise,
    externalAddress: string,
    blockchain: Blockchain,
    signer: KeyringPair,
    onSuccess: TxOnSuccess,
    onFail: TxOnFail,
) => {
    const unsubscribe: () => void = await api.tx.creditcoin
        .registerAddress(blockchain, externalAddress)
        .signAndSend(signer, { nonce: -1 }, (result) => handleTransaction(api, unsubscribe, result, onSuccess, onFail));
};
