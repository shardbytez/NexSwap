export const CONFIG = {
    CHAIN_ID: "0xF69", // 3945 в HEX
    CHAIN_NAME: "Nexus Testnet",
    RPC_URL: "https://testnet.rpc.nexus.xyz/",
    BLOCK_EXPLORER_URL: "https://nexus.testnet.blockscout.com/",
    NATIVE_CURRENCY: { name: "NEX", symbol: "NEX", decimals: 18 },
    CONTRACTS: {
        NSW: "0x4f8B0F03Ce91Cb6665a3CDD166F97af8E09D7832",
        NST: "0xdf84f4AcdE69ea69Da7196b982dc32b23614E970",
        Faucet: "0xAEEF54C5B02b2Bfbd301eFbCE436e62A68D741c7",
        NexSwap: "0x0948c29986CF85F19434ABe2998282a369d62C62",
    },
    ABIs: {
        ERC20: [
            "function approve(address spender, uint256 value) returns (bool)",
            "function allowance(address owner, address spender) view returns (uint256)",
            "function balanceOf(address account) view returns (uint256)",
            "function getPendingRewards(address user) view returns (uint256)",
            "function removeLiquidity(uint256 lpAmount) external",
            "function decimals() view returns (uint8)",
            "function symbol() view returns (string)"
        ],
        FAUCET: ["function claim() external"],
        NEXSWAP: [
            "function swapAforB(uint256 amountAIn, uint256 minBOut) payable returns (uint256)",
            "function swapBforA(uint256 amountBIn, uint256 minAOut) payable returns (uint256)",
            "function addLiquidity(uint256 amountA, uint256 amountB) external",
            "function removeLiquidity(uint256 lpAmount) external",
            "function claimRewards() external",
            "function balanceOf(address account) view returns (uint256)",
            "function getPendingRewards(address user) view returns (uint256)",
            "function getReserves() view returns (uint256, uint256)"
        ],
    },
};
