import { ApiPromise, SubmittableResult } from '@polkadot/api';
import { GenericEventData } from '@polkadot/types';
import { blake2AsHex } from '@polkadot/util-crypto';
import { DealOrderId, OfferId } from '../model';
import { createDealOrder } from '../transforms';
import { TxCallback } from '../types';
import { handleTransaction, handleTransactionFailed } from './common';
import { KeyringPair } from '@polkadot/keyring/types';

type DealOrderAdded = {
    dealOrderId: DealOrderId;
};
export const createDealOrderId = (expirationBlock: number, offerId: OfferId) => [
    expirationBlock,
    blake2AsHex(offerId[1]),
];

export const addDealOrder = async (
    api: ApiPromise,
    offerId: OfferId,
    expirationBlock: number,
    signer: KeyringPair,
    onSuccess: TxCallback,
    onFail: TxCallback,
) => {
    const _offerId = api.createType('PalletCreditcoinOfferId', offerId);
    const unsubscribe: () => void = await api.tx.creditcoin
        .addDealOrder(_offerId, expirationBlock)
        .signAndSend(signer, { nonce: -1 }, (result) => handleTransaction(api, unsubscribe, result, onSuccess, onFail));
};

const processDealOrderAdded = (api: ApiPromise, result: SubmittableResult): DealOrderAdded => {
    const { events } = result;
    const dealOrderAdded = events.find(({ event }) => event.method === 'DealOrderAdded');
    if (!dealOrderAdded) throw new Error('DealOrder call returned invalid data');

    const getData = (data: GenericEventData) => {
        const dealOrderId = data[0].toJSON() as DealOrderId;
        const dealOrder = createDealOrder(api.createType('PalletCreditcoinDealOrder', data[1]));
        return { dealOrderId, dealOrder };
    };

    return getData(dealOrderAdded.event.data);
};

export const addDealOrderAsync = (api: ApiPromise, offerId: OfferId, expirationBlock: number, signer: KeyringPair) => {
    return new Promise<DealOrderAdded>((resolve, reject) => {
        const onFail = (result: SubmittableResult) => reject(handleTransactionFailed(api, result));
        const onSuccess = (result: SubmittableResult) => resolve(processDealOrderAdded(api, result));
        addDealOrder(api, offerId, expirationBlock, signer, onSuccess, onFail);
    });
};
