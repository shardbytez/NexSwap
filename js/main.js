import { ui, initializeUiElements, syncTokenSelection, updateToAmount, setButtonState } from './ui.js';
import { appState } from './ui.js';
import { connectWallet, tryEagerConnect } from './wallet.js';
import { CONFIG } from './config.js';
import { getActiveTokens, handleSwapAction, claimFromFaucet, handleAddLiquidity, handleRemoveLiquidity, handleClaimRewards } from './contracts.js';

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

    container.appendChild(notification);
    setTimeout(() => { notification.remove(); }, 5000);
}

document.addEventListener('DOMContentLoaded', main);

async function main() {
    initializeUiElements();
    appState.fee = ethers.utils.parseEther("0.01");

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

    // Логика переключения вкладок
    function switchTab(tab) {
        if (tab === 'swap') {
            ui.swapContainer.style.display = 'block';
            ui.poolContainer.style.display = 'none';
            ui.tabSwap.classList.add('active');
            ui.tabPool.classList.remove('active');
            ui.actionBtn.style.display = 'block'; // Показываем кнопку для Свапа
        } else {
            ui.swapContainer.style.display = 'none';
            ui.poolContainer.style.display = 'block';
            ui.tabSwap.classList.remove('active');
            ui.tabPool.classList.add('active');
            // Если кошелек не подключен, оставляем кнопку Connect Wallet видимой
            ui.actionBtn.style.display = appState.account ? 'none' : 'block';
        }
        updateUiState();
    }

    ui.tabSwap.addEventListener("click", () => switchTab('swap'));
    ui.tabPool.addEventListener("click", () => switchTab('pool'));

    ui.connectBtn.addEventListener("click", connectWallet);
    ui.faucetBtn.addEventListener("click", claimFromFaucet);
    ui.actionBtn.addEventListener("click", handleSwapAction);

    ui.fromAmountInput.addEventListener("input", handleUiChange);
    ui.fromTokenSelect.addEventListener("change", handleUiChange);
    ui.toTokenSelect.addEventListener("change", handleUiChange);

    ui.addLiquidityBtn.addEventListener("click", handleAddLiquidity);
    ui.removeLiquidityBtn.addEventListener("click", handleRemoveLiquidity);
    ui.claimRewardsBtn.addEventListener("click", handleClaimRewards);
    
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', () => window.location.reload());
    }

    await tryEagerConnect();
    console.log("Application initialized successfully.");
    updateUiState();
}

export async function updateUiState() {
    syncTokenSelection();
    updateToAmount();
    await updateActionButton();

    if (appState.account && appState.contracts.nexSwap) {
        try {
            const lpBalance = await appState.contracts.nexSwap.balanceOf(appState.account);
            const rewards = await appState.contracts.nexSwap.getPendingRewards(appState.account);
            
            ui.lpBalance.textContent = ethers.utils.formatEther(lpBalance);
            ui.rewardBalance.textContent = ethers.utils.formatEther(rewards);
        } catch (err) {
            console.warn("Fetch stats error:", err);
        }
    }
}

export async function updateActionButton() {
    if (!appState.account) return setButtonState(ui.actionBtn, "Connect Wallet", false);

    if (ui.tabPool.classList.contains('active')) {
        ui.actionBtn.style.display = 'none';
        return;
    } else {
        ui.actionBtn.style.display = 'block';
    }

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
