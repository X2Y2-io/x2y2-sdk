import { ethers, Signer } from 'ethers'
import {
  acceptOffer,
  buy,
  cancelList,
  cancelOffer,
  ethersWallet,
  init,
  list,
  offer,
} from '../src/index'
import { Network } from '../src/network'

jest.setTimeout(120_000)

describe('x2y2', () => {
  let network: Network
  let seller: Signer
  let buyer: Signer
  // api key
  const apiKey = 'xxx-xxx-xxx-xxx'
  // seller private key
  const sellerPrivateKey = 'xxxxxx'
  // buyer private key
  const buyerPrivateKey = 'xxxxxx'
  const weth: string = '0xc778417e063141139fce010982780140aa0cd5ab'
  const tokenAddress: string = '0x4490aE41c1814f4f810a0Dd3022306eF6465F842'
  const tokenId: string = '14'
  const price: string = '20000000000000000'
  const expirationTime: number =
    Math.round(Date.now() / 1000) + 30 * 24 * 60 * 60

  const sleep = (msec: number) =>
    new Promise(resolve => setTimeout(resolve, msec))

  it('init', async () => {
    init(apiKey)
    network = 'mainnet'
    // Signer for seller
    seller = ethersWallet(sellerPrivateKey, network)
    // Signer for buyer
    buyer = ethersWallet(buyerPrivateKey, network)
  })

  it('list', async () => {
    await list({
      network,
      signer: seller,
      tokenAddress,
      tokenId,
      price,
      expirationTime,
    })
    await sleep(5000)
  })

  it('cancelList', async () => {
    await cancelList(
      {
        network,
        signer: seller,
        tokenAddress,
        tokenId,
      },
      {
        maxFeePerGas: ethers.utils.parseUnits('10', 'gwei'),
      }
    )
    await sleep(60000)
  })

  it('buy', async () => {
    try {
      await list({
        network,
        signer: seller,
        tokenAddress,
        tokenId,
        price,
        expirationTime,
      })
      await sleep(5000)
    } catch (ignored) {}
    await buy({
      network,
      signer: buyer,
      tokenAddress,
      tokenId,
      price,
    })
    await sleep(60000)
  })

  it('offer', async () => {
    await offer({
      network,
      signer: seller,
      isCollection: false,
      tokenAddress,
      tokenId,
      currency: weth,
      price,
      expirationTime,
    })
    await sleep(1000)
  })

  it('collection offer', async () => {
    await offer({
      network,
      signer: seller,
      isCollection: true,
      tokenAddress,
      tokenId: '0',
      currency: weth,
      price,
      expirationTime,
    })
    await sleep(1000)
  })

  it('cancelOffer', async () => {
    await cancelOffer(
      {
        network,
        signer: seller,
        orderId: 1,
      },
      {
        maxFeePerGas: ethers.utils.parseUnits('10', 'gwei'),
      }
    )
    await sleep(60000)
  })

  it('acceptOffer', async () => {
    await acceptOffer({
      network,
      signer: buyer,
      orderId: 2,
      tokenId,
    })
    await sleep(1000)
  })
})
