# X2Y2 SDK

This SDK is a JavaScript library for buying and selling on X2Y2, so you don't need to interact with the X2Y2 API and smart contracts directly.

If you want to get information about existings orders, offers, events, and contracts on X2Y2, [call the API directly](https://docs.x2y2.io/developers/api).

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
import { Network } from '@x2y2-io/sdk/dist/network'

init(YOUR_API_KEY)

const network: Network = 'mainnet'
const signer: Signer = ethersWallet(WALLET_PRIVATE_KEY, network)
```

### Making Offers / Collection Offers

To make a buy offer on an NFT, call the `offer` method. Set `isCollection` to `true` and `tokenId` to a empty string to make a collection offer.

```JavaScript
await offer({
  network,
  signer: buyer, // Signer of the buyer
  isCollection: false, // bool, set true for collection offer
  tokenAddress, // string, contract address of NFT collection
  tokenId, // string, token ID of the NFT, use empty string for collection offer
  currency: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // string, contract address of WETH
  price, // string, eg. '1000000000000000000' for 1 WETH
  expirationTime, // number, the unix timestamp when the listing will expire, in seconds
})
```

At present X2Y2 only supports making offers in WETH (`0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2`).

### Creating Listings (Orders)

To create a fixed-price listing to sell an item, also known as an order, call the `list` method.

```JavaScript
await list({
  network,
  signer: seller, // Signer of the seller
  tokenAddress, // string, contract address of NFT collection
  tokenId, // string, token ID of the NFT
  price, // string, sale price in wei eg. '1000000000000000000' for 1 ETH
  expirationTime, // number, the unix timestamp when the listing will expire, in seconds. Must be at least 15 minutes later in the future.
})
```

### Cancel listing

To cancel a listing, call the `cancelList` method.

```JavaScript
await cancelList({
  network,
  signer: seller, // Signer of the seller
  tokenAddress, // string, contract address of NFT collection
  tokenId, // string, token ID of the NFT
})
```

### Lower price

To lower the price for a certain listing, call the `lowerPrice` method. The current order will be cancelled off-chain and a new order will be created. However, you still need to call the `/v1/orders?token_id=&contract=` [endpoint](https://x2y2-io.github.io/api-reference/#/Orders/get_v1_orders) to obtain the new order's ID.

```JavaScript
await lowerPrice({
  network,
  signer: seller, // Signer of the seller
  tokenAddress, // string, contract address of NFT collection
  tokenId, // string, token ID of the NFT
  price, // string, sale price in wei eg. '1000000000000000000' for 1 ETH. Must be lower than the current price.
  expirationTime, // number, the unix timestamp when the listing will expire, in seconds. Optional. Must be at least 15 minutes later in the future. If the current order is going to expire within 15 minutes, then a new expirationTime must be provided.
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
  price, // string, sale price in wei eg. '1000000000000000000' for 1 ETH
})
```

### Cancel offer

To cancel a buy offer or a collection offer, call the `cancelOffer` method.

```JavaScript
await cancelOffer({
  network,
  signer: buyer, // Signer of the buyer
  orderId, // number, id of the offer
})
```

### Accept offer

To accept a buy offer or a collection offer, call the `acceptOffer` method.

```JavaScript
await acceptOffer({
  network,
  signer: buyer, // Signer of the buyer
  orderId, // number, id of the offer
  tokenId, // string | undefined, token ID of your NFT, only necessary when accepting a collection offer
})
```

## Overriding Gas

For methods that submit transactions like `cancelList`, `buy`, `cancelOffer` and `acceptOffer`, it's possible to overrides ethers variables like `gasLimit`, `gasPrice`, `maxFeePerGas`, `maxPriorityFeePerGas`, etc.

```JavaScript
await acceptOffer({
},
{
  maxFeePerGas: ethers.utils.parseUnits('10', 'gwei'), // 10 gwei
})
```

## Error Codes of API Response

| Error Code | Reason                                                       |
| :--------- | :----------------------------------------------------------- |
| 1006       | User banned from listing(rug/hacker address)                 |
| 2012       | A listing order for the NFT already exists                   |
| 2020       | Order already cancelled                                      |
| 2021       | Order already purchased                                      |
| 2028       | Contract/NFT is not allowed to trade(rug or hacked NFT)      |
| 2030       | Order already expired                                        |
| 3002       | Signature error                                              |
| 3004       | Wrong currency(currently only ETH supported for sell orders) |
| 3007       | Invalid API key                                              |

## Contributing

X2Y2 welcomes contributions in the form of GitHub issues and pull-requests.
