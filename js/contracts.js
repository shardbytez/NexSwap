import { CONFIG } from './config.js';
import { ui, appState, setButtonState } from './ui.js';
import { updateUiState, showNotification } from './main.js';
import { handleError } from './wallet.js';
import { waitForTransaction } from './tx-waiter.js';

export function getActiveTokens() {
    const fromSymbol = ui.fromTokenSelect.value;
    return {
        fromContract: fromSymbol === "NSW" ? appState.contracts.nsw : appState.contracts.nst,
        toContract: ui.toTokenSelect.value === "NSW" ? appState.contracts.nsw : appState.contracts.nst,
        fromSymbol,
        toSymbol: ui.toTokenSelect.value
    };
}

export async function handleSwapAction() {
    if (appState.isTxPending) return;
    if (!appState.signer) return showNotification("Please connect your wallet first!", 'error');
    
    const amountIn = ui.fromAmountInput.value;
    if (!amountIn || parseFloat(amountIn) <= 0) return showNotification("Please enter a valid amount.", 'warning');

    appState.isTxPending = true;
    setButtonState(ui.actionBtn, "Confirm in wallet...", true);
    ui.statusMessage.textContent = '';
    
    try {
        const { fromContract, fromSymbol } = getActiveTokens();
        const decimals = await fromContract.decimals();
        const parsedAmount = ethers.utils.parseUnits(amountIn.toString(), decimals);
        const allowance = await fromContract.allowance(appState.account, CONFIG.CONTRACTS.NexSwap);

        let tx;
        let action = '';
        if (allowance.lt(parsedAmount)) {
            action = 'Approving';
            tx = await fromContract.approve(CONFIG.CONTRACTS.NexSwap, parsedAmount);
        } else {
            action = 'Swapping';
            if (fromSymbol === "NSW") {
                tx = await appState.contracts.nexSwap.swapAforB(parsedAmount, 0, { value: appState.fee });
            } else {
                tx = await appState.contracts.nexSwap.swapBforA(parsedAmount, 0, { value: appState.fee });
            }
        }

        setButtonState(ui.actionBtn, `${action}... (Pending)`, true);
        const receipt = await waitForTransaction(appState.provider, tx.hash, 20000);

        if (receipt.status === 1) {
            showNotification(`✅ ${action} Successful!`, 'success', receipt.transactionHash);
            if (action === 'Swapping') {
                ui.fromAmountInput.value = "";
            }
        } else {
            showNotification(`Transaction failed on-chain. Please try again.`, 'error', receipt.transactionHash);
        }
    } catch (err) {
        if (err.message && err.message.includes("timed out")) {
            showNotification(`Transaction is taking longer than expected.`, 'warning');
        } else {
            handleError(err);
        }
    } finally {
        appState.isTxPending = false;
        updateUiState();
    }
}

export async function claimFromFaucet() {
    if (appState.isTxPending) return;
    if (!appState.signer) return showNotification("Please connect your wallet first!", 'error');
    
    appState.isTxPending = true;
    setButtonState(ui.faucetBtn, "Confirm in wallet...", true);
    
    try {
        const tx = await appState.contracts.faucet.claim();
        setButtonState(ui.faucetBtn, "Claiming... (Pending)", true);
        const receipt = await waitForTransaction(appState.provider, tx.hash, 20000);

        if (receipt.status === 1) {
            showNotification("💧 Tokens Claimed!", 'success', receipt.transactionHash);
        } else {
            showNotification("Faucet claim failed on-chain.", 'error', receipt.transactionHash);
        }
    } catch (err) {
        if (err.code === 4001) {
            handleError(err);
        } else if (err.message && (err.message.includes("Already claimed") || (err.data && err.data.message.includes("Already claimed")))) {
            showNotification("Faucet: Already claimed.", 'error');
        } else if (err.message && err.message.includes("timed out")) {
            showNotification("Claim is taking longer than expected.", 'warning');
        } else {
            handleError(err);
        }
    } finally {
        appState.isTxPending = false;
        setButtonState(ui.faucetBtn, "Faucet", false);
    }
}

export async function handleAddLiquidity() {
    if (appState.isTxPending || !appState.signer) return;

    const amountA = ui.poolAmountA.value;
    const amountB = ui.poolAmountB.value;

    if (!amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0) {
        return showNotification("Enter valid amounts for both tokens.", 'warning');
    }

    appState.isTxPending = true;
    setButtonState(ui.addLiquidityBtn, "Processing...", true);

    try {
        const parsedA = ethers.utils.parseUnits(amountA.toString(), 18);
        const parsedB = ethers.utils.parseUnits(amountB.toString(), 18);

        const allowanceA = await appState.contracts.nsw.allowance(appState.account, CONFIG.CONTRACTS.NexSwap);
        const allowanceB = await appState.contracts.nst.allowance(appState.account, CONFIG.CONTRACTS.NexSwap);

        if (allowanceA.lt(parsedA)) {
            setButtonState(ui.addLiquidityBtn, "Approve NSW...", true);
            const tx = await appState.contracts.nsw.approve(CONFIG.CONTRACTS.NexSwap, parsedA);
            await waitForTransaction(appState.provider, tx.hash);
        }

        if (allowanceB.lt(parsedB)) {
            setButtonState(ui.addLiquidityBtn, "Approve NST...", true);
            const tx = await appState.contracts.nst.approve(CONFIG.CONTRACTS.NexSwap, parsedB);
            await waitForTransaction(appState.provider, tx.hash);
        }

        setButtonState(ui.addLiquidityBtn, "Adding Liquidity...", true);
        const tx = await appState.contracts.nexSwap.addLiquidity(parsedA, parsedB);
        const receipt = await waitForTransaction(appState.provider, tx.hash);

        if (receipt.status === 1) {
            showNotification("✅ Liquidity Added!", 'success', receipt.transactionHash);
            ui.poolAmountA.value = "";
            ui.poolAmountB.value = "";
        }
    } catch (err) {
        handleError(err);
    } finally {
        appState.isTxPending = false;
        setButtonState(ui.addLiquidityBtn, "Add Liquidity", false);
        updateUiState();
    }
}

export async function handleRemoveLiquidity() {
    if (appState.isTxPending || !appState.signer) return;

    const lpBalance = await appState.contracts.nexSwap.balanceOf(appState.account);
    if (lpBalance.eq(0)) return showNotification("No LP tokens to remove.", 'warning');

    appState.isTxPending = true;
    setButtonState(ui.removeLiquidityBtn, "Removing...", true);

    try {
        const tx = await appState.contracts.nexSwap.removeLiquidity(lpBalance);
        const receipt = await waitForTransaction(appState.provider, tx.hash);
        if (receipt.status === 1) showNotification("✅ Liquidity Removed!", 'success', receipt.transactionHash);
    } catch (err) {
        handleError(err);
    } finally {
        appState.isTxPending = false;
        setButtonState(ui.removeLiquidityBtn, "Remove", false);
        updateUiState();
    }
}

export async function handleClaimRewards() {
    if (appState.isTxPending || !appState.signer) return;

    appState.isTxPending = true;
    setButtonState(ui.claimRewardsBtn, "Claiming...", true);

    try {
        const tx = await appState.contracts.nexSwap.claimRewards();
        const receipt = await waitForTransaction(appState.provider, tx.hash);
        if (receipt.status === 1) showNotification("✅ NEX Rewards Claimed!", 'success', receipt.transactionHash);
    } catch (err) {
        handleError(err);
    } finally {
        appState.isTxPending = false;
        setButtonState(ui.claimRewardsBtn, "Claim Rewards", false);
        updateUiState();
    }
}
