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
    if (resp.status !== 200) throw new Error('bad response')
    const respData = JSON.parse(resp.data)
    if (!respData || !respData.success) {
      const errors = respData?.errors
      const msg =
        errors && errors.length > 0 ? `Err_${errors[0].code}` : 'bad response'
      throw new Error(msg)
    }
    return respData
  }

  async _postX2Y2Order(order: X2Y2Order, isCollection: boolean) {
    return await this._post('/api/orders/add', {
      order: encodeOrder(order),
      isBundle: false,
      bundleName: '',
      bundleDesc: '',
      orderIds: [],
      royalties: [],
      changePrice: false,
      isCollection,
      isPrivate: false,
      taker: null,
    })
  }

  async postSellOrder(order: X2Y2Order) {
    return await this._postX2Y2Order(order, false)
  }

  async postBuyOffer(order: X2Y2Order, isCollection: boolean) {
    return await this._postX2Y2Order(order, isCollection)
  }

  async getSellOrder(maker: string, tokenAddress: string, tokenId: string) {
    const params: Record<string, string> = {
      maker,
      contract: tokenAddress,
      token_id: tokenId,
      network_id: getNetworkMeta(this.network).id.toString(),
    }
    const { data } = await this._get('/v1/orders', params)
    return data instanceof Array && data.length > 0
      ? (data[0] as Order)
      : undefined
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
    tokenId: string
  ): Promise<RunInput | undefined> {
    const { data } = await this._post('/api/orders/sign', {
      caller,
      op,
      amountToEth: '0',
      amountToWeth: '0',
      items: [{ orderId, currency, price, tokenId }],
    })
    const inputData = (data ?? []) as { order_id: number; input: string }[]
    const input = inputData.find(d => d.order_id === orderId)
    return input ? decodeRunInput(input.input) : undefined
  }
}

const sharedAPIClient: Record<Network, APIClient | null> = {
  mainnet: null,
}

export async function initAPIClient(apiKey: string) {
  sharedAPIClient.mainnet = new APIClient('mainnet', apiKey)
}

export const getSharedAPIClient = (network: Network) => {
  const client = sharedAPIClient[network]
  if (!client) throw new Error('API Client not yet initialized')
  return client
}
