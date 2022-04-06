import { Keyring } from '@polkadot/api';
import { creditcoinApi } from './connection';
import { registerAddressAsync } from './extrinsics/register-address';
import { Wallet } from 'ethers';
import { addAskOrder, addAskOrderAsync } from './extrinsics/add-ask-order';
import { Guid } from 'js-guid';

const main = async () => {
    const api = await creditcoinApi('ws://localhost:9944');
    const keyring = new Keyring({ type: 'sr25519' });
    const signer = keyring.addFromUri('//Alice');

    const ethAddress = Wallet.createRandom().address;
    const expBlock = 10000;
    const lenderAddress = await registerAddressAsync(api, Wallet.createRandom().address, 'Ethereum', signer);
    console.log(lenderAddress);

    const askGuid = Guid.newGuid();
    const askOrder = await addAskOrderAsync(
        api,
        lenderAddress.addressId,
        { amount: BigInt(100), interestRate: 10, maturity: new Date(100) },
        expBlock,
        askGuid,
        signer,
    );
    console.log(askOrder);

    const borrowerAddress = await registerAddressAsync(api, Wallet.createRandom().address, 'Ethereum', signer);
    console.log(borrowerAddress);
    const bidGuid = Guid.newGuid();
    const bidOrder = await addAskOrderAsync(
        api,
        borrowerAddress.addressId,
        { amount: BigInt(100), interestRate: 10, maturity: new Date(100) },
        expBlock,
        bidGuid,
        signer,
    );
    console.log(bidOrder);

    await api.disconnect();
};

main().catch(console.error);
