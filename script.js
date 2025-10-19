// --- Config ---
const CONTRACTS = {
  Faucet: "0xdf84f4acde69ea69da7196b982dc32b23614e970",
  NexSwap: "0xEA1f9cAEDCeC543fe7F5b01E234dC8cA3C479857",
  NSW: "0x4786612305a3fBF0ceF81244B3992852EE92b1F3",
  NST: "0xbe566596b84D96E6bBCD3201CADf46910AEE4B56"
};

const NEXUS_RPC = "https://rpc.nexusnetwork.io";
const NEXUS_CHAIN_ID = "0x19b"; // 411
const FIXED_NEX_FEE = ethers.utils.parseEther("0.0001");

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)"
];
const FAUCET_ABI = ["function claim() external"];
const NEXSWAP_ABI = [
  "function swapAforB(uint256 amountAIn, uint256 minBOut) external payable returns (uint256)",
  "function swapBforA(uint256 amountBIn, uint256 minAOut) external payable returns (uint256)"
];

let provider, signer, user;

// --- Helpers ---
function log(msg) {
  document.getElementById("status").innerText = msg;
}

// --- Connect Wallet ---
document.getElementById("connectBtn").addEventListener("click", async () => {
  if (!window.ethereum) return log("MetaMask not found!");

  provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = provider.getSigner();
  user = await signer.getAddress();
  log("Connected: " + user.slice(0, 6) + "..." + user.slice(-4));

  document.getElementById("faucetBtn").disabled = false;
  document.getElementById("swapBtn").disabled = false;
});

// --- Faucet Claim ---
document.getElementById("faucetBtn").addEventListener("click", async () => {
  if (!signer) return log("Connect wallet first!");
  try {
    const faucet = new ethers.Contract(CONTRACTS.Faucet, FAUCET_ABI, signer);
    log("Claiming...");
    const tx = await faucet.claim();
    await tx.wait();
    log("Tokens claimed!");
  } catch (e) {
    log("Faucet error: " + e.message);
  }
});

// --- Swap Logic ---
document.getElementById("swapBtn").addEventListener("click", async () => {
  if (!signer) return log("Connect wallet first!");

  const fromToken = document.getElementById("fromToken").value;
  const toToken = document.getElementById("toToken").value;
  const amount = document.getElementById("fromAmount").value;

  if (!amount) return log("Enter amount!");
  const amountWei = ethers.utils.parseUnits(amount, 18);
  const token = new ethers.Contract(CONTRACTS[fromToken], ERC20_ABI, signer);
  const allowance = await token.allowance(user, CONTRACTS.NexSwap);

  const btn = document.getElementById("swapBtn");

  if (allowance.lt(amountWei)) {
    log("Approving " + fromToken + "...");
    btn.textContent = "Approving...";
    const tx = await token.approve(CONTRACTS.NexSwap, amountWei);
    await tx.wait();
    log(fromToken + " approved!");
    btn.textContent = "Swap";
  } else {
    log("Swapping...");
    btn.textContent = "Swapping...";
    const nexSwap = new ethers.Contract(CONTRACTS.NexSwap, NEXSWAP_ABI, signer);
    let tx;
    if (fromToken === "NSW" && toToken === "NST")
      tx = await nexSwap.swapAforB(amountWei, 0, { value: FIXED_NEX_FEE });
    else if (fromToken === "NST" && toToken === "NSW")
      tx = await nexSwap.swapBforA(amountWei, 0, { value: FIXED_NEX_FEE });
    else return log("Invalid direction!");
    await tx.wait();
    log("Swap done!");
    btn.textContent = "Approve";
  }
});
