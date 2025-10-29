export const CONFIG = {
    CHAIN_ID: "0xF64",
    CHAIN_NAME: "Nexus",
    RPC_URL: "https://nexus-testnet.g.alchemy.com/public",
    BLOCK_EXPLORER_URL: "https://testnet3.explorer.nexus.xyz/",
    NATIVE_CURRENCY: { name: "NEX", symbol: "NEX", decimals: 18 },
    CONTRACTS: {
        NSW: "0x4786612305a3fBF0ceF81244B3992852EE92b1F3",
        NST: "0xbe566596b84D96E6bBCD3201CADf46910AEE4B56",
        Faucet: "0xdf84f4acde69ea69da7196b982dc32b23614e970",
        NexSwap: "0xEA1f9cAEDCeC543fe7F5b01E234dC8cA3C479857",
    },
    ABIs: {
        ERC20: ["function approve(address spender, uint256 value) returns (bool)","function allowance(address owner, address spender) view returns (uint256)","function decimals() view returns (uint8)","function symbol() view returns (string)"],
        FAUCET: ["function claim() external"],
        NEXSWAP: ["function swapAforB(uint256 amountAIn, uint256 minBOut) payable returns (uint256)","function swapBforA(uint256 amountBIn, uint256 minAOut) payable returns (uint256)"],
    },
};
