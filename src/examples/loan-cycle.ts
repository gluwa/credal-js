import { Keyring } from '@polkadot/api';
import { creditcoinApi } from '../creditcoin-api';
import { Wallet } from 'ethers';
import { Guid } from 'js-guid';
import { signLoanParams } from '../extrinsics/register-deal-order';
import { ethConnection } from './ethereum';
import { TransferKind } from '../model';
import dotenv from 'dotenv';
import { setupAuthority } from './setup-authority';
import { createBidOrderId } from 'credal-js/extrinsics/add-bid-order';
import { createDealOrderId } from 'credal-js/extrinsics/add-deal-order';
import { createOfferId } from 'credal-js/extrinsics/add-offer';
dotenv.config();

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
        registerRepaymentTransfer,
        closeDealOrder,
        exemptLoan,
    } = extrinsics;

    const keyring = new Keyring({ type: 'sr25519' });
    const lender = keyring.addFromUri('//Alice');
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

    // Prepare a borrower and lender by registering their ethereum addresses
    const [lenderAddress, borrowerAddress] = await Promise.all([
        registerAddress(lenderWallet.address, 'Ethereum', lender),
        registerAddress(borrowerWallet.address, 'Ethereum', borrower),
    ]);
    console.log('lender address', lenderAddress);
    console.log('borrower address', borrowerAddress);

    // Execute a full loan cycle
    const fullLoanCycle = async () => {
        // A lender adds an ask order and borrower adds a bid order
        const askGuid = Guid.newGuid();
        const bidGuid = Guid.newGuid();
        const [{ askOrderId, askOrder }, { bidOrderId, bidOrder }] = await Promise.all([
            addAskOrder(lenderAddress.addressId, loanTerms, expBlock, askGuid, lender),
            addBidOrder(borrowerAddress.addressId, loanTerms, expBlock, bidGuid, borrower),
        ]);
        console.log(askOrder);
        console.log(bidOrder);

        // A lender makes an offer connecting the ask and bid
        const { offerId, offer } = await addOffer(askOrderId, bidOrderId, expBlock, lender);
        console.log(offer);
        console.log(offerId);

        // A borrower accepts the offer by making a new Deal Order
        const { dealOrderId, dealOrder } = await addDealOrder(offerId, expBlock, borrower);
        console.log(dealOrder);
        console.log(dealOrderId);

        // connect to ethereum to lend and repay
        const { lend, repay, waitUntilTip } = await ethConnection();

        // Lender lends to borrower on ethereum
        const [tokenAddress, lendTxHash, lendBlockNumber] = await lend(
            lenderWallet,
            borrowerWallet.address,
            dealOrderId[1],
            loanTerms.amount,
        );
        console.log('token address ', tokenAddress, 'tx hash ', lendTxHash);

        // Creditcoin coin requires that at least 12 blocks have been mined before it can verify
        // ethereum transaction
        console.log('waiting for confirmations');
        await waitUntilTip(lendBlockNumber + 12);

        // Register the ethereum transaction as a funding transfer
        const transferKind: TransferKind = { kind: 'Ethless', contractAddress: tokenAddress };
        const { waitForVerification, transfer, transferId } = await registerFundingTransfer(
            transferKind,
            dealOrderId,
            lendTxHash,
            lender,
        );
        console.log(transfer);

        // Wait for the registered transfer to be verified by an off chain worker
        const verifiedTransfer = await waitForVerification().catch();
        console.log(verifiedTransfer);

        // once the transfer is verified, the lender can mark the deal order as funded
        const [dealOrderFunded, transferProcessed] = await fundDealOrder(dealOrderId, transferId, lender);
        console.log(dealOrderFunded);
        console.log(transferProcessed);

        // Prior to repaying the loan, the borrower must lock the loan so that it can't be transferred/sold
        const lockedDealOrder = await lockDealOrder(dealOrderId, borrower);
        console.log(lockedDealOrder);

        // The borrower repays the lender on ethereum
        const [, repayTxHash, repayBlockNumber] = await repay(
            borrowerWallet,
            lenderWallet.address,
            dealOrderId[1],
            loanTerms.amount,
        );

        // Creditcoin coin requires that at least 12 blocks have been mined before it can verify
        // ethereum transaction
        await waitUntilTip(repayBlockNumber + 12);

        // Register the ethereum transaction as a repayment transfer
        const registeredRepayment = await registerRepaymentTransfer(
            transferKind,
            loanTerms.amount,
            dealOrderId,
            repayTxHash,
            borrower,
        );
        console.log(registeredRepayment);

        // Wait for the registered transfer to be verified by an off chain worker
        const verifiedRepayment = await registeredRepayment.waitForVerification().catch();
        console.log('verification:', verifiedRepayment);

        // Once loan has been repaid it can be the repayment is registered and closes the deal order
        const closedDealOrder = await closeDealOrder(dealOrderId, registeredRepayment.transferId, borrower);
        console.log('closed deal order', closedDealOrder);
    };

    // Execute loan cycle via registerDealOrder and close via exempt
    const registerDealOrderAndExempt = async () => {
        // register deal order requires ask and bid guids
        const askGuid = Guid.newGuid();
        const bidGuid2 = Guid.newGuid();

        // in order to verify a borrower agrees to the terms their signature is required on the loan parameters
        const signedParams = signLoanParams(api, borrower, expBlock, askGuid, bidGuid2, loanTerms);

        // register a deal order
        const { dealOrder } = await registerDealOrder(
            lenderAddress.addressId,
            borrowerAddress.addressId,
            loanTerms,
            expBlock,
            askGuid,
            bidGuid2,
            borrower.publicKey,
            signedParams,
            lender,
        );
        console.log(dealOrder);
        const { dealOrderId } = dealOrder;

        // connect to ethereum to lend and repay
        const { lend, waitUntilTip } = await ethConnection();

        // Lender lends to borrower on ethereum
        const [tokenAddress, lendTxHash, lendBlockNumber] = await lend(
            lenderWallet,
            borrowerWallet.address,
            dealOrderId[1],
            loanTerms.amount,
        );
        console.log('token address ', tokenAddress, 'tx hash ', lendTxHash);

        // Creditcoin coin requires that at least 12 blocks have been mined before it can verify
        // ethereum transaction
        console.log('waiting for confirmations');
        await waitUntilTip(lendBlockNumber + 12);

        // Register the ethereum transaction as a funding transfer
        const transferKind: TransferKind = { kind: 'Ethless', contractAddress: tokenAddress };
        const { waitForVerification, transfer, transferId } = await registerFundingTransfer(
            transferKind,
            dealOrderId,
            lendTxHash,
            lender,
        );
        console.log(transfer);

        // Wait for the registered transfer to be verified by an off chain worker
        const verifiedTransfer = await waitForVerification().catch();
        console.log(verifiedTransfer);

        // once the transfer is verified, the lender can mark the deal order as funded
        const [dealOrderFunded, transferProcessed] = await fundDealOrder(dealOrderId, transferId, lender);
        console.log(dealOrderFunded);
        console.log(transferProcessed);

        // exempt the loan if borrower is unable to repay full amount
        const exempted = await exemptLoan(dealOrderId, lender);
        console.log(exempted);
    };

    await fullLoanCycle();
    await registerDealOrderAndExempt();
    await api.disconnect().catch(console.error);
};

main().catch(console.error);
