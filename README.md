# X2Y2 SDK

This SDK is a JavaScript library for buying and selling on X2Y2, so you don't need to interact with the X2Y2 API and smart contracts directly.

If you just want to get information about open offers and orders on X2Y2, or see sales and other events that have taken place, [call the API directly](https://docs.x2y2.io/developers/api).

## Getting Started

The SDK requires an X2Y2 API key. You can request one from the [Developer Hub](https://discord.gg/YhXfARtEmA).

### Install

Install with

```bash
yarn add @x2y2-io/sdk
```

or

```bash
npm install @x2y2-io/sdk --save
```

### Initiate SDK

Call `init` with your API Key and then initiate an `ethers.Signer` instance to interact with the user's wallet:

```JavaScript
import { Signer } from 'ethers'
import { ethersWallet, init } from '@x2y2-io/sdk'
import { Network } from '@x2y2-io/sdk/dist/network'

init(YOUR_API_KEY)

const network: Network = Network.Mainnet
const signer: Signer = ethersWallet(WALLET_PRIVATE_KEY, network)
```

To use the SDK on the Goerli testnet, use `Network.Goerli` instead of `Network.Mainnet` when initializing a `Signer`.

## Gasless Methods

X2Y2 allows you to list items for sale and make WETH offers on others' items without having to send separate transactions each time. This is achieved by first sending one-off approval transactions that enable X2Y2 to:

1. Transfer your items from a specific collection (if you are listing them for sale)
2. Spend your WETH (if you are making offers)

Once X2Y2 has the necessary approvals, you can list items for sale and make WETH offers by signing messages with your wallet. The SDK supports both of these functionalities and abstracts away the creation of signatures:

### Make Offers / Collection Offers

Before making offers, the signer must `approve` WETH spending by the [X2Y2: Exchange contract](https://etherscan.io/address/0x74312363e45dcaba76c59ec49a7aa8a65a67eed3).

To make an offer on an item, call the `offer` method:

```JavaScript
await offer({
  network,
  signer: buyer, // Signer of the buyer
  isCollection: false, // bool, set true for collection offer
  tokenAddress, // string, contract address of NFT collection
  tokenId, // string, token ID of the NFT, use empty string for collection offer
  tokenStandard, // 'erc721' | 'erc1155'
  currency: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // string, contract address of WETH
  price, // string, eg. '1000000000000000000' for 1 WETH
  expirationTime, // number, the unix timestamp when the listing will expire, in seconds
})
```

At present X2Y2 only supports making offers in WETH.

To make a collection offer, set `isCollection` to `true` and `tokenId` to an empty string.

### Create Listings (Orders)

Before creating listings, the signer must approve the item's transfer by the [X2Y2: ERC 721 Delegate contract](https://etherscan.io/address/0xF849de01B080aDC3A814FaBE1E2087475cF2E354) with the `setApprovalForAll` function on the item's contract.

To create a fixed-price listing, also referred to as an order, call the `list` method:

```JavaScript
await list({
  network,
  signer: seller, // Signer of the seller
  tokenAddress, // string, contract address of NFT collection
  tokenId, // string, token ID of the NFT
  tokenStandard, // 'erc721' | 'erc1155'
  price, // string, sale price in wei eg. '1000000000000000000' for 1 ETH
  royalty, // number, percentage with a base of 10^6, optional, eg. 50000 = 5%,
           // The number can’t be larger than the royalty fee rate set by the collection owner.
           // A collection's royalty rate can be obtained via the Public API /v1/contracts/{contract}
  expirationTime, // number, the unix timestamp when the listing will expire, in seconds. Must be at least 15 minutes later in the future.
})
```

### Bulk Listings (Orders)

You can create no more than 20 listings at once using the SDK.

Before creating listings, the signer must approve all items' transfer by the [X2Y2: ERC 721 Delegate contract](https://etherscan.io/address/0xF849de01B080aDC3A814FaBE1E2087475cF2E354) with the `setApprovalForAll` function on each item's contract.

To submit multiple fixed-price listings(orders), call the `bulkList` method:

```JavaScript
await bulkList({
  network,
  signer: seller, // Signer of the seller
  items: [  // Arrays of each token and price
    {
      tokenAddress: tokens.erc1155.token, // string, contract address of NFT collection
      tokenId: tokens.erc1155.tokenId, // string, token ID of the NFT
      price, // string, sale price in wei eg. '1000000000000000000' for 1 ETH
    },
    ... // other items
  ],
  tokenStandard, // 'erc721' | 'erc1155', all tokens in one request have to be the same type
  sellerRoyalty, // 'flex': Let buyer decide, 'zero': Zero royalty
  expirationTime, // number, the unix timestamp when the listing will expire, in seconds. Must be at least 15 minutes later in the future.
})
```

## Gas-cost Methods

You can think of the gasless methods previously described as "making" new offers or listings. This SDK also supports "taking" existings offers and listings: in other words, buying items that are already listed or accepting offers you have received. It also supports cancelling or modifying previous offers/listings.

For each of these interactions, the signer must commit a transaction. The following methods all return the sent transaction as an ethers [TransactionResponse](https://docs.ethers.io/v5/api/providers/types/#providers-TransactionResponse)).

### Buy

To purchase a listed item, call the `buyOrder` method:

```JavaScript
// Get valid orders for an NFT id (Multiple orders may exist for an ERC-1155 NFT)
const orders = await getSellOrders(
  network,
  '', // maker
  tokenAddress,
  tokenId
)
await buyOrder({
  network,
  signer: buyer, // Signer of the buyer
  order: orders[0], // Pass in the order you choose to buy from above.
  payback, // number, percentage of royalty that route back to the buyer
           // the base of `payback` is 10^6, optional, eg. 50000 = 5%, 0 = pay 100% royalty
           // The number can’t be larger than the royalty fee rate set by the collection owner.
           // A collection's royalty rate can be obtained via the Public API /v1/contracts/{contract}
})
```

### Accept Offer

To accept a buy offer or a collection offer, call the `acceptOffer` method:

```JavaScript
await acceptOffer({
  network,
  signer: seller, // Signer of the seller
  orderId, // number, id of the offer
  tokenId, // string | undefined, token ID of your NFT, only necessary when accepting a collection offer
})
```

If you don't know the `orderId` of the offer you want to accept, find it by calling the `/v1/offers` [endpoint](https://x2y2-io.github.io/api-reference/#/Offers/get_v1_offers). To find the highest offer on an item, specify the `contract` and `token_id` in the API call, as well as `sort=price` and `direction=desc`, before pulling `data[0].id` from the response body.

### Cancel Offer

To cancel a buy offer or a collection offer, call the `cancelOffer` method:

```JavaScript
await cancelOffer({
  network,
  signer: buyer, // Signer of the buyer
  orderId, // number, id of the offer
})
```

As above, you can find the know the `orderId` of an offer by calling the `/v1/offers` [endpoint](https://x2y2-io.github.io/api-reference/#/Offers/get_v1_offers).

### Cancel Listing

To cancel a listing, call the `cancel` method:

```JavaScript
// Get valid orders for an NFT id (Multiple orders may exist for an ERC-1155 NFT)
const orders = await getSellOrders(
  network,
  maker, // Maker of the listing
  tokenAddress, // string, contract address of NFT collection
  tokenId, // string, token ID of the NFT
)
await cancel({
  network,
  signer: seller, // Signer of the seller
  order: orders[0], // Pass in the order you choose to cancel from above.
})
```

### Lower Price

To lower the price for a certain listing, call the `lowerOrderPrice` method:

```JavaScript
// Get valid orders for an NFT id (Multiple orders may exist for an ERC-1155 NFT)
const orders = await getSellOrders(
  network,
  maker, // Maker of the listing
  tokenAddress, // string, contract address of NFT collection
  tokenId, // string, token ID of the NFT
)
await lowerOrderPrice({
  network,
  signer: seller, // Signer of the seller
  order: orders[0], // Pass in the order you choose to lower price from above.
  price, // string, sale price in wei eg. '1000000000000000000' for 1 ETH. Must be lower than the current price.
  expirationTime, // number, the unix timestamp when the listing will expire, in seconds. Optional. Must be at least 15 minutes later in the future. If the current order is going to expire within 15 minutes, then a new expirationTime must be provided.
})
```

By using this method, the current order will be cancelled off-chain and a new order with a distinct 'orderId' will be created. To get the new 'orderId', call the `/v1/orders?token_id=&contract=` [endpoint](https://x2y2-io.github.io/api-reference/#/Orders/get_v1_orders).

## Overriding Gas

For methods that submit transactions, it's possible to override default transaction variables by passing an ethers [overrides object](https://docs.ethers.io/v5/api/contract/contract/#Contract--write):

> The overrides object for write methods may include any of:
>
> - overrides.gasPrice - the price to pay per gas
> - overrides.gasLimit - the limit on the amount of gas to allow the transaction to consume; any unused gas is returned at the gasPrice
> - overrides.value - the amount of ether (in wei) to forward with the call
> - overrides.nonce - the nonce to use for the Signer

To send an EIP-1559 transaction, specify `maxPriorityFeePerGas` and `maxFeePerGas` instead of `gasPrice`.

For example, to accept an offer with 150 gwei priority fee and 500 gwei max fee, call the `acceptOffer` method as follows:

```JavaScript
await acceptOffer({
},
{
  maxPriorityFeePerGas: ethers.utils.parseUnits('150', 'gwei'), // 150 gwei
  maxFeePerGas: ethers.utils.parseUnits('500', 'gwei') // 500 gwei
})
```

## Error Codes of API Response

| Error Code | Reason                                                       |
| :--------- | :----------------------------------------------------------- |
| 1002       | Rate Limit                                                   |
| 1006       | User banned from listing(rug/hacker address)                 |
| 2012       | A listing order for the NFT already exists                   |
| 2014       | WETH balance not enough                                      |
| 2015       | Seller no longer owns the NFT                                |
| 2016       | Seller revoked the approval of the NFT                       |
| 2017       | The collection has disabled optional royalty                 |
| 2020       | Order already cancelled                                      |
| 2021       | Order already purchased                                      |
| 2028       | Contract/NFT is not allowed to trade(rug or hacked NFT)      |
| 2030       | Order already expired                                        |
| 3002       | Signature error                                              |
| 3004       | Wrong currency(currently only ETH supported for sell orders) |
| 3007       | Invalid API key                                              |

## Diagnosing Common Problems

- If you are unable to make offers, make sure the signing wallet has approved WETH spending by the [X2Y2: Exchange contract](https://etherscan.io/address/0x74312363e45dcaba76c59ec49a7aa8a65a67eed3). You can check ERC20 approvals on [Etherscan](https://etherscan.io/tokenapprovalchecker).
- If you are unable to list items, make sure the signing wallet has approved the collection's transfer by the [X2Y2: ERC 721 Delegate contract](https://etherscan.io/address/0xF849de01B080aDC3A814FaBE1E2087475cF2E354). You can also check this on [Etherscan](https://etherscan.io/tokenapprovalchecker) by selecting the ERC721 tab.
- To troubleshoot other methods, store the `TransactionResponse` that is returned. Then use `TransactionResponse.wait` to get a [TransactionReceipt](https://docs.ethers.io/v5/api/providers/types/#providers-TransactionReceipt) which contains the transaction hash. You can then manually find this transaction and see what went wrong.
- For all other issues not covered here or in the error codes above, get help or submit a bug report at our [Developer Hub](https://discord.gg/YhXfARtEmA).

## Example: Collection Offer on BAYC

```JavaScript
import { Signer } from 'ethers'
import { ethersWallet, init } from '@x2y2-io/sdk'
import { Network } from '@x2y2-io/sdk/dist/network'

init(YOUR_API_KEY)

const network: Network = 'mainnet'
const signer: Signer = ethersWallet(WALLET_PRIVATE_KEY, network)

await offer({
  network,
  signer,
  isCollection: true, // True for collection offer
  tokenAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', // BAYC contract address
  tokenId: '', // Blank collection offer
  currency: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH contract address
  price: '80000000000000000000', // 80 WETH
  expirationTime: 1800 + Date.now() / 1000, // 30 minutes
})
```

## Contributing

X2Y2 welcomes contributions in the form of GitHub issues and pull-requests.
