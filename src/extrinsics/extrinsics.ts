import { ApiPromise } from '@polkadot/api';
import { Guid } from 'js-guid';
import { addAskOrderAsync } from './add-ask-order';
import { addBidOrderAsync } from './add-bid-order';
import { addDealOrderAsync } from './add-deal-order';
import { addOfferAsync } from './add-offer';
import { fundDealOrderAsync } from './fund-deal-order';
import { registerAddressAsync } from './register-address';
import { registerDealOrderAsync } from './register-deal-order';
import { registerFundingTransferAsync } from './register-funding-transfer';
import {
    Blockchain,
    AddressId,
    LoanTerms,
    AskOrderId,
    BidOrderId,
    OfferId,
    TransferKind,
    DealOrderId,
    TransferId,
} from '../model';
import { KeyringPair } from '@polkadot/keyring/types';

export const extrinsics = (api: ApiPromise) => {
    const registerAddress = async (externalAddress: string, blockchain: Blockchain, signer: KeyringPair) =>
        registerAddressAsync(api, externalAddress, blockchain, signer);

    const addAskOrder = async (
        lenderAddressId: AddressId,
        loanTerms: LoanTerms,
        expirationBlock: number,
        guid: Guid,
        signer: KeyringPair,
    ) => addAskOrderAsync(api, lenderAddressId, loanTerms, expirationBlock, guid, signer);

    const addBidOrder = async (
        borrowerAddressId: AddressId,
        loanTerms: LoanTerms,
        expirationBlock: number,
        guid: Guid,
        signer: KeyringPair,
    ) => addBidOrderAsync(api, borrowerAddressId, loanTerms, expirationBlock, guid, signer);

    const addOffer = async (
        askOrderId: AskOrderId,
        bidOrderId: BidOrderId,
        expirationBlock: number,
        signer: KeyringPair,
    ) => addOfferAsync(api, askOrderId, bidOrderId, expirationBlock, signer);

    const addDealOrder = async (offerId: OfferId, expirationBlock: number, signer: KeyringPair) =>
        addDealOrderAsync(api, offerId, expirationBlock, signer);

    const registerDealOrder = async (
        lenderAddressId: AddressId,
        borrowerAddressId: AddressId,
        loanTerms: LoanTerms,
        expBlock: number,
        askGuid: Guid,
        bidGuid: Guid,
        borrowerKey: Uint8Array,
        signedParams: Uint8Array,
        lender: KeyringPair,
    ) =>
        registerDealOrderAsync(
            api,
            lenderAddressId,
            borrowerAddressId,
            loanTerms,
            expBlock,
            askGuid,
            bidGuid,
            borrowerKey,
            signedParams,
            lender,
        );

    const registerFundingTransfer = async (
        transferKind: TransferKind,
        dealOrderId: DealOrderId,
        txHash: string,
        signer: KeyringPair,
    ) => registerFundingTransferAsync(api, transferKind, dealOrderId, txHash, signer);

    const fundDealOrder = async (dealOrderId: DealOrderId, transferId: TransferId, lender: KeyringPair) =>
        fundDealOrderAsync(api, dealOrderId, transferId, lender);

    return {
        registerAddress,
        addAskOrder,
        addBidOrder,
        addOffer,
        addDealOrder,
        registerDealOrder,
        registerFundingTransfer,
        fundDealOrder,
    };
};
