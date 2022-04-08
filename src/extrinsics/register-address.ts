import { ApiPromise, SubmittableResult } from '@polkadot/api';
import { Address, Blockchain } from '../model';
import { KeyringPair } from '@polkadot/keyring/types';
import { handleTransaction, handleTransactionFailed } from './common';
import { TxCallback } from '../types';
import { createAddress } from '../transforms';
import { GenericEventData } from '@polkadot/types/';
import { u8aConcat, u8aToU8a } from '@polkadot/util';
import { blake2AsHex } from '@polkadot/util-crypto';

export type AddressRegistered = {
    addressId: string;
    address: Address;
};

export const createAddressId = (blockchain: Blockchain, externalAddress: string) => {
    const blockchainBytes = Buffer.from(blockchain.toString().toLowerCase());
    const key = u8aConcat(blockchainBytes, u8aToU8a(externalAddress));
    return blake2AsHex(key);
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

const processAddressRegistered = (api: ApiPromise, result: SubmittableResult): AddressRegistered => {
    const { events } = result;
    const addressRegistered = events.find(({ event }) => event.method === 'AddressRegistered');
    if (!addressRegistered) throw new Error('Register Address call returned invalid data');

    const getData = (data: GenericEventData) => {
        const addressId = data[0].toString();
        const address = createAddress(api.createType('PalletCreditcoinAddress', data[1]));
        return { addressId, address };
    };

    return getData(addressRegistered.event.data);
};

export const registerAddressAsync = async (
    api: ApiPromise,
    externalAddress: string,
    blockchain: Blockchain,
    signer: KeyringPair,
) => {
    return new Promise<AddressRegistered>((resolve, reject) => {
        const onFail = (result: SubmittableResult) => reject(handleTransactionFailed(api, result));
        const onSuccess = (result: SubmittableResult) => resolve(processAddressRegistered(api, result));
        registerAddress(api, externalAddress, blockchain, signer, onSuccess, onFail).catch((reason) => reject(reason));
    });
};
