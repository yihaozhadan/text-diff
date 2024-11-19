const LINE_LIMIT = 9999;
const warningElement = document.getElementById('warning');
const toastElement = document.getElementById('toast');

function showWarning(message) {
    warningElement.textContent = message;
    warningElement.classList.add('show');
}

function hideWarning() {
    warningElement.classList.remove('show');
}

function showToast(message) {
    toastElement.textContent = message;
    toastElement.classList.add('show');
    setTimeout(() => {
        toastElement.classList.remove('show');
    }, 3000);
}

function updateLineNumbers(textAreaId, lineNumbersId) {
    const textarea = document.getElementById(textAreaId);
    const lineNumbers = document.getElementById(lineNumbersId);
    const lines = textarea.value.split('\n');
    const lineCount = Math.max(lines.length, 1);
    
    if (lineCount > LINE_LIMIT) {
        const extraLines = lineCount - LINE_LIMIT;
        // Remove the extra lines
        textarea.value = textarea.value.split('\n').slice(0, LINE_LIMIT).join('\n');
        // Show both warning and toast
        showWarning(`Maximum line limit (${LINE_LIMIT}) exceeded. Extra ${extraLines} lines have been removed.`);
        showToast(`Line limit exceeded! Removed ${extraLines} lines.`);
        // Recalculate line count after trimming
        const updatedLines = textarea.value.split('\n');
        const numbers = Array.from({ length: updatedLines.length }, (_, i) => `${i + 1}`).join('\n');
        lineNumbers.textContent = numbers;
    } else {
        hideWarning();
        // Generate line numbers with the same line height as textarea
        const numbers = Array.from({ length: lineCount }, (_, i) => `${i + 1}`).join('\n');
        lineNumbers.textContent = numbers;
    }

    // Sync scroll position
    const lineNumbersContainer = lineNumbers.parentElement;
    lineNumbersContainer.scrollTop = textarea.scrollTop;
}

// Add event listeners for both text areas
['textArea1', 'textArea2'].forEach(textAreaId => {
    const textarea = document.getElementById(textAreaId);
    const lineNumbersId = 'lineNumbers' + textAreaId.slice(-1);

    // Update on input
    textarea.addEventListener('input', () => {
        updateLineNumbers(textAreaId, lineNumbersId);
    });

    // Sync scroll
    textarea.addEventListener('scroll', () => {
        const lineNumbers = document.getElementById(lineNumbersId);
        const lineNumbersContainer = lineNumbers.parentElement;
        lineNumbersContainer.scrollTop = textarea.scrollTop;
    });

    // Initial line numbers
    updateLineNumbers(textAreaId, lineNumbersId);
});

document.getElementById('compareButton').addEventListener('click', function() {
    const text1 = document.getElementById('textArea1').value;
    const text2 = document.getElementById('textArea2').value;
    const resultDiv = document.getElementById('result');

    if (text1 === text2) {
        resultDiv.innerHTML = '<p>Both texts are identical.</p>';
    } else {
        resultDiv.innerHTML = '<p>Texts are different.</p>';
    }
});
