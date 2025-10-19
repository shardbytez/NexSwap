// === CONTRACT ADDRESSES ===
const NSW = "0x4786612305a3fBF0ceF81244B3992852EE92b1F3";
const NST = "0xbe566596b84D96E6bBCD3201CADf46910AEE4B56";
const Faucet = "0xdf84f4acde69ea69da7196b982dc32b23614e970";
const NexSwap = "0xEA1f9cAEDCeC543fe7F5b01E234dC8cA3C479857";
const FEE = ethers.utils.parseEther("0.0001");

// === GLOBAL VARS ===
let provider, signer, account;
let tokenA, tokenB, nexSwapContract, faucetContract;

// === ABIs ===
const erc20ABI = [
  "function approve(address spender, uint256 value) public returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

const faucetABI = ["function claim() external"];
const nexSwapABI = [
  "function swapAforB(uint256 amountAIn, uint256 minBOut) payable returns (uint256)",
  "function swapBforA(uint256 amountBIn, uint256 minAOut) payable returns (uint256)"
];

// === ELEMENTS ===
const connectBtn = document.getElementById("connectWallet");
const faucetBtn = document.getElementById("faucetBtn");
const actionBtn = document.getElementById("actionButton");
const fromAmountInput = document.getElementById("fromAmount");
const fromTokenSelect = document.getElementById("fromToken");
const toTokenSelect = document.getElementById("toToken");

// === NETWORK CONFIG ===
const NEXUS_CHAIN_ID = "0xE9767AE"; // 245022926 в hex

// === CONNECT WALLET ===
connectBtn.onclick = async () => {
  if (typeof window.ethereum === "undefined") return alert("Install MetaMask!");

  provider = new ethers.providers.Web3Provider(window.ethereum);

  try {
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    account = await signer.getAddress();

    connectBtn.textContent = `${account.slice(0, 6)}...${account.slice(-4)}`;
    connectBtn.classList.add("connected");

    const network = await provider.getNetwork();
    if (network.chainId !== 245022926) {
      alert("Please switch to Nexus Network in MetaMask!");
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: NEXUS_CHAIN_ID }]
        });
      } catch (e) {
        console.error("Network switch failed:", e);
      }
    }

    // Initialize contracts
    tokenA = new ethers.Contract(NSW, erc20ABI, signer);
    tokenB = new ethers.Contract(NST, erc20ABI, signer);
    nexSwapContract = new ethers.Contract(NexSwap, nexSwapABI, signer);
    faucetContract = new ethers.Contract(Faucet, faucetABI, signer);

    checkAllowance();
  } catch (err) {
    console.error("Connection failed:", err);
    alert("Failed to connect wallet!");
  }
};

// === CHECK ALLOWANCE ===
async function checkAllowance() {
  if (!account) return;

  const fromToken = fromTokenSelect.value === "NSW" ? tokenA : tokenB;
  const allowance = await fromToken.allowance(account, NexSwap);
  const amountIn = fromAmountInput.value || "0";
  const decimals = await fromToken.decimals();
  const required = ethers.utils.parseUnits(amountIn.toString(), decimals);

  if (allowance.gte(required)) {
    actionBtn.textContent = "Swap";
  } else {
    actionBtn.textContent = `Approve ${fromTokenSelect.value}`;
  }
}

// Update on input changes
fromAmountInput.addEventListener("input", checkAllowance);
fromTokenSelect.addEventListener("change", checkAllowance);
toTokenSelect.addEventListener("change", checkAllowance);

// === ACTION BUTTON (Approve / Swap) ===
actionBtn.onclick = async () => {
  if (!account) return alert("Connect wallet first!");

  const fromTokenSel = fromTokenSelect.value;
  const toTokenSel = toTokenSelect.value;
  const amountIn = fromAmountInput.value;

  if (!amountIn || amountIn <= 0) return alert("Enter amount!");

  const fromToken = fromTokenSel === "NSW" ? tokenA : tokenB;
  const decimals = await fromToken.decimals();
  const parsedAmount = ethers.utils.parseUnits(amountIn.toString(), decimals);

  const allowance = await fromToken.allowance(account, NexSwap);
  if (allowance.lt(parsedAmount)) {
    const tx = await fromToken.approve(NexSwap, parsedAmount);
    await tx.wait();
    alert("Approve successful!");
    return checkAllowance();
  }

  if (fromTokenSel === "NSW" && toTokenSel === "NST") {
    const tx = await nexSwapContract.swapAforB(parsedAmount, 0, { value: FEE });
    await tx.wait();
    alert("Swap NSW → NST completed!");
  } else if (fromTokenSel === "NST" && toTokenSel === "NSW") {
    const tx = await nexSwapContract.swapBforA(parsedAmount, 0, { value: FEE });
    await tx.wait();
    alert("Swap NST → NSW completed!");
  } else {
    alert("Invalid token pair!");
  }
};

// === FAUCET CLAIM ===
faucetBtn.onclick = async () => {
  if (!account) return alert("Connect wallet first!");
  try {
    const tx = await faucetContract.claim();
    await tx.wait();
    alert("Tokens claimed from Faucet!");
  } catch (e) {
    console.error("Faucet error:", e);
    alert("Faucet claim failed!");
  }
};
