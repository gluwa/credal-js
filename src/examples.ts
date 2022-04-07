import { Keyring } from '@polkadot/api';
import { creditcoinApi } from './connection';
import { registerAddressAsync } from './extrinsics/register-address';
import { Wallet } from 'ethers';
import { addAskOrderAsync, createAskOrderId } from './extrinsics/add-ask-order';
import { Guid } from 'js-guid';
import { addOfferAsync, createOfferId } from './extrinsics/add-offer';
import { addBidOrderAsync, createBidOrderId } from './extrinsics/add-bid-order';
import { addDealOrderAsync, createDealOrderId } from './extrinsics/add-deal-order';
import { registerDealOrderAsync, signLoanParams } from './extrinsics/register-deal-order';

const main = async () => {
    const api = await creditcoinApi('ws://localhost:9944');
    const keyring = new Keyring({ type: 'sr25519' });
    const lender = keyring.addFromUri('//Alice');
    const borrower = keyring.addFromUri('//Bob');

    const expBlock = 10000;
    const loanTerms = { amount: BigInt(100), interestRate: 10, maturity: new Date(100) };

    const lenderAddress = await registerAddressAsync(api, Wallet.createRandom().address, 'Ethereum', lender);
    console.log(lenderAddress);

    const askGuid = Guid.newGuid();
    const askOrder = await addAskOrderAsync(
        api,
        lenderAddress.addressId,
        { amount: BigInt(100), interestRate: 10, maturity: new Date(100) },
        expBlock,
        askGuid,
        lender,
    );
    console.log(askOrder);
    const askOrderId = createAskOrderId(expBlock, askGuid);

    const borrowerAddress = await registerAddressAsync(api, Wallet.createRandom().address, 'Ethereum', borrower);
    console.log(borrowerAddress);

    const bidGuid = Guid.newGuid();
    const bidOrder = await addBidOrderAsync(api, borrowerAddress.addressId, loanTerms, expBlock, bidGuid, borrower);
    const bidOrderId = createBidOrderId(expBlock, bidGuid);
    console.log(bidOrder);

    const offer = await addOfferAsync(api, askOrderId, bidOrderId, expBlock, lender);
    console.log(offer);
    const offerId = createOfferId(expBlock, askOrderId, bidOrderId);
    console.log(offerId);

    const dealOrderId = createDealOrderId(expBlock, offerId);
    const dealOrder = await addDealOrderAsync(api, offerId, expBlock, borrower);
    console.log(dealOrder);
    console.log(dealOrderId);

    const askGuid2 = Guid.newGuid();
    const bidGuid2 = Guid.newGuid();
    const signedParams = signLoanParams(api, borrower, expBlock, askGuid2, bidGuid2, loanTerms);
    const registerDealOrder = await registerDealOrderAsync(
        api,
        lenderAddress.addressId,
        borrowerAddress.addressId,
        loanTerms,
        expBlock,
        askGuid2,
        bidGuid2,
        borrower.publicKey,
        signedParams,
        lender,
    );
    console.log(registerDealOrder);
    await api.disconnect();
};

main().catch(console.error);
