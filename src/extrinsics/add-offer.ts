import { ApiPromise, SubmittableResult } from '@polkadot/api';
import { AskOrderId, BidOrderId, Offer, OfferId } from '../model';
import { KeyringPair } from '@polkadot/keyring/types';
import { handleTransaction, handleTransactionFailed } from './common';
import { TxCallback } from '../types';
import { createOffer } from '../transforms';
import { GenericEventData } from '@polkadot/types/';
import { blake2AsHex } from '@polkadot/util-crypto';
import { u8aConcat } from '@polkadot/util';

type OfferAdded = {
    offerId: OfferId;
    offer: Offer;
};

export const createOfferId = (expirationBlock: number, askOrderId: AskOrderId, bidOrderId: BidOrderId) => {
    const askOrderIdBytes = Buffer.from(askOrderId[1]);
    const bidOrderIdBytes = Buffer.from(bidOrderId[1]);
    const key = blake2AsHex(u8aConcat(askOrderIdBytes, bidOrderIdBytes));
    return [expirationBlock, key];
};

export const addOffer = async (
    api: ApiPromise,
    askOrderId: AskOrderId,
    bidOrderId: BidOrderId,
    expirationBlock: number,
    signer: KeyringPair,
    onSuccess: TxCallback,
    onFail: TxCallback,
) => {
    const _askOrderId = api.createType('PalletCreditcoinAskOrderId', askOrderId);
    const _bidOrderId = api.createType('PalletCreditcoinBidOrderId', bidOrderId);
    const unsubscribe: () => void = await api.tx.creditcoin
        .addOffer(_askOrderId, _bidOrderId, expirationBlock)
        .signAndSend(signer, { nonce: -1 }, (result) => handleTransaction(api, unsubscribe, result, onSuccess, onFail));
};

const processOfferAdded = (api: ApiPromise, result: SubmittableResult): OfferAdded => {
    const { events } = result;
    const offerAdded = events.find(({ event }) => event.method === 'OfferAdded');
    if (!offerAdded) throw new Error('Offer call returned invalid data');

    const getData = (data: GenericEventData) => {
        const offerId = data[0].toJSON() as OfferId;
        const offer = createOffer(api.createType('PalletCreditcoinOffer', data[1]));
        return { offerId, offer };
    };

    return getData(offerAdded.event.data);
};

export const addOfferAsync = async (
    api: ApiPromise,
    askOrderId: AskOrderId,
    bidOrderId: BidOrderId,
    expirationBlock: number,
    signer: KeyringPair,
) => {
    return new Promise<OfferAdded>((resolve, reject) => {
        const onFail = (result: SubmittableResult) => reject(handleTransactionFailed(api, result));
        const onSuccess = (result: SubmittableResult) => resolve(processOfferAdded(api, result));
        addOffer(api, askOrderId, bidOrderId, expirationBlock, signer, onSuccess, onFail);
    });
};
