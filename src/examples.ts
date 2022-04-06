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

    const address = await registerAddressAsync(api, ethAddress, 'Ethereum', signer);
    console.log(address);

    const askGuid = new Guid();
    const askOrder = await addAskOrderAsync(
        api,
        address.addressId,
        { amount: BigInt(100), interestRate: 10, maturity: new Date(100) },
        100,
        askGuid,
        signer,
    );
    console.log(askOrder);

    await api.disconnect();
};

main().catch(console.error);
