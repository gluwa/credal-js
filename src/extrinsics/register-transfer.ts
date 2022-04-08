import { ApiPromise } from '@polkadot/api';
import { Blockchain, DealOrderId, TransferId, TransferKind } from '../model';
import { u8aConcat, u8aToU8a } from '@polkadot/util';
import { blake2AsHex } from '@polkadot/util-crypto';
import { createCreditcoinTransferKind } from 'credal-js/transforms';
import { KeyringPair } from '@polkadot/keyring/types';
import { handleTransaction } from './common';
import { TxCallback } from '..';

export const createTransferId = (blockchain: Blockchain, blockchainTxId: string): TransferId => {
    const blockchainBytes = Buffer.from(blockchain.toString().toLowerCase());
    const key = u8aConcat(blockchainBytes, u8aToU8a(blockchainTxId));
    return blake2AsHex(key);
};

export const registerFundingTransfer = async (
    api: ApiPromise,
    transferKind: TransferKind,
    dealOrderId: DealOrderId,
    blockchainTxId: string,
    lender: KeyringPair,
    onSuccess: TxCallback,
    onFail: TxCallback,
) => {
    const ccDealOrderId = api.createType('PalletCreditcoinDealOrderId', dealOrderId);
    const unsubscribe: () => void = await api.tx.creditcoin
        .registerFundingTransfer(createCreditcoinTransferKind(api, transferKind), ccDealOrderId, blockchainTxId)
        .signAndSend(lender, { nonce: -1 }, (result) => handleTransaction(api, unsubscribe, result, onSuccess, onFail));
};
