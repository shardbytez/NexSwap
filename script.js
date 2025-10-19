// ⚙️ script.js

const NSW = "0x4786612305a3fBF0ceF81244B3992852EE92b1F3";
const NST = "0xbe566596b84D96E6bBCD3201CADf46910AEE4B56";
const Faucet = "0xdf84f4acde69ea69da7196b982dc32b23614e970";
const NexSwap = "0xEA1f9cAEDCeC543fe7F5b01E234dC8cA3C479857";
const FEE = ethers.utils.parseEther("0.0001");

let provider, signer, account;
let tokenA, tokenB, nexSwapContract, faucetContract;

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

const connectBtn = document.getElementById("connectWallet");
const faucetBtn = document.getElementById("faucetBtn");
const actionBtn = document.getElementById("actionButton");

// 🔹 Подключение кошелька
connectBtn.onclick = async () => {
  if (typeof window.ethereum === "undefined") {
    alert("Install MetaMask!");
    return;
  }

  try {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    account = await signer.getAddress();

    connectBtn.textContent = `${account.slice(0, 6)}...${account.slice(-4)}`;
    connectBtn.disabled = true;

    const network = await provider.getNetwork();
    if (network.chainId !== 245022926) {
      alert("Please switch to Nexus Network in MetaMask!");
    }

    tokenA = new ethers.Contract(NSW, erc20ABI, signer);
    tokenB = new ethers.Contract(NST, erc20ABI, signer);
    nexSwapContract = new ethers.Contract(NexSwap, nexSwapABI, signer);
    faucetContract = new ethers.Contract(Faucet, faucetABI, signer);

    checkAllowance();

    console.log("✅ Wallet connected:", account);
  } catch (err) {
    console.error("❌ Wallet connection failed:", err);
    alert("Failed to connect wallet. Check console for details.");
  }
};

// 🔹 Проверка allowance и обновление кнопки
async function checkAllowance() {
  if (!account) return;

  const fromTokenSel = document.getElementById("fromToken").value;
  const fromToken = fromTokenSel === "NSW" ? tokenA : tokenB;

  const allowance = await fromToken.allowance(account, NexSwap);
  const amountIn = document.getElementById("fromAmount").value || "0";
  const decimals = await fromToken.decimals();
  const required = ethers.utils.parseUnits(amountIn.toString(), decimals);

  if (allowance.gte(required)) {
    actionBtn.textContent = "Swap";
  } else {
    actionBtn.textContent = `Approve ${fromTokenSel}`;
  }
}

// Следим за изменениями
document.getElementById("fromAmount").addEventListener("input", checkAllowance);
document.getElementById("fromToken").addEventListener("change", checkAllowance);
document.getElementById("toToken").addEventListener("change", checkAllowance);

// 🔹 Кнопка действий (Approve / Swap)
actionBtn.onclick = async () => {
  if (!signer) return alert("Connect wallet first!");

  const fromTokenSel = document.getElementById("fromToken").value;
  const toTokenSel = document.getElementById("toToken").value;
  const amountIn = document.getElementById("fromAmount").value;

  if (!amountIn || amountIn <= 0) return alert("Enter amount!");

  const fromToken = fromTokenSel === "NSW" ? tokenA : tokenB;
  const decimals = await fromToken.decimals();
  const parsedAmount = ethers.utils.parseUnits(amountIn.toString(), decimals);
  const allowance = await fromToken.allowance(account, NexSwap);

  // Если нет апрува — делаем approve
  if (allowance.lt(parsedAmount)) {
    try {
      const tx = await fromToken.approve(NexSwap, parsedAmount);
      await tx.wait();
      alert("Approve successful!");
      return checkAllowance();
    } catch (e) {
      console.error(e);
      return alert("Approve failed!");
    }
  }

  // Swap в нужную сторону
  try {
    if (fromTokenSel === "NSW") {
      const tx = await nexSwapContract.swapAforB(parsedAmount, 0, { value: FEE });
      await tx.wait();
      alert("✅ Swap NSW → NST completed!");
    } else {
      const tx = await nexSwapContract.swapBforA(parsedAmount, 0, { value: FEE });
      await tx.wait();
      alert("✅ Swap NST → NSW completed!");
    }
  } catch (e) {
    console.error(e);
    alert("Swap failed!");
  }
};

// 🔹 Faucet claim
faucetBtn.onclick = async () => {
  if (!signer) return alert("Connect wallet first!");

  try {
    const tx = await faucetContract.claim();
    await tx.wait();
    alert("💧 Tokens claimed from Faucet!");
  } catch (e) {
    console.error(e);
    alert("Faucet claim failed!");
  }
};
