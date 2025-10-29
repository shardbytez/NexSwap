import { CONFIG } from './config.js';
import { ui, appState, setButtonState } from './ui.js';
import { updateUiState, showNotification } from './main.js';

export async function tryEagerConnect() {
    if (typeof window.ethereum === "undefined") return;
    try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) await connectWallet();
    } catch (err) { console.warn("Eager connect failed:", err); }
}

export async function connectWallet() {
    if (appState.isTxPending) return;
    if (typeof window.ethereum === "undefined") return showNotification("MetaMask is not installed!", 'error');
    setButtonState(ui.connectBtn, "Connecting...", true);
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        appState.account = accounts[0];
        appState.provider = new ethers.providers.Web3Provider(window.ethereum);
        appState.signer = appState.provider.getSigner();
        const network = await appState.provider.getNetwork();
        if (network.chainId !== parseInt(CONFIG.CHAIN_ID, 16)) await switchNetwork();
        initializeContracts();
        setButtonState(ui.connectBtn, `${appState.account.slice(0, 6)}...${appState.account.slice(-4)}`, false);
        ui.connectBtn.removeEventListener("click", connectWallet);
        ui.connectBtn.addEventListener("click", disconnectWallet);
        showNotification("Wallet connected successfully.", 'success');
        updateUiState();
    } catch (err) {
        handleError(err);
        setButtonState(ui.connectBtn, "Connect Wallet", false);
    }
}

export function disconnectWallet() {
    appState.account = null;
    appState.signer = null;
    setButtonState(ui.connectBtn, "Connect Wallet", false);
    ui.connectBtn.removeEventListener("click", disconnectWallet);
    ui.connectBtn.addEventListener("click", connectWallet);
    showNotification("Wallet disconnected.", 'info');
    updateUiState();
}

function initializeContracts() {
    const { NSW, NST, Faucet, NexSwap } = CONFIG.CONTRACTS;
    const { ERC20, FAUCET, NEXSWAP } = CONFIG.ABIs;
    appState.contracts.nsw = new ethers.Contract(NSW, ERC20, appState.signer);
    appState.contracts.nst = new ethers.Contract(NST, ERC20, appState.signer);
    appState.contracts.faucet = new ethers.Contract(Faucet, FAUCET, appState.signer);
    appState.contracts.nexSwap = new ethers.Contract(NexSwap, NEXSWAP, appState.signer);
}

async function switchNetwork() {
    try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CONFIG.CHAIN_ID }] });
    } catch (switchError) {
        if (switchError.code === 4902) await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: CONFIG.CHAIN_ID, chainName: CONFIG.CHAIN_NAME, nativeCurrency: CONFIG.NATIVE_CURRENCY, rpcUrls: [CONFIG.RPC_URL], blockExplorerUrls: [CONFIG.BLOCK_EXPLORER_URL] }] });
        else throw switchError;
    }
}

export function handleError(error) {
    console.error("❌ Operation failed:", error);
    let message = "An error occurred. See console for details.";
    if (error.code === 4001) {
        message = "Transaction rejected by user.";
    } else if (error.reason) {
        message = `Error: ${error.reason}`;
    }
    showNotification(message, 'error');
}
