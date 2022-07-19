export type Network = 'mainnet'

export type NetworkMeta = {
  id: number
  rpcUrl: string
  marketContract: string
  delegateContract: string
  wethContract: string
  apiBaseURL: string
}

export const getNetworkMeta = (network: Network): NetworkMeta => {
  switch (network) {
    case 'mainnet':
      return {
        id: 1,
        rpcUrl: 'https://rpc.ankr.com/eth',
        marketContract: '0x74312363e45DCaBA76c59ec49a7Aa8A65a67EeD3',
        delegateContract: '0xf849de01b080adc3a814fabe1e2087475cf2e354',
        wethContract: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        apiBaseURL: 'https://api.x2y2.org',
      }
  }
}
