export function waitForTransaction(provider, txHash, timeout = 20000, pollInterval = 3000) {
    return new Promise((resolve, reject) => {
        let intervalId;
        const timeoutId = setTimeout(() => {
            clearInterval(intervalId);
            reject(new Error('Transaction confirmation timed out.'));
        }, timeout);

        intervalId = setInterval(async () => {
            try {
                const receipt = await provider.getTransactionReceipt(txHash);
                if (receipt) {
                    clearInterval(intervalId);
                    clearTimeout(timeoutId);
                    resolve(receipt);
                }
            } catch (error) {
                console.warn("Polling for receipt failed, will retry:", error);
            }
        }, pollInterval);
    });
}
