import { BigNumber, ethers } from 'ethers'
import { CancelInput, Pair721, RunInput, X2Y2Order } from './types'

const orderItemParamType = `tuple(uint256 price, bytes data)`
const orderParamType = `tuple(uint256 salt, address user, uint256 network, uint256 intent, uint256 delegateType, uint256 deadline, address currency, bytes dataMask, ${orderItemParamType}[] items, bytes32 r, bytes32 s, uint8 v, uint8 signVersion)`
const orderParamTypes = [
  `uint256`,
  `address`,
  `uint256`,
  `uint256`,
  `uint256`,
  `uint256`,
  `address`,
  `bytes`,
  `uint256`,
  `${orderItemParamType}[]`,
]
const cancelInputParamType = `tuple(bytes32[] itemHashes, uint256 deadline, uint8 v, bytes32 r, bytes32 s)`
const feeParamType = `tuple(uint256 percentage, address to)`
const settleDetailParamType = `tuple(uint8 op, uint256 orderIdx, uint256 itemIdx, uint256 price, bytes32 itemHash, address executionDelegate, bytes dataReplacement, uint256 bidIncentivePct, uint256 aucMinIncrementPct, uint256 aucIncDurationSecs, ${feeParamType}[] fees)`
const settleSharedParamType = `tuple(uint256 salt, uint256 deadline, uint256 amountToEth, uint256 amountToWeth, address user, bool canFail)`
const runInputParamType = `tuple(${orderParamType}[] orders, ${settleDetailParamType}[] details, ${settleSharedParamType} shared, bytes32 r, bytes32 s, uint8 v)`

export function encodeItemData(data: Pair721[]): string {
  return ethers.utils.defaultAbiCoder.encode(
    ['tuple(address token, uint256 tokenId)[]'],
    [data]
  )
}

export function encodeOrder(order: X2Y2Order): string {
  return ethers.utils.defaultAbiCoder.encode([orderParamType], [order])
}

export function decodeCancelInput(input: string): CancelInput {
  return ethers.utils.defaultAbiCoder.decode(
    [cancelInputParamType],
    input
  )[0] as CancelInput
}

export function decodeRunInput(data: string): RunInput {
  return ethers.utils.defaultAbiCoder.decode(
    [runInputParamType],
    data
  )[0] as RunInput
}

export function randomSalt(): string {
  const randomHex = BigNumber.from(ethers.utils.randomBytes(16)).toHexString()
  return ethers.utils.hexZeroPad(randomHex, 64)
}

function fixSignature<T extends { v: number }>(data: T) {
  // in geth its always 27/28, in ganache its 0/1. Change to 27/28 to prevent
  // signature malleability if version is 0/1
  // see https://github.com/ethereum/go-ethereum/blob/v1.8.23/internal/ethapi/api.go#L465
  if (data.v < 27) {
    data.v = data.v + 27
  }
}

async function signOrder(
  signer: ethers.Signer,
  order: X2Y2Order
): Promise<void> {
  const orderData: string = ethers.utils.defaultAbiCoder.encode(
    orderParamTypes,
    [
      order.salt,
      order.user,
      order.network,
      order.intent,
      order.delegateType,
      order.deadline,
      order.currency,
      order.dataMask,
      order.items.length,
      order.items,
    ]
  )
  const orderHash = ethers.utils.keccak256(orderData)
  // signMessage
  const orderSig = await signer.signMessage(ethers.utils.arrayify(orderHash))
  order.r = `0x${orderSig.slice(2, 66)}`
  order.s = `0x${orderSig.slice(66, 130)}`
  order.v = parseInt(orderSig.slice(130, 132), 16)
  fixSignature(order)
}

export async function signSellOrder(
  signer: ethers.Signer,
  order: X2Y2Order
): Promise<void> {
  await signOrder(signer, order)
}

export async function signBuyOffer(
  signer: ethers.Signer,
  order: X2Y2Order
): Promise<void> {
  await signOrder(signer, order)
}
