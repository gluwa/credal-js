import { Keyring } from '@polkadot/api';
import { creditcoinApi } from './creditcoin-api';
import { Wallet } from 'ethers';
import { createAskOrderId } from './extrinsics/add-ask-order';
import { Guid } from 'js-guid';
import { createOfferId } from './extrinsics/add-offer';
import { createBidOrderId } from './extrinsics/add-bid-order';
import { createDealOrderId } from './extrinsics/add-deal-order';
import { signLoanParams } from './extrinsics/register-deal-order';
import { lendOnEth } from './ethereum';
import { TransferKind } from './model';
import dotenv from 'dotenv';
import { addAuthorityAsync } from './extrinsics/add-authority';
dotenv.config();

const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay));

const main = async () => {
    const { api, extrinsics } = await creditcoinApi('ws://127.0.0.1:9944');
    const {
        registerAddress,
        addAskOrder,
        addBidOrder,
        addOffer,
        addDealOrder,
        registerDealOrder,
        registerFundingTransfer,
        fundDealOrder,
        lockDealOrder,
    } = extrinsics;

    const keyring = new Keyring({ type: 'sr25519' });
    const lender = keyring.addFromUri('//Alice');
    console.log(lender.address);
    const borrower = keyring.addFromUri('//Bob');

    // await addAuthorityAsync(api, '5C7conswAmt3HJrSyhcehWo7qqwy4f2thW2P2VLz1x4yMW6e', lender).catch(console.error);

    const expBlock = 1000000;
    const loanTerms = {
        amount: BigInt(100),
        interestRate: {
            ratePerPeriod: 10,
            decimals: 4,
            period: {
                secs: 60,
                nanos: 0,
            },
        },
        termLength: {
            secs: 6000,
            nanos: 0,
        },
    };

    const lenderWallet = Wallet.createRandom();
    const borrowerWallet = Wallet.createRandom();

    const [lenderAddress, borrowerAddress] = await Promise.all([
        registerAddress(lenderWallet.address, 'Ethereum', lender),
        registerAddress(borrowerWallet.address, 'Ethereum', borrower),
    ]);
    console.log('lender address', lenderAddress);
    console.log('borrower address', borrowerAddress);

    const askGuid = Guid.newGuid();
    const askOrderId = createAskOrderId(expBlock, askGuid);

    const bidGuid = Guid.newGuid();
    const bidOrderId = createBidOrderId(expBlock, bidGuid);
    const [askOrder, bidOrder] = await Promise.all([
        addAskOrder(lenderAddress.addressId, loanTerms, expBlock, askGuid, lender),
        addBidOrder(borrowerAddress.addressId, loanTerms, expBlock, bidGuid, borrower),
    ]);
    console.log(askOrder);
    console.log(bidOrder);

    const offer = await addOffer(askOrderId, bidOrderId, expBlock, lender);
    console.log(offer);
    const offerId = createOfferId(expBlock, askOrderId, bidOrderId);
    console.log(offerId);

    const dealOrderId = createDealOrderId(expBlock, offerId);
    const dealOrder = await addDealOrder(offerId, expBlock, borrower);
    console.log(dealOrder);
    console.log(dealOrderId);

    const askGuid2 = Guid.newGuid();
    const bidGuid2 = Guid.newGuid();
    const signedParams = signLoanParams(api, borrower, expBlock, askGuid2, bidGuid2, loanTerms);
    const dealOrder2 = await registerDealOrder(
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
    console.log(dealOrder2);

    const [tokenAddress, txHash] = await lendOnEth(
        lenderWallet,
        borrowerWallet.address,
        dealOrder2.dealOrder.dealOrderId[1],
        loanTerms.amount,
    );
    console.log('token address ', tokenAddress, 'tx hash ', txHash);

    console.log('waiting for confirmations');
    await sleep(15000);
    const transferKind: TransferKind = { kind: 'Ethless', contractAddress: tokenAddress };

    const { waitForVerification, transfer, transferId } = await registerFundingTransfer(
        transferKind,
        dealOrder2.dealOrder.dealOrderId,
        txHash,
        lender,
    );
    console.log(transfer);

    const verifiedTransfer = await waitForVerification().catch();
    console.log(verifiedTransfer);

    const [dealOrderFunded, transferProcessed] = await fundDealOrder(
        dealOrder2.dealOrder.dealOrderId,
        transferId,
        lender,
    );
    console.log(dealOrderFunded);
    console.log(transferProcessed);

    const lockedDealOrder = await lockDealOrder(dealOrder2.dealOrder.dealOrderId, borrower);
    console.log(lockedDealOrder);

    await api.disconnect().catch(console.error);
};

main().catch(console.error);
