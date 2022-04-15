import { ApiPromise, SubmittableResult } from '@polkadot/api';
import { AddressId, BidOrder, BidOrderId, LoanTerms } from '../model';
import { KeyringPair } from '@polkadot/keyring/types';
import { handleTransaction, handleTransactionFailed, processEvents } from './common';
import { TxCallback } from '../types';
import { createBidOrder, createCreditcoinLoanTerms } from '../transforms';
import { Guid } from 'js-guid';
import { blake2AsHex } from '@polkadot/util-crypto';

export type BidOrderAdded = {
    bidOrderId: BidOrderId;
    bidOrder: BidOrder;
};

export const createBidOrderId = (expirationBlock: number, guid: Guid): BidOrderId =>
    [expirationBlock, blake2AsHex(guid.toString())] as BidOrderId;

export const addBidOrder = async (
    api: ApiPromise,
    borrowerAddressId: AddressId,
    loanTerms: LoanTerms,
    expirationBlock: number,
    guid: Guid,
    signer: KeyringPair,
    onSuccess: TxCallback,
    onFail: TxCallback,
) => {
    const unsubscribe: () => void = await api.tx.creditcoin
        .addBidOrder(borrowerAddressId, createCreditcoinLoanTerms(api, loanTerms), expirationBlock, guid.toString())
        .signAndSend(signer, { nonce: -1 }, (result) => handleTransaction(api, unsubscribe, result, onSuccess, onFail));
};

export const processBidOrderAdded = (api: ApiPromise, result: SubmittableResult): BidOrderAdded => {
    const { itemId, item } = processEvents(api, result, 'BidOrderAdded', 'PalletCreditcoinBidOrder', createBidOrder);
    return { bidOrderId: itemId as BidOrderId, bidOrder: item };
};

export const addBidOrderAsync = async (
    api: ApiPromise,
    borrowerAddressId: AddressId,
    loanTerms: LoanTerms,
    expirationBlock: number,
    guid: Guid,
    signer: KeyringPair,
) => {
    return new Promise<BidOrderAdded>((resolve, reject) => {
        const onFail = (result: SubmittableResult) => reject(handleTransactionFailed(api, result));
        const onSuccess = (result: SubmittableResult) => resolve(processBidOrderAdded(api, result));
        addBidOrder(api, borrowerAddressId, loanTerms, expirationBlock, guid, signer, onSuccess, onFail).catch(
            (reason) => reject(reason),
        );
    });
};
