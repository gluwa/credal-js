import { ApiPromise, SubmittableResult } from '@polkadot/api';
import { Address, Blockchain } from '../model';
import { KeyringPair } from '@polkadot/keyring/types';
import { handleTransaction } from '../utils';
import { TxOnFail, TxOnSuccess } from '../types';
import { AddressConverter } from '../transform';
import { GenericEventData } from '@polkadot/types/';

type RegisteredAddress = {
    addressId: string;
    address: Address;
};

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

const processRegisteredAddress = (api: ApiPromise, result: SubmittableResult): RegisteredAddress | undefined => {
    const { events } = result;
    const addressRegistered = events.find(({ event }) => event.method == 'AddressRegistered');

    const getData = (data: GenericEventData) => {
        const addressId = data[0].toString();
        const address = AddressConverter.toModel(api.createType('PalletCreditcoinAddress', data[1]));
        return { addressId, address }; //{ [addressId]: info }
    };
    return addressRegistered && getData(addressRegistered.event.data);
};

export const registerAddressAsync = async (
    api: ApiPromise,
    externalAddress: string,
    blockchain: Blockchain,
    signer: KeyringPair,
) => {
    return new Promise<RegisteredAddress | undefined>((resolve) => {
        const onFail = () => resolve(undefined);
        const onSuccess = (result: SubmittableResult) => resolve(processRegisteredAddress(api, result));
        registerAddress(api, externalAddress, blockchain, signer, onSuccess, onFail);
    });
};
