export enum Network {
  Mainnet = 'mainnet',
  Goerli = 'goerli',
}

export type NetworkMeta = {
  id: number
  rpcUrl: string
  marketContract: string
  erc721DelegateContract: string
  erc1155DelegateContract: string
  wethContract: string
  apiBaseURL: string
}

export const getNetworkMeta = (network: Network): NetworkMeta => {
  switch (network) {
    case Network.Mainnet:
      return {
        id: 1,
        rpcUrl: 'https://rpc.ankr.com/eth',
        marketContract: '0x74312363e45DCaBA76c59ec49a7Aa8A65a67EeD3',
        erc721DelegateContract: '0xf849de01b080adc3a814fabe1e2087475cf2e354',
        erc1155DelegateContract: '0x024ac22acdb367a3ae52a3d94ac6649fdc1f0779',
        wethContract: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        apiBaseURL: 'https://api.x2y2.org',
      }
    case Network.Goerli:
      return {
        id: 5,
        rpcUrl: 'https://goerli.infura.io/v3/',
        marketContract: '0x1891EcD5F7b1E751151d857265D6e6D08ae8989e',
        erc721DelegateContract: '0x095be13D86000260852E4F92eA48dc333fa35249',
        erc1155DelegateContract: '0x675B92ed07184635dEA2EF6fB403875DfA09d74A',
        wethContract: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
        apiBaseURL: 'https://goerli-api.x2y2.org',
      }
  }
}
