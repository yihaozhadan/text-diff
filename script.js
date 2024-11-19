function updateLineNumbers(textAreaId, lineNumbersId) {
    const textarea = document.getElementById(textAreaId);
    const lineNumbers = document.getElementById(lineNumbersId);
    const lines = textarea.value.split('\n');
    const lineCount = Math.max(lines.length, 1);
    
    // Generate line numbers with the same line height as textarea
    const numbers = Array.from({ length: lineCount }, (_, i) => `${i + 1}`).join('\n');
    lineNumbers.textContent = numbers;

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
