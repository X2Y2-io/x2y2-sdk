import { BigNumberish } from 'ethers'

export type Pair721 = {
  token: string
  tokenId: BigNumberish
}

export type Order = {
  item_hash: string
  maker: string
  type: string
  side: number
  status: string
  currency: string
  end_at: string
  created_at: string
  token: {
    contract: string
    token_id: number
  }
  id: number
  price: string
  taker: string | null
}

export type X2Y2OrderItem = {
  price: BigNumberish
  data: string
}

export type X2Y2Order = {
  salt: BigNumberish
  user: string
  network: BigNumberish
  intent: BigNumberish
  delegateType: BigNumberish
  deadline: BigNumberish
  currency: string
  dataMask: string
  items: X2Y2OrderItem[]
  // signature
  r: string
  s: string
  v: number
  signVersion: number
}

export type Fee = {
  percentage: BigNumberish
  to: string
}

export type SettleDetail = {
  op: number
  orderIdx: BigNumberish
  itemIdx: BigNumberish
  price: BigNumberish
  itemHash: string
  executionDelegate: string
  dataReplacement: string
  bidIncentivePct: BigNumberish
  aucMinIncrementPct: BigNumberish
  aucIncDurationSecs: BigNumberish
  fees: Fee[]
}

export type SettleShared = {
  salt: BigNumberish
  deadline: BigNumberish
  amountToEth: BigNumberish
  amountToWeth: BigNumberish
  user: string
  canFail: boolean
}

export type RunInput = {
  orders: X2Y2Order[]
  details: SettleDetail[]
  shared: SettleShared
  // signature
  r: string
  s: string
  v: number
}

export type CancelInput = {
  itemHashes: string[]
  deadline: BigNumberish
  // signature
  r: string
  s: string
  v: number
}
