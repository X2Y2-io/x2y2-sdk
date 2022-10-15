import { constants, ethers, Signer } from 'ethers'
import {
  acceptOffer,
  buyOrder,
  cancel,
  cancelList,
  cancelOffer,
  ethersWallet,
  getNftOffers,
  getSellOrders,
  init,
  list,
  lowerOrderPrice,
  offer,
} from '../src/index'
import { getNetworkMeta, Network } from '../src/network'
import { TokenStandard } from '../src/types'

jest.setTimeout(600_000)

describe('x2y2', () => {
  let seller: Signer
  let buyer: Signer
  // api key
  const apiKey = 'xxx-xxx-xxx-xxx'
  // seller private key
  const sellerPrivateKey = 'xxxxxx'
  // buyer private key
  const buyerPrivateKey = 'xxxxxx'
  const tokens: Record<
    string,
    {
      token: string
      tokenId: string
      tokenStandard: TokenStandard
    }
  > = {
    erc721: {
      token: constants.AddressZero,
      tokenId: '1',
      tokenStandard: 'erc721',
    },
    erc1155: {
      token: constants.AddressZero,
      tokenId: '1',
      tokenStandard: 'erc1155',
    },
  }
  const network: Network = Network.Goerli
  const weth = getNetworkMeta(network).wethContract
  const price: string = '2000000000000000'
  const newPrice: string = '1800000000000000'
  const expirationTime: number =
    Math.round(Date.now() / 1000) + 30 * 24 * 60 * 60
  const delayApiTime = 6000
  const delayTxTime = 60000
  const maxFeePerGas = ethers.utils.parseUnits('100', 'gwei')

  const sleep = (msec: number) =>
    new Promise(resolve => setTimeout(resolve, msec))

  it('init', async () => {
    init(apiKey, network)
    // Signer for seller
    seller = ethersWallet(sellerPrivateKey, network)
    // Signer for buyer
    buyer = ethersWallet(buyerPrivateKey, network)
  })

  it('list erc721', async () => {
    await list({
      network,
      signer: seller,
      tokenAddress: tokens.erc721.token,
      tokenId: tokens.erc721.tokenId,
      tokenStandard: tokens.erc721.tokenStandard,
      price,
      royalty: 0,
      expirationTime,
    })
    await sleep(delayApiTime)
  })

  it('lowerPrice erc721', async () => {
    const maker = await seller.getAddress()
    const orders = await getSellOrders(
      network,
      maker,
      tokens.erc721.token,
      tokens.erc721.tokenId
    )
    const order = orders[0]
    await lowerOrderPrice({
      network,
      signer: seller,
      order: order,
      price: newPrice,
      expirationTime,
    })
    await sleep(delayApiTime)
  })

  it('list erc1155', async () => {
    await list({
      network,
      signer: seller,
      tokenAddress: tokens.erc1155.token,
      tokenId: tokens.erc1155.tokenId,
      tokenStandard: tokens.erc1155.tokenStandard,
      price,
      royalty: 0,
      expirationTime,
    })
    await sleep(delayApiTime)
  })

  it('lowerPrice erc1155', async () => {
    const maker = await seller.getAddress()
    const orders = await getSellOrders(
      network,
      maker,
      tokens.erc1155.token,
      tokens.erc1155.tokenId
    )
    const order = orders[0]
    await lowerOrderPrice({
      network,
      signer: seller,
      order: order,
      price: newPrice,
      expirationTime,
    })
    await sleep(delayApiTime)
  })

  it('cancelList erc721', async () => {
    await cancelList(
      {
        network,
        signer: seller,
        tokenAddress: tokens.erc721.token,
        tokenId: tokens.erc721.tokenId,
      },
      { maxFeePerGas }
    )
    await sleep(delayTxTime)
  })

  it('buy erc721', async () => {
    await list({
      network,
      signer: seller,
      tokenAddress: tokens.erc721.token,
      tokenId: tokens.erc721.tokenId,
      price,
      royalty: 7500,
      expirationTime,
    })
    await sleep(delayApiTime)
    const maker = await seller.getAddress()
    const orders = await getSellOrders(
      network,
      maker,
      tokens.erc721.token,
      tokens.erc721.tokenId
    )
    const order = orders[0]
    await buyOrder({
      network,
      signer: buyer,
      order: order,
      payback: order.royalty_fee / 2,
    })
    await sleep(delayTxTime)
  })

  it('cancelList erc1155', async () => {
    const maker = await seller.getAddress()
    const orders = await getSellOrders(
      network,
      maker,
      tokens.erc1155.token,
      tokens.erc1155.tokenId
    )
    await cancel(
      {
        network,
        signer: seller,
        order: orders[0],
      },
      { maxFeePerGas }
    )
    await sleep(delayTxTime)
  })

  it('buy erc1155', async () => {
    await list({
      network,
      signer: seller,
      tokenAddress: tokens.erc1155.token,
      tokenId: tokens.erc1155.tokenId,
      tokenStandard: tokens.erc1155.tokenStandard,
      price,
      royalty: 0,
      expirationTime,
    })
    await sleep(delayApiTime)
    const maker = await seller.getAddress()
    const orders = await getSellOrders(
      network,
      maker,
      tokens.erc1155.token,
      tokens.erc1155.tokenId
    )
    const order = orders[0]
    await buyOrder({
      network,
      signer: buyer,
      order: order,
    })
    await sleep(delayTxTime)
  })

  it('offer erc721', async () => {
    await offer({
      network,
      signer: seller,
      isCollection: false,
      tokenAddress: tokens.erc721.token,
      tokenId: tokens.erc721.tokenId,
      tokenStandard: tokens.erc721.tokenStandard,
      currency: weth,
      price,
      expirationTime,
    })
    await sleep(delayApiTime)
  })

  it('collection offer erc721', async () => {
    await offer({
      network,
      signer: seller,
      isCollection: true,
      tokenAddress: tokens.erc721.token,
      tokenId: '0',
      tokenStandard: tokens.erc721.tokenStandard,
      currency: weth,
      price,
      expirationTime,
    })
    await sleep(delayApiTime)
  })

  it('cancelOffer erc721', async () => {
    const offers = await getNftOffers(
      network,
      tokens.erc721.token,
      tokens.erc721.tokenId,
      'price',
      'asc'
    )
    await cancelOffer(
      {
        network,
        signer: seller,
        orderId: offers[0].id,
      },
      { maxFeePerGas }
    )
    await sleep(delayTxTime)
  })

  it('acceptOffer erc721', async () => {
    const offers = await getNftOffers(
      network,
      tokens.erc721.token,
      undefined,
      'price',
      'asc'
    )
    await acceptOffer({
      network,
      signer: buyer,
      offer: offers[0],
      tokenId: tokens.erc721.tokenId,
    })
    await sleep(delayApiTime)
  })

  it('offer erc1155', async () => {
    await offer({
      network,
      signer: seller,
      isCollection: false,
      tokenAddress: tokens.erc1155.token,
      tokenId: tokens.erc1155.tokenId,
      tokenStandard: tokens.erc1155.tokenStandard,
      currency: weth,
      price,
      expirationTime,
    })
    await sleep(delayApiTime)
  })

  it('collection offer erc1155', async () => {
    await offer({
      network,
      signer: seller,
      isCollection: true,
      tokenAddress: tokens.erc1155.token,
      tokenId: '0',
      tokenStandard: tokens.erc1155.tokenStandard,
      currency: weth,
      price,
      expirationTime,
    })
    await sleep(delayApiTime)
  })

  it('cancelOffer erc1155', async () => {
    const offers = await getNftOffers(
      network,
      tokens.erc1155.token,
      tokens.erc1155.tokenId,
      'price',
      'asc'
    )
    await cancelOffer(
      {
        network,
        signer: seller,
        orderId: offers[0].id,
      },
      { maxFeePerGas }
    )
    await sleep(delayTxTime)
  })

  it('acceptOffer erc1155', async () => {
    const offers = await getNftOffers(
      network,
      tokens.erc1155.token,
      undefined,
      'price',
      'asc'
    )
    await acceptOffer({
      network,
      signer: buyer,
      offer: offers[0],
      tokenId: tokens.erc1155.tokenId,
    })
    await sleep(delayApiTime)
  })
})
