// Contract addresses
const CONTRACTS = {
    NSW: "0x4786612305a3fBF0ceF81244B3992852EE92b1F3",
    NST: "0xbe566596b84D96E6bBCD3201CADf46910AEE4B56",
    Faucet: "0xdf84f4acde69ea69da7196b982dc32b23614e970",
    NexSwap: "0xEA1f9cAEDCeC543fe7F5b01E234dC8cA3C479857"
};

// Fixed NEX fee (0.0001)
const FIXED_NEX_FEE = ethers.utils.parseEther("0.0001");

let provider, signer, userAddress;

// Basic ERC20 ABI (for allowance/approve)
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)"
];

// Faucet ABI
const FAUCET_ABI = [
    "function claim() external"
];

// NexSwap ABI (simplified)
const NEXSWAP_ABI = [
    "function swapAforB(uint256 amountAIn, uint256 minBOut) external payable returns (uint256)",
    "function swapBforA(uint256 amountBIn, uint256 minAOut) external payable returns (uint256)"
];

// Connect wallet
document.getElementById('connectWallet').addEventListener('click', async () => {
    if (!window.ethereum) return alert("Install MetaMask");
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    document.getElementById('walletAddress').textContent = `${userAddress.slice(0,6)}...${userAddress.slice(-4)}`;
    document.getElementById('connectWallet').style.display = 'none';
    document.getElementById('status').innerText = "Wallet connected.";
});

// Faucet claim
document.getElementById('faucetBtn').addEventListener('click', async () => {
    if (!signer) return alert("Connect wallet first!");
    const faucet = new ethers.Contract(CONTRACTS.Faucet, FAUCET_ABI, signer);
    const tx = await faucet.claim();
    await tx.wait();
    alert("Tokens claimed successfully!");
});

// Swap / Approve logic
document.getElementById('actionBtn').addEventListener('click', async () => {
    const fromToken = document.getElementById('fromToken').value;
    const toToken = document.getElementById('toToken').value;
    const amountIn = document.getElementById('fromAmount').value;

    if (!amountIn || amountIn <= 0) return alert("Enter amount!");

    const tokenAddr = CONTRACTS[fromToken];
    const token = new ethers.Contract(tokenAddr, ERC20_ABI, signer);

    const allowance = await token.allowance(userAddress, CONTRACTS.NexSwap);
    const amountWei = ethers.utils.parseUnits(amountIn.toString(), 18);
    const actionBtn = document.getElementById('actionBtn');

    if (allowance.lt(amountWei)) {
        // Approve first
        actionBtn.innerText = `Approving ${fromToken}...`;
        const tx = await token.approve(CONTRACTS.NexSwap, amountWei);
        await tx.wait();
        actionBtn.innerText = "Swap";
        document.getElementById('status').innerText = `${fromToken} approved.`;
    } else {
        // Swap action
        const nexSwap = new ethers.Contract(CONTRACTS.NexSwap, NEXSWAP_ABI, signer);
        document.getElementById('status').innerText = "Swapping...";

        let tx;
        if (fromToken === "NSW" && toToken === "NST") {
            tx = await nexSwap.swapAforB(amountWei, 0, { value: FIXED_NEX_FEE });
        } else if (fromToken === "NST" && toToken === "NSW") {
            tx = await nexSwap.swapBforA(amountWei, 0, { value: FIXED_NEX_FEE });
        } else {
            return alert("Invalid swap direction!");
        }

        await tx.wait();
        document.getElementById('status').innerText = "Swap completed!";
    }
});
