import { Keyring, ApiPromise } from '@polkadot/api';
import { creditcoinApi } from './creditcoin-api';
import { Wallet } from 'ethers';
import { createAskOrderId } from './extrinsics/add-ask-order';
import { Guid } from 'js-guid';
import { createOfferId } from './extrinsics/add-offer';
import { createBidOrderId } from './extrinsics/add-bid-order';
import { createDealOrderId } from './extrinsics/add-deal-order';
import { signLoanParams } from './extrinsics/register-deal-order';
import { addAuthorityAsync } from './extrinsics/add-authority';
import { lendOnEth } from './ethereum';
import { TransferKind } from './model';
import { KeyringPair } from '@polkadot/keyring/types';
import { JsonRpcProvider } from '@ethersproject/providers';
import { u64, Option, Null } from '@polkadot/types';
import dotenv from 'dotenv';
dotenv.config();

const AUTHORITY_PUBKEY = '0xcce7c3c86f7e4431cdefca6c328bab69af12010a4a9fa0d91be37a24776afd4a';
const AUTHORITY_SURI = 'blade city surround refuse fold spring trip enlist myself wild elevator coil';
const AUTHORITY_ACCOUNTID = '5GhNUTKw9xkTN5Za4torEe1SAGPhXjM78oNZWAXrFymhB6oZ';

const setupAuthority = async (api: ApiPromise, sudoSigner: KeyringPair) => {
    const u8aToHex = (bytes: Uint8Array): string => {
        return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '0x');
    };
    const rpcUri = u8aToHex(api.createType('String', 'http://localhost:8545').toU8a());
    await api.rpc.offchain.localStorageSet('PERSISTENT', 'ethereum-rpc-uri', rpcUri);
    if ((await api.query.difficulty.targetBlockTime<u64>()).toNumber() > 4000) {
        console.log('setting target block time to 500');
        await api.tx.sudo.sudo(api.tx.difficulty.setTargetBlockTime(4000)).signAndSend(sudoSigner, { nonce: -1 });
    }
    const hasAuthKey = await api.rpc.author.hasKey(AUTHORITY_PUBKEY, 'ctcs');
    if (hasAuthKey.isFalse) {
        console.log('no auth key!');
        await api.rpc.author.insertKey('ctcs', AUTHORITY_SURI, AUTHORITY_PUBKEY);
    }
    const auth = await api.query.creditcoin.authorities<Option<Null>>(AUTHORITY_ACCOUNTID);
    if (auth.isNone) {
        console.log('adding authority');
        await addAuthorityAsync(api, AUTHORITY_ACCOUNTID, sudoSigner);
    }
    await api.tx.sudo
        .sudo(api.tx.balances.setBalance(AUTHORITY_ACCOUNTID, '1000000000000000000', '0'))
        .signAndSend(sudoSigner, { nonce: -1 });
};

const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay));

const getEthTip = async (provider: JsonRpcProvider): Promise<number> => {
    return await provider.getBlockNumber();
};

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
    } = extrinsics;
    const provider = new JsonRpcProvider('http://localhost:8545');
    const keyring = new Keyring({ type: 'sr25519' });
    const lender = keyring.addFromUri('//Alice');
    console.log(lender.address);
    const borrower = keyring.addFromUri('//Bob');

    await setupAuthority(api, lender);

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

    const tx = await provider.getTransaction(txHash);

    const txBlocknum = tx.blockNumber;
    if (!txBlocknum) {
        console.error('tx blocknumber missing!');
        return;
    }

    console.log('waiting for confirmations');
    let tip = await getEthTip(provider);
    while (tip < txBlocknum + 12) {
        await sleep(1000);
        tip = await getEthTip(provider);
    }

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

    api.disconnect().catch(console.error);
};

main().catch(console.error);
