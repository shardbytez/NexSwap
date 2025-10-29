import { ui, initializeUiElements, syncTokenSelection, updateToAmount, setButtonState } from './ui.js';
import { appState } from './ui.js';
import { connectWallet, tryEagerConnect } from './wallet.js';
import { getActiveTokens, handleSwapAction, claimFromFaucet } from './contracts.js';
import { CONFIG } from './config.js';

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

export function showNotification(message, type = 'info', txHash = null) {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<p>${message}</p>`;

    if (txHash) {
        const explorerUrl = `${CONFIG.BLOCK_EXPLORER_URL}tx/${txHash}`;
        notification.innerHTML += `<div class="notification-tx">Tx: <a href="${explorerUrl}" target="_blank">${txHash.slice(0, 6)}...${txHash.slice(-4)}</a></div>`;
    }

    // FIXED: Changed .notification to (notification)
    container.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

document.addEventListener('DOMContentLoaded', main);

async function main() {
    initializeUiElements();
    appState.fee = ethers.utils.parseEther("0.0001");

    const lazyUpdate = debounce(() => {
        if (appState.account) updateActionButton();
    }, 500);

    function handleUiChange() {
        ui.statusMessage.textContent = '';
        syncTokenSelection();
        updateToAmount();
        if (appState.account) {
            setButtonState(ui.actionBtn, "Updating...", true);
            lazyUpdate();
        }
    }

    ui.connectBtn.addEventListener("click", connectWallet);
    ui.faucetBtn.addEventListener("click", claimFromFaucet);
    ui.actionBtn.addEventListener("click", handleSwapAction);
    
    ui.fromAmountInput.addEventListener("input", handleUiChange);
    ui.fromTokenSelect.addEventListener("change", handleUiChange);
    ui.toTokenSelect.addEventListener("change", handleUiChange);

    if (window.ethereum) {
        window.ethereum.on('accountsChanged', () => window.location.reload());
    }

    await tryEagerConnect();
    console.log("Application initialized successfully.");
    updateUiState(); 
}

export function updateUiState() {
    syncTokenSelection();
    updateToAmount();
    updateActionButton();
}

export async function updateActionButton() {
    if (!appState.account) return setButtonState(ui.actionBtn, "Connect Wallet", false);
    
    const amountIn = ui.fromAmountInput.value;
    if (!amountIn || parseFloat(amountIn) <= 0) return setButtonState(ui.actionBtn, "Enter Amount", true);
    
    try {
        const { fromContract, fromSymbol } = getActiveTokens();
        const decimals = await fromContract.decimals();
        const required = ethers.utils.parseUnits(amountIn.toString(), decimals);
        const allowance = await fromContract.allowance(appState.account, CONFIG.CONTRACTS.NexSwap);
        
        if (allowance.gte(required)) {
            setButtonState(ui.actionBtn, "Swap", false);
        } else {
            setButtonState(ui.actionBtn, `Approve ${fromSymbol}`, false);
        }
    } catch (err) {
        console.warn("Could not check allowance:", err);
        setButtonState(ui.actionBtn, "Error", true);
    }
}
