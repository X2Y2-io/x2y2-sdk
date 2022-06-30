import { BigNumber, ethers } from 'ethers'
import { APIClient, getSharedAPIClient, initAPIClient } from './api'
import { X2Y2R1__factory } from './contracts'
import { getNetworkMeta, Network } from './network'
import { CancelInput, Order, RunInput, X2Y2Order } from './types'
import {
  encodeItemData,
  randomSalt,
  signBuyOffer,
  signSellOrder,
} from './utils'

export const INTENT_SELL = 1
export const INTENT_AUCTION = 2
export const INTENT_BUY = 3

export const OP_COMPLETE_SELL_OFFER = 1 // COMPLETE_SELL_OFFER
export const OP_COMPLETE_BUY_OFFER = 2 // COMPLETE_BUY_OFFER
export const OP_CANCEL_OFFER = 3 // CANCEL_OFFER
export const OP_BID = 4 // BID
export const OP_COMPLETE_AUCTION = 5 // COMPLETE_AUCTION
export const OP_REFUND_AUCTION = 6 // REFUND_AUCTION
export const OP_REFUND_AUCTION_STUCK_ITEM = 7 // REFUND_AUCTION_STUCK_ITEM

export const DELEGATION_TYPE_INVALID = 0
export const DELEGATION_TYPE_ERC721 = 1
export const DELEGATION_TYPE_ERC1155 = 2

export type ListPayload = {
  network: Network
  signer: ethers.Signer

  tokenAddress: string
  tokenId: string
  price: string
  expirationTime: number
}

export type CancelListPayload = {
  network: Network
  signer: ethers.Signer

  tokenAddress: string
  tokenId: string
}

export type BuyPayload = {
  network: Network
  signer: ethers.Signer

  tokenAddress: string
  tokenId: string
  price: string
}

export type OfferPayload = {
  network: Network
  signer: ethers.Signer

  isCollection: boolean
  tokenAddress: string
  tokenId: string | null
  currency: string
  price: string
  expirationTime: number
}

export type CancelOfferPayload = {
  network: Network
  signer: ethers.Signer

  orderId: number
}

export type AcceptOfferPayload = {
  network: Network
  signer: ethers.Signer

  orderId: number
  tokenId: string | undefined
}

export function ethersWallet(
  privateKey: string,
  network: Network
): ethers.Wallet {
  const networkMeta = getNetworkMeta(network)
  const provider = new ethers.providers.StaticJsonRpcProvider(
    networkMeta.rpcUrl,
    networkMeta.id
  )
  return new ethers.Wallet(privateKey, provider)
}

export function init(apiKey: string) {
  initAPIClient(apiKey)
}

export async function list({
  network,
  signer,

  tokenAddress,
  tokenId,
  price,
  expirationTime,
}: ListPayload): Promise<void> {
  const accountAddress = await signer.getAddress()

  const salt = randomSalt()
  const itemData = encodeItemData([{ token: tokenAddress, tokenId }])
  const order: X2Y2Order = {
    salt,
    user: accountAddress,
    network: getNetworkMeta(network).id,
    intent: INTENT_SELL,
    delegateType: DELEGATION_TYPE_ERC721,
    deadline: expirationTime,
    currency: ethers.constants.AddressZero,
    dataMask: '0x',
    items: [{ price, data: itemData }],
    r: '',
    s: '',
    v: 0,
    signVersion: 1,
  }
  await signSellOrder(signer, order)
  await getSharedAPIClient(network).postSellOrder(order)
}

async function cancelOrder(
  network: Network,
  signer: ethers.Signer,

  orderId: number,
  callOverrides: ethers.Overrides = {}
) {
  const apiClient: APIClient = getSharedAPIClient(network)
  const accountAddress = await signer.getAddress()

  const signMessage = ethers.utils.keccak256('0x')
  const sign = await signer.signMessage(ethers.utils.arrayify(signMessage))
  const input: CancelInput = await apiClient.getCancelInput(
    accountAddress,
    OP_CANCEL_OFFER,
    orderId,
    signMessage,
    sign
  )

  // Invoke smart contract cancel
  const marketContract = getNetworkMeta(network).marketContract
  const market = X2Y2R1__factory.connect(marketContract, signer)
  const tx = await market.cancel(
    input.itemHashes,
    input.deadline,
    input.v,
    input.r,
    input.s,
    callOverrides
  )
  return tx
}

export async function cancelList(
  {
    network,
    signer,

    tokenAddress,
    tokenId,
  }: CancelListPayload,
  callOverrides: ethers.Overrides = {}
) {
  const apiClient: APIClient = getSharedAPIClient(network)
  const accountAddress = await signer.getAddress()

  const order: Order | undefined = await apiClient.getSellOrder(
    accountAddress,
    tokenAddress,
    tokenId
  )

  if (!order) throw new Error('No order found')

  return await cancelOrder(network, signer, order.id, callOverrides)
}

async function acceptOrder(
  network: Network,
  signer: ethers.Signer,

  op: number,
  orderId: number,
  currency: string,
  price: string,
  tokenId: string,
  callOverrides: ethers.Overrides = {}
) {
  const apiClient: APIClient = getSharedAPIClient(network)
  const accountAddress = await signer.getAddress()

  const runInput: RunInput | undefined = await apiClient.fetchOrderSign(
    accountAddress,
    op,
    orderId,
    currency,
    price,
    tokenId
  )
  // check
  let value: BigNumber = ethers.constants.Zero
  let valid = false
  if (runInput && runInput.orders.length && runInput.details.length) {
    valid = true
    runInput.details.forEach(detail => {
      const order = runInput.orders[(detail.orderIdx as BigNumber).toNumber()]
      const orderItem = order?.items[(detail.itemIdx as BigNumber).toNumber()]
      if (detail.op !== op || !orderItem) {
        valid = false
      } else if (
        (!order.currency || order.currency === ethers.constants.AddressZero) &&
        op === OP_COMPLETE_SELL_OFFER
      ) {
        value = value.add(detail.price)
      }
    })
  }

  if (!valid || !runInput) throw new Error('Failed to sign order')

  // Invoke smart contract run
  const marketContract = getNetworkMeta(network).marketContract
  const market = X2Y2R1__factory.connect(marketContract, signer)
  const tx = await market.run(runInput, { ...callOverrides, value })
  return tx
}

export async function buy(
  {
    network,
    signer,

    tokenAddress,
    tokenId,
    price,
  }: BuyPayload,
  callOverrides: ethers.Overrides = {}
) {
  const order: Order | undefined = await getSharedAPIClient(
    network
  ).getSellOrder('', tokenAddress, tokenId)

  if (!order || order.price !== price) throw new Error('No order found')

  return await acceptOrder(
    network,
    signer,
    OP_COMPLETE_SELL_OFFER,
    order.id,
    order.currency,
    order.price,
    '',
    callOverrides
  )
}

export async function offer({
  network,
  signer,

  isCollection,
  tokenAddress,
  tokenId,
  currency,
  price,
  expirationTime,
}: OfferPayload) {
  const accountAddress = await signer.getAddress()

  const salt = randomSalt()
  const dataMask = [
    { token: ethers.constants.AddressZero, tokenId: '0x' + '1'.repeat(64) },
  ]
  const dataTokenId = isCollection ? '0' : tokenId ?? '0'
  const itemData = encodeItemData([
    { token: tokenAddress, tokenId: dataTokenId },
  ])
  const order: X2Y2Order = {
    salt,
    user: accountAddress,
    network: getNetworkMeta(network).id,
    intent: INTENT_BUY,
    delegateType: DELEGATION_TYPE_ERC721,
    deadline: expirationTime,
    currency,
    dataMask: isCollection ? encodeItemData(dataMask) : '0x',
    items: [{ price, data: itemData }],
    r: '',
    s: '',
    v: 0,
    signVersion: 1,
  }
  await signBuyOffer(signer, order)
  await getSharedAPIClient(network).postBuyOffer(order, isCollection)
}

export async function cancelOffer(
  {
    network,
    signer,

    orderId,
  }: CancelOfferPayload,
  callOverrides: ethers.Overrides = {}
) {
  if (!orderId) throw new Error('Invalid orderId')

  return await cancelOrder(network, signer, orderId, callOverrides)
}

export async function acceptOffer(
  {
    network,
    signer,

    orderId,
    tokenId,
  }: AcceptOfferPayload,
  callOverrides: ethers.Overrides = {}
) {
  if (!orderId) throw new Error('Invalid orderId')

  return await acceptOrder(
    network,
    signer,
    OP_COMPLETE_BUY_OFFER,
    orderId,
    '0x',
    '0',
    tokenId ?? '',
    callOverrides
  )
}
