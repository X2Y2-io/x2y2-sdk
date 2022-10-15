import axios, { Axios, AxiosResponse } from 'axios'
import { getNetworkMeta, Network } from './network'
import { CancelInput, Order, RunInput, X2Y2Order } from './types'
import { decodeCancelInput, decodeRunInput, encodeOrder } from './utils'

export class APIClient {
  network: Network
  apiKey?: string
  httpClient: Axios

  constructor(network: Network, apiKey?: string) {
    this.network = network
    this.apiKey = apiKey
    if (typeof process != 'undefined') {
      axios.defaults.adapter = require('axios/lib/adapters/http')
    }
    this.httpClient = new Axios({
      baseURL: getNetworkMeta(network).apiBaseURL,
      timeout: 60_000,
    })
  }

  async _get(path: string, params: Record<string, string>) {
    if (!this.apiKey) throw new Error('apiKey required')
    const resp = await this.httpClient.get(path, {
      params,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-API-KEY': this.apiKey,
      },
    })
    return this._handleResponse(resp)
  }

  async _post<T>(path: string, payload: T) {
    if (!this.apiKey) throw new Error('apiKey required')
    const resp = await this.httpClient.post(path, JSON.stringify(payload), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-API-KEY': this.apiKey,
      },
    })
    return this._handleResponse(resp)
  }

  async _handleResponse(resp: AxiosResponse<any, any>) {
    if (![200, 400, 429].includes(resp.status)) throw new Error('bad response')
    if (resp.status === 429) throw new Error('rate limit')
    const respData = JSON.parse(resp.data)
    if (!respData || !respData.success) {
      const errorCode = respData?.code
      const errors = respData?.errors
      const msg = errorCode
        ? `Err_${errorCode}`
        : errors && errors.length > 0
        ? `Err_${errors[0].code}`
        : 'bad response'
      throw new Error(msg)
    }
    return respData
  }

  async _postX2Y2Order(
    order: X2Y2Order,
    royalty: number | undefined,
    isCollection: boolean
  ) {
    return await this._post('/api/orders/add', {
      order: encodeOrder(order),
      isBundle: false,
      bundleName: '',
      bundleDesc: '',
      orderIds: [],
      royalties: royalty ? [royalty] : [],
      changePrice: false,
      isCollection,
      isPrivate: false,
      taker: null,
    })
  }

  async postSellOrder(order: X2Y2Order, royalty: number | undefined) {
    return await this._postX2Y2Order(order, royalty, false)
  }

  async postBuyOffer(order: X2Y2Order, isCollection: boolean) {
    return await this._postX2Y2Order(order, undefined, isCollection)
  }

  async postLowerPrice(order: X2Y2Order, orderId: number, royalty: number) {
    return await this._post('/api/orders/add', {
      order: encodeOrder(order),
      isBundle: false,
      bundleName: '',
      bundleDesc: '',
      orderIds: [orderId],
      royalties: [royalty],
      changePrice: true,
      isCollection: false,
      isPrivate: false,
      taker: null,
    })
  }

  async getSellOrder(
    maker: string,
    tokenAddress: string,
    tokenId: string
  ): Promise<Order | undefined> {
    const orders: Order[] = await this.getSellOrders(
      maker,
      tokenAddress,
      tokenId
    )
    return orders.length > 0 ? orders[0] : undefined
  }

  async getSellOrders(
    maker: string,
    tokenAddress: string,
    tokenId: string
  ): Promise<Order[]> {
    const params: Record<string, string> = {
      maker,
      contract: tokenAddress,
      token_id: tokenId,
      network_id: getNetworkMeta(this.network).id.toString(),
    }
    const { data } = await this._get('/v1/orders', params)
    return data instanceof Array && data.length > 0 ? (data as Order[]) : []
  }

  async getNftOffer(
    tokenAddress: string,
    tokenId: string | undefined,
    sort: 'created_at' | 'price',
    direction: 'asc' | 'desc'
  ): Promise<Order | undefined> {
    const offers: Order[] = await this.getNftOffers(
      tokenAddress,
      tokenId,
      sort,
      direction
    )
    return offers.length > 0 ? offers[0] : undefined
  }

  async getNftOffers(
    tokenAddress: string,
    tokenId: string | undefined,
    sort: 'created_at' | 'price',
    direction: 'asc' | 'desc'
  ): Promise<Order[]> {
    const params: Record<string, string> = {
      contract: tokenAddress,
      network_id: getNetworkMeta(this.network).id.toString(),
      sort,
      direction,
    }
    if (tokenId) {
      params.token_id = tokenId
    }
    const { data } = await this._get('/v1/offers', params)
    return data instanceof Array && data.length > 0 ? (data as Order[]) : []
  }

  async getCancelInput(
    caller: string,
    op: number,
    orderId: number,
    signMessage: string,
    sign: string
  ): Promise<CancelInput> {
    const { data: cancelData } = await this._post('/api/orders/cancel', {
      caller,
      op,
      items: [{ orderId }],
      sign_message: signMessage,
      sign,
    })
    return decodeCancelInput(cancelData.input)
  }

  async fetchOrderSign(
    caller: string,
    op: number,
    orderId: number,
    currency: string,
    price: string,
    royalty: number | undefined,
    payback: number | undefined,
    tokenId: string
  ): Promise<RunInput | undefined> {
    const { data } = await this._post('/api/orders/sign', {
      caller,
      op,
      amountToEth: '0',
      amountToWeth: '0',
      items: [{ orderId, currency, price, tokenId, royalty, payback }],
      check: true, // set false to skip nft ownership check
    })
    const inputData = (data ?? []) as { order_id: number; input: string }[]
    const input = inputData.find(d => d.order_id === orderId)
    return input ? decodeRunInput(input.input) : undefined
  }
}

const sharedAPIClient: Record<Network, APIClient | null> = {
  mainnet: null,
  goerli: null,
}

export async function initAPIClient(apiKey: string, network: Network) {
  sharedAPIClient[network] = new APIClient(network, apiKey)
}

export const getSharedAPIClient = (network: Network) => {
  const client = sharedAPIClient[network]
  if (!client) throw new Error('API Client not yet initialized')
  return client
}
