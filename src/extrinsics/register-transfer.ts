import { ApiPromise, SubmittableResult } from '@polkadot/api';
import { Blockchain, DealOrderId, Transfer, TransferId, TransferKind } from '../model';
import { GenericEventData } from '@polkadot/types/';
import { u8aConcat, u8aToU8a } from '@polkadot/util';
import { blake2AsHex } from '@polkadot/util-crypto';
import { createCreditcoinTransferKind, createTransfer } from '../transforms';
import { KeyringPair } from '@polkadot/keyring/types';
import { handleTransaction, handleTransactionFailed } from './common';
import { TxCallback } from '..';

export type TransferEventKind = 'TransferRegistered' | 'TransferVerified' | 'TransferProcessed';
export type TransferEvent = {
    kind: TransferEventKind;
    transferId: TransferId;
    transfer: Transfer;
};

export const createTransferId = (blockchain: Blockchain, externalAddress: string) => {
    const blockchainBytes = Buffer.from(blockchain.toString().toLowerCase());
    const key = u8aConcat(blockchainBytes, u8aToU8a(externalAddress));
    return blake2AsHex(key);
};

export const registerTransfer = async (
    api: ApiPromise,
    transferKind: TransferKind,
    dealOrderId: DealOrderId,
    txHash: string,
    signer: KeyringPair,
    onSuccess: TxCallback,
    onFail: TxCallback,
) => {
    const ccTransferKind = createCreditcoinTransferKind(api, transferKind);
    const ccDealOrderId = api.createType('PalletCreditcoinDealOrderId', dealOrderId);
    const unsubscribe: () => void = await api.tx.creditcoin
        .registerFundingTransfer(ccTransferKind, ccDealOrderId, txHash)
        .signAndSend(signer, { nonce: -1 }, (result) => handleTransaction(api, unsubscribe, result, onSuccess, onFail));
};

const processTransferEvent = (api: ApiPromise, result: SubmittableResult, kind: TransferEventKind): TransferEvent => {
    const { events } = result;
    const transferEvent = events.find(({ event }) => event.method === kind);
    if (!transferEvent) throw new Error(`${kind} call returned invalid data`);

    const getData = (data: GenericEventData) => {
        const transferId = data[0].toString();
        const transfer = createTransfer(api.createType('PalletCreditcoinTransfer', data[1]));
        return { kind, transferId, transfer };
    };

    return getData(transferEvent.event.data);
};

export const registerTransferAsync = async (
    api: ApiPromise,
    transferKind: TransferKind,
    dealOrderId: DealOrderId,
    txHash: string,
    signer: KeyringPair,
) => {
    return new Promise<TransferEvent>((resolve, reject) => {
        const onFail = (result: SubmittableResult) => reject(handleTransactionFailed(api, result));
        const onSuccess = (result: SubmittableResult) =>
            resolve(processTransferEvent(api, result, 'TransferRegistered'));
        registerTransfer(api, transferKind, dealOrderId, txHash, signer, onSuccess, onFail);
    });
};
