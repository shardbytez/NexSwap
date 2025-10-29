export const ui = {};
export const appState = { provider: null, signer: null, account: null, contracts: {}, fee: null };

export function initializeUiElements() {
    ui.connectBtn = document.getElementById("connectWallet");
    ui.faucetBtn = document.getElementById("faucetBtn");
    ui.actionBtn = document.getElementById("actionButton");
    ui.fromAmountInput = document.getElementById("fromAmount");
    ui.fromTokenSelect = document.getElementById("fromToken");
    ui.toTokenSelect = document.getElementById("toToken");
    ui.toAmountInput = document.getElementById("toAmount");
    ui.statusMessage = document.getElementById("statusMessage");
}

export function setButtonState(button, text, disabled) {
    if (button) {
        button.textContent = text;
        button.disabled = disabled;
    }
}

export function showMessage(message, isError = false) {
    console.log(isError ? `ERROR: ${message}` : `INFO: ${message}`);
    if (ui.statusMessage) {
        ui.statusMessage.textContent = message;
        ui.statusMessage.style.color = isError ? "red" : "green";
    } else {
        alert(message);
    }
}

export function syncTokenSelection() {
    if (ui.fromTokenSelect.value === ui.toTokenSelect.value) {
        ui.toTokenSelect.value = ui.fromTokenSelect.value === "NSW" ? "NST" : "NSW";
    }
}

export function updateToAmount() {
    const amountIn = parseFloat(ui.fromAmountInput.value);
    if (!amountIn || amountIn <= 0) {
        ui.toAmountInput.value = "";
        return;
    }
    ui.toAmountInput.value = (amountIn * 0.99).toFixed(4);
}
