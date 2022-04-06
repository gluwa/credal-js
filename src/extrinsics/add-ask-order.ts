import { ApiPromise, SubmittableResult } from '@polkadot/api';
import { AddressId, AskOrder, Blockchain, LoanTerms } from '../model';
import { KeyringPair } from '@polkadot/keyring/types';
import { handleTransaction, handleTransactionFailed } from './common';
import { TxCallback } from '../types';
import { createAskOrder, createCreditcoinLoanTerms } from '../transforms';
import { GenericEventData } from '@polkadot/types/';
import { Guid } from 'js-guid';
import { blake2AsHex } from '@polkadot/util-crypto';
import { AnyJson } from '@polkadot/types-codec/types';

type AskOrderAdded = {
    askOrderId: [number, string];
    askOrder: AskOrder;
};

export const createAskOrBidOrderId = (expirationBlock: number, guid: Guid) => {
    const key = [expirationBlock, blake2AsHex(guid.toString())];
    return key;
};

export const addAskOrder = async (
    api: ApiPromise,
    lenderAddressId: AddressId,
    loanTerms: LoanTerms,
    expirationBlock: number,
    guid: Guid,
    signer: KeyringPair,
    onSuccess: TxCallback,
    onFail: TxCallback,
) => {
    const unsubscribe: () => void = await api.tx.creditcoin
        .addAskOrder(lenderAddressId, createCreditcoinLoanTerms(api, loanTerms), expirationBlock, guid.toString())
        .signAndSend(signer, { nonce: -1 }, (result) => handleTransaction(api, unsubscribe, result, onSuccess, onFail));
};

const processAskOrderAdded = (api: ApiPromise, result: SubmittableResult): AskOrderAdded => {
    const { events } = result;
    const askOrderRegistered = events.find(({ event }) => event.method === 'AskOrderAdded');
    if (!askOrderRegistered) throw new Error('AddAskOrder call returned invalid data');

    const getData = (data: GenericEventData) => {
        const askOrderId = data[0].toJSON() as [number, string];
        const askOrder = createAskOrder(api.createType('PalletCreditcoinAskOrder', data[1]));
        return { askOrderId, askOrder };
    };

    return getData(askOrderRegistered.event.data);
};

export const addAskOrderAsync = async (
    api: ApiPromise,
    lenderAddressId: AddressId,
    loanTerms: LoanTerms,
    expirationBlock: number,
    guid: Guid,
    signer: KeyringPair,
) => {
    return new Promise<AskOrderAdded>((resolve, reject) => {
        const onFail = (result: SubmittableResult) => reject(handleTransactionFailed(api, result));
        const onSuccess = (result: SubmittableResult) => resolve(processAskOrderAdded(api, result));
        addAskOrder(api, lenderAddressId, loanTerms, expirationBlock, guid, signer, onSuccess, onFail);
    });
};
