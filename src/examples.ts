import { ApiPromise, Keyring } from '@polkadot/api';
import { creditcoinApi } from './connection';
import { registerAddressAsync } from './extrinsics/register-address';
import { Wallet } from 'ethers';
import { addAskOrderAsync, createAskOrderId } from './extrinsics/add-ask-order';
import { Guid } from 'js-guid';
import { addOfferAsync, createOfferId } from './extrinsics/add-offer';
import { addBidOrderAsync, createBidOrderId } from './extrinsics/add-bid-order';
import { addDealOrderAsync, createDealOrderId } from './extrinsics/add-deal-order';
import { registerDealOrderAsync, signLoanParams } from './extrinsics/register-deal-order';
import { lendOnEth } from './ethereum';
import { registerFundingTransferAsync } from './extrinsics/register-funding-transfer';
import { TransferKind } from './model';
import { KeyringPair } from '@polkadot/keyring/types';
import dotenv from 'dotenv';
import { fundDealOrderAsync } from './extrinsics/fund-deal-order';
dotenv.config();

const setupAuthority = async (api: ApiPromise, sudoSigner: KeyringPair) => {
    const rpcUri = api.createType('String', 'Thttp://localhost:8545').toU8a();
    await api.rpc.offchain.localStorageSet('PERSISTENT', 'ethereum-rpc-uri', rpcUri);
};

const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay));

const main = async () => {
    const api = await creditcoinApi('ws://127.0.0.1:9944');
    const keyring = new Keyring({ type: 'sr25519' });
    const lender = keyring.addFromUri('//Alice');
    console.log(lender.address);
    const borrower = keyring.addFromUri('//Bob');

    // await setupAuthority(api, lender);

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
        registerAddressAsync(api, lenderWallet.address, 'Ethereum', lender),
        registerAddressAsync(api, borrowerWallet.address, 'Ethereum', borrower),
    ]);
    console.log('lender address', lenderAddress);
    console.log('borrower address', borrowerAddress);

    const askGuid = Guid.newGuid();
    const askOrderId = createAskOrderId(expBlock, askGuid);

    const bidGuid = Guid.newGuid();
    const bidOrderId = createBidOrderId(expBlock, bidGuid);
    const [askOrder, bidOrder] = await Promise.all([
        addAskOrderAsync(api, lenderAddress.addressId, loanTerms, expBlock, askGuid, lender),
        addBidOrderAsync(api, borrowerAddress.addressId, loanTerms, expBlock, bidGuid, borrower),
    ]);
    console.log(askOrder);
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

    const [tokenAddress, txHash] = await lendOnEth(
        lenderWallet,
        borrowerWallet.address,
        registerDealOrder.dealOrder.dealOrderId[1],
        loanTerms.amount,
    );
    console.log('token address ', tokenAddress, 'tx hash ', txHash);

    console.log('waiting for confirmations');
    await sleep(15000);
    const transferKind: TransferKind = { kind: 'Ethless', contractAddress: tokenAddress };

    const { waitForVerification, transfer, transferId } = await registerFundingTransferAsync(
        api,
        transferKind,
        registerDealOrder.dealOrder.dealOrderId,
        txHash,
        lender,
    );
    console.log(transfer);

    const verifiedTransfer = await waitForVerification().catch();
    console.log(verifiedTransfer);

    const [dealOrderFunded, transferProcessed] = await fundDealOrderAsync(
        api,
        registerDealOrder.dealOrder.dealOrderId,
        transferId,
        lender,
    );
    console.log(dealOrderFunded);
    console.log(transferProcessed);

    api.disconnect();
};

main().catch(console.error);
