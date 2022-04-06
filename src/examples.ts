import { Keyring } from '@polkadot/api';
import { creditcoinApi } from './connection';
import { registerAddressAsync } from './extrinsics/register-address';
import { Wallet } from 'ethers';
import { addAskOrderAsync } from './extrinsics/add-ask-order';
import { Guid } from 'js-guid';
import { addOfferAsync } from './extrinsics/add-offer';
import { addBidOrderAsync } from './extrinsics/add-bid-order';

const main = async () => {
    const api = await creditcoinApi('ws://localhost:9944');
    const keyring = new Keyring({ type: 'sr25519' });
    const lender = keyring.addFromUri('//Alice');
    const borrower = keyring.addFromUri('//Bob');

    const expBlock = 10000;
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

    const borrowerAddress = await registerAddressAsync(api, Wallet.createRandom().address, 'Ethereum', borrower);
    console.log(borrowerAddress);
    const bidGuid = Guid.newGuid();
    const bidOrder = await addBidOrderAsync(
        api,
        borrowerAddress.addressId,
        { amount: BigInt(100), interestRate: 10, maturity: new Date(100) },
        expBlock,
        bidGuid,
        borrower,
    );
    console.log(bidOrder);

    const offer = await addOfferAsync(api, askOrder.askOrderId, bidOrder.bidOrderId, expBlock, lender);
    console.log(offer);

    await api.disconnect();
};

main().catch(console.error);
