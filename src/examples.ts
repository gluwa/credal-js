import { Keyring } from '@polkadot/api';
import { creditcoinApi } from './connection';
import { registerAddressAsync } from './extrinsics/register-address';
import { Wallet } from 'ethers';

const main = async () => {
    const api = await creditcoinApi('wss://testnet.creditcoin.network');
    const keyring = new Keyring({ type: 'sr25519' });
    const signer = keyring.addFromUri('//Alice');

    const ethAddress = Wallet.createRandom().address;
    const address = await registerAddressAsync(api, ethAddress, 'Ethereum', signer);
    console.log(address);

    await api.disconnect();
};

main().catch(console.error);
