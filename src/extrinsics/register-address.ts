import { ApiPromise, SubmittableResult } from '@polkadot/api';
import { Address, Blockchain } from '../model';
import { KeyringPair } from '@polkadot/keyring/types';
import { handleTransaction } from '../utils';
import { TxCallback } from '../types';
import { createAddress } from '../transforms';
import { GenericEventData } from '@polkadot/types/';
import { ExtrinsicFailed } from '../types';

type RegisteredAddress = {
    addressId: string;
    address: Address;
};

export const registerAddress = async (
    api: ApiPromise,
    externalAddress: string,
    blockchain: Blockchain,
    signer: KeyringPair,
    onSuccess: TxCallback,
    onFail: TxCallback,
) => {
    const unsubscribe: () => void = await api.tx.creditcoin
        .registerAddress(blockchain, externalAddress)
        .signAndSend(signer, { nonce: -1 }, (result) => handleTransaction(api, unsubscribe, result, onSuccess, onFail));
};

const processRegisteredAddress = (api: ApiPromise, result: SubmittableResult): RegisteredAddress | ExtrinsicFailed => {
    const { events } = result;
    const addressRegistered = events.find(({ event }) => event.method === 'AddressRegistered');

    const getData = (data: GenericEventData) => {
        const addressId = data[0].toString();
        const address = createAddress(api.createType('PalletCreditcoinAddress', data[1]));
        return { addressId, address };
    };
    return addressRegistered ? getData(addressRegistered.event.data) : 'unknown error';
};

const registerAddressFailed = (api: ApiPromise, result: SubmittableResult): ExtrinsicFailed => {
    const { dispatchError } = result;
    if (dispatchError) {
        if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            const { docs, name, section } = decoded;
            return `${section}.${name}: ${docs.join(' ')}`;
        }
        return dispatchError.toString();
    }
    return 'Unknown Error';
};

export const registerAddressAsync = async (
    api: ApiPromise,
    externalAddress: string,
    blockchain: Blockchain,
    signer: KeyringPair,
) => {
    return new Promise<RegisteredAddress | ExtrinsicFailed>((resolve, reject) => {
        const onFail = (result: SubmittableResult) => reject(registerAddressFailed(api, result));
        const onSuccess = (result: SubmittableResult) => resolve(processRegisteredAddress(api, result));
        registerAddress(api, externalAddress, blockchain, signer, onSuccess, onFail).catch((reason) => reject(reason));
    });
};
