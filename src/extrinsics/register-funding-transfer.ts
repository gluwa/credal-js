import { ApiPromise, SubmittableResult } from '@polkadot/api';
import { Blockchain, DealOrderId, Transfer, TransferId, TransferKind } from '../model';
import { u8aConcat, u8aToU8a } from '@polkadot/util';
import { blake2AsHex } from '@polkadot/util-crypto';
import { createCreditcoinTransferKind, createTransfer } from '../transforms';
import { KeyringPair } from '@polkadot/keyring/types';
import { handleTransaction, handleTransactionFailed, processEvents } from './common';
import { TxCallback } from '..';
import { PalletCreditcoinTransfer } from '@polkadot/types/lookup';
import { Option } from '@polkadot/types-codec';

export type TransferEventKind = 'TransferRegistered' | 'TransferVerified' | 'TransferProcessed';
export type TransferEvent = {
    kind: TransferEventKind;
    transferId: TransferId;
    transfer: Transfer;
    waitForVerification: (timeout?: number) => Promise<Transfer>;
};

export const createFundingTransferId = (blockchain: Blockchain, txHash: string) => {
    const blockchainBytes = Buffer.from(blockchain.toString().toLowerCase());
    const key = u8aConcat(blockchainBytes, u8aToU8a(txHash));
    return blake2AsHex(key);
};

export const registerFundingTransfer = async (
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

export const verifiedTransfer = async (api: ApiPromise, transferId: TransferId, timeout = 20_000) => {
    return new Promise<Transfer>((resolve, reject) => {
        let timer: NodeJS.Timeout | undefined;
        api.query.creditcoin
            .transfers(transferId, (result: Option<PalletCreditcoinTransfer>) => {
                if (!timer) timer = setTimeout(() => reject(new Error('Transfer verification timed out')), timeout);
                if (result.isSome) {
                    clearTimeout(timer);
                    const transfer = createTransfer(result.unwrap());
                    resolve(transfer);
                }
            })
            .catch((reason) => reject(reason));
    });
};

const processTransferEvent = (api: ApiPromise, result: SubmittableResult, kind: TransferEventKind): TransferEvent => {
    const { itemId, item } = processEvents(api, result, kind, 'PalletCreditcoinTransfer', createTransfer);

    const transferEventData = { kind, transferId: itemId as TransferId, transfer: item };
    const waitForVerification = (timeout = 180_000) => verifiedTransfer(api, transferEventData.transferId, timeout);
    return { ...transferEventData, waitForVerification };
};

export const registerFundingTransferAsync = async (
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
        registerFundingTransfer(api, transferKind, dealOrderId, txHash, signer, onSuccess, onFail).catch((reason) =>
            reject(reason),
        );
    });
};
