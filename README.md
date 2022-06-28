# X2Y2 SDK

This SDK is a JavaScript library for selling and buying on X2Y2, so you don't need to interact with the X2Y2 API and smart contracts directly.

## Getting Started

The SDK requires an X2Y2 API Key. You can request one from the [Developer Hub](https://discord.gg/YhXfARtEmA).

### Install

Install with

```bash
yarn add @x2y2-io/sdk
```

or

```bash
npm install @x2y2-io/sdk --save
```

### Initiating SDK

Call `init` with your API Key and then initiate an `ethers.Signer` instance to interact with user's wallet:

```JavaScript
import { Signer } from 'ethers'
import { ethersWallet, init } from '@x2y2-io/sdk'
import { Network } from '@x2y2-io/sdk/network'

init(YOUR_API_KEY)

const network: Network = 'mainnet'
const signer: Signer = ethersWallet(WALLET_PRIVATE_KEY, network)
```

### Making Offers / Collection Offers

To make an buy offer, call the `offer` method. Set the `isCollection` to `true` and `tokenId` to a empty string to make an collection offer.

```JavaScript
await offer({
  network,
  signer: buyer, // Signer of the buyer
  isCollection: false, // bool, set true for collection offer
  tokenAddress, // string, contract address of NFT collection
  tokenId, // string, token ID of the NFT, use empty string for collection offer
  currency: weth, // string, contract address of WETH, '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
  price, // string, eg. '1000000000000000000' for 1 WETH
  expirationTime, // number, the duration of offer, in seconds.
})
```

### Creating Listings

To creat a fixed-price listing for a single item, call the `list` method.

```JavaScript
// Token ID and smart contract address for a non-fungible token:
const tokenAddress: string = CONTRACT_ADDRESS
const tokenId: string = TOKEN_ID

const price: string = '1000000000000000000' // 1 WETH
const expirationTime: number = Math.round(Date.now() / 1000) + 30 * 86400 // 30 days

await list({
  network,
  signer: seller, // Signer of the seller
  tokenAddress, // string, contract address of NFT collection
  tokenId, // string, token ID of the NFT
  price, // string, eg. '1000000000000000000' for 1 WETH
  expirationTime, // number, the duration for listing, in seconds.
})
```

### Cancel listing

To cancel a listing , call the `cancelList` method.

```JavaScript
await cancelList({
  network,
  signer: seller, // Signer of the seller
  tokenAddress, // string, contract address of NFT collection
  tokenId, // string, token ID of the NFT
})
```

### Buying

To purchase a fixed-price listing, call the `buy` method.

```JavaScript
await buy({
  network,
  signer: buyer, // Signer of the buyer
  tokenAddress, // string, contract address of NFT collection
  tokenId, // string, token ID of the NFT
  price, // string, the price of an existing listing order, eg. '1000000000000000000' for 1 WETH
})
```

## Contributing

X2Y2 welcomes contributions in the form of GitHub issues and pull-requests.
