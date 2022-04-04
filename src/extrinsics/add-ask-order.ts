import { ApiPromise, SubmittableResult } from '@polkadot/api';
import { Address, AddressId, AskOrder, Blockchain, LoanTerms } from '../model';
import { KeyringPair } from '@polkadot/keyring/types';
import { handleTransaction } from '../utils';
import { ExtrinsicFailed, TxCallback } from '../types';
import { createAddress } from '../transforms';
import { GenericEventData } from '@polkadot/types/';
import { Guid } from 'js-guid';

type AddedAskOrder = {
    askOrderId: string;
    askOrder: AskOrder;
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
        .addAskOrder(lenderAddressId, loanTerms, expirationBlock, guid.toString())
        .signAndSend(signer, { nonce: -1 }, (result) => handleTransaction(api, unsubscribe, result, onSuccess, onFail));
};
