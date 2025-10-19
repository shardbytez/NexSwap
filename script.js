// === CONTRACT ADDRESSES ===
const CONTRACTS = {
    NSW: "0x4786612305a3fBF0ceF81244B3992852EE92b1F3",
    NST: "0xbe566596b84D96E6bBCD3201CADf46910AEE4B56",
    Faucet: "0xdf84f4acde69ea69da7196b982dc32b23614e970",
    NexSwap: "0xEA1f9cAEDCeC543fe7F5b01E234dC8cA3C479857"
};

// === FIXED PROTOCOL FEE (0.0001 NEX) ===
const FIXED_NEX_FEE = ethers.utils.parseEther("0.0001");

// === NEXUS NETWORK SETTINGS ===
const NEXUS_CHAIN_ID = "0x19b"; // 411 (пример, уточни если другой)
const NEXUS_PARAMS = {
    chainId: NEXUS_CHAIN_ID,
    chainName: "Nexus Testnet",
    nativeCurrency: {
        name: "NEX",
        symbol: "NEX",
        decimals: 18
    },
    rpcUrls: ["https://rpc.nexusnetwork.io"], // твой RPC
    blockExplorerUrls: ["https://explorer.nexusnetwork.io"]
};

// === ABI ===
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)"
];

const FAUCET_ABI = ["function claim() external"];

const NEXSWAP_ABI = [
    "function swapAforB(uint256 amountAIn, uint256 minBOut) external payable returns (uint256)",
    "function swapBforA(uint256 amountBIn, uint256 minAOut) external payable returns (uint256)"
];

let provider, signer, userAddress;

// === CONNECT WALLET ===
document.getElementById("connectWallet").addEventListener("click", async () => {
    if (!window.ethereum) return alert("Install MetaMask!");

    provider = new ethers.providers.Web3Provider(window.ethereum);
    const network = await provider.getNetwork();

    if (network.chainId !== parseInt(NEXUS_CHAIN_ID, 16)) {
        try {
            await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [NEXUS_PARAMS]
            });
        } catch (err) {
            return alert("Please switch to Nexus network!");
        }
    }

    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    document.getElementById("walletAddress").textContent =
        `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
    document.getElementById("connectWallet").disabled = true;
    setStatus("Wallet connected to Nexus Network");
});

// === FAUCET ===
document.getElementById("faucetBtn").addEventListener("click", async () => {
    if (!signer) return alert("Connect wallet first!");

    const faucet = new ethers.Contract(CONTRACTS.Faucet, FAUCET_ABI, signer);
    setStatus("Claiming tokens...");
    const tx = await faucet.claim();
    await tx.wait();
    setStatus("Tokens claimed successfully!");
});

// === SWAP / APPROVE ===
document.getElementById("actionBtn").addEventListener("click", async () => {
    if (!signer) return alert("Connect wallet first!");

    const fromToken = document.getElementById("fromToken").value;
    const toToken = document.getElementById("toToken").value;
    const amountIn = document.getElementById("fromAmount").value;
    if (!amountIn || amountIn <= 0) return alert("Enter amount!");

    const token = new ethers.Contract(CONTRACTS[fromToken], ERC20_ABI, signer);
    const allowance = await token.allowance(userAddress, CONTRACTS.NexSwap);
    const amountWei = ethers.utils.parseUnits(amountIn.toString(), 18);
    const button = document.getElementById("actionBtn");

    if (allowance.lt(amountWei)) {
        button.textContent = `Approving ${fromToken}...`;
        setStatus("Waiting for approval...");
        const tx = await token.approve(CONTRACTS.NexSwap, amountWei);
        await tx.wait();
        button.textContent = "Swap";
        setStatus(`${fromToken} approved.`);
    } else {
        const nexSwap = new ethers.Contract(CONTRACTS.NexSwap, NEXSWAP_ABI, signer);
        button.textContent = "Swapping...";
        setStatus("Performing swap...");

        let tx;
        if (fromToken === "NSW" && toToken === "NST") {
            tx = await nexSwap.swapAforB(amountWei, 0, { value: FIXED_NEX_FEE });
        } else if (fromToken === "NST" && toToken === "NSW") {
            tx = await nexSwap.swapBforA(amountWei, 0, { value: FIXED_NEX_FEE });
        } else {
            return alert("Invalid swap direction!");
        }

        await tx.wait();
        button.textContent = "Approve NSW";
        setStatus("Swap completed!");
    }
});

// === Helper ===
function setStatus(text) {
    document.getElementById("status").innerText = text;
}
