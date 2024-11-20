const LINE_LIMIT = 9999;
const warningElement = document.getElementById('warning');
const warningMessageElement = warningElement.querySelector('.warning-message');
const toastElement = document.getElementById('toast');

function showWarning(message) {
    warningMessageElement.textContent = message;
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

function findLineDifferences(text1, text2) {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');
    const differences = [];
    let diffCount = 0;

    // Helper function to find the next different line
    function findNextDifference(startIdx1, startIdx2) {
        let i = startIdx1, j = startIdx2;
        let consecutiveDiffs = 0;
        let diffStart1 = i, diffStart2 = j;

        while (i < lines1.length || j < lines2.length) {
            if (i >= lines1.length) {
                // Remaining lines in text2 are additions
                consecutiveDiffs = lines2.length - j;
                differences.push({
                    type: 'add',
                    leftLine: i,
                    rightLines: [j + 1, j + consecutiveDiffs],
                    count: consecutiveDiffs
                });
                break;
            } else if (j >= lines2.length) {
                // Remaining lines in text1 are deletions
                consecutiveDiffs = lines1.length - i;
                differences.push({
                    type: 'delete',
                    leftLines: [i + 1, i + consecutiveDiffs],
                    rightLine: j,
                    count: consecutiveDiffs
                });
                break;
            } else if (lines1[i] !== lines2[j]) {
                // Found a difference
                if (consecutiveDiffs === 0) {
                    diffStart1 = i;
                    diffStart2 = j;
                }
                consecutiveDiffs++;
                
                // Check if next lines match
                const nextMatchFound = 
                    (i + 1 < lines1.length && j + 1 < lines2.length && lines1[i + 1] === lines2[j + 1]) ||
                    (i + 1 === lines1.length && j + 1 === lines2.length);

                if (nextMatchFound) {
                    // Determine if it's an add, delete, or modify
                    if (lines1[i] === '') {
                        differences.push({
                            type: 'add',
                            leftLine: i + 1,
                            rightLines: [diffStart2 + 1, j + 1],
                            count: consecutiveDiffs
                        });
                    } else if (lines2[j] === '') {
                        differences.push({
                            type: 'delete',
                            leftLines: [diffStart1 + 1, i + 1],
                            rightLine: j + 1,
                            count: consecutiveDiffs
                        });
                    } else {
                        differences.push({
                            type: 'modify',
                            leftLines: [diffStart1 + 1, i + 1],
                            rightLines: [diffStart2 + 1, j + 1],
                            count: consecutiveDiffs
                        });
                    }
                    consecutiveDiffs = 0;
                }
            }
            i++;
            j++;
        }
    }

    findNextDifference(0, 0);
    return differences;
}

function formatDifference(diff, index) {
    const diffNum = index + 1;
    let message = '';

    switch (diff.type) {
        case 'add':
            message = diff.count > 1 ? 
                `Add ${diff.count} lines ` +
                `(${diff.rightLines[0]}-${diff.rightLines[1]}, right text) ` +
                `after line ${diff.leftLine} (left text)`
                : `Add ${diff.count} line ` +
                `(${diff.rightLines[0]}, right text) ` +
                `after line ${diff.leftLine} (left text)`;
            break;
        case 'delete':
            message = diff.count > 1 ?
                `Delete ${diff.count} lines ` +
                `(${diff.leftLines[0]}-${diff.leftLines[1]}, left text) ` +
                `at line ${diff.rightLine} (right text)`
                : `Delete ${diff.count} line ` +
                `(${diff.leftLines[0]}, left text) ` +
                `at line ${diff.rightLine} (right text)`;
            break;
        case 'modify':
            message = `Modify ${diff.count} line${diff.count > 1 ? 's' : ''} ` +
                `(${diff.leftLines[0]}-${diff.leftLines[1]}, left text) ` +
                `to (${diff.rightLines[0]}-${diff.rightLines[1]}, right text)`;
            break;
    }

    return message;
}

function showDiffContent(diff, text1, text2) {
    const leftDiff = document.getElementById('leftDiff');
    const rightDiff = document.getElementById('rightDiff');
    const diffContainer = document.querySelector('.diff-view-container');
    
    // Clear previous content
    leftDiff.innerHTML = '';
    rightDiff.innerHTML = '';

    // Get the context lines (3 lines before and after)
    const CONTEXT_LINES = 3;
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');

    function addLine(element, line, type) {
        const lineDiv = document.createElement('div');
        lineDiv.className = `diff-line ${type}`;
        lineDiv.textContent = line;
        element.appendChild(lineDiv);
    }

    switch (diff.type) {
        case 'add':
            // Show context in left view
            for (let i = Math.max(0, diff.leftLine - CONTEXT_LINES); i <= Math.min(lines1.length - 1, diff.leftLine + CONTEXT_LINES); i++) {
                addLine(leftDiff, lines1[i], 'context');
            }
            // Show context and added lines in right view
            for (let i = diff.rightLines[0] - 1; i < diff.rightLines[1]; i++) {
                addLine(rightDiff, lines2[i], 'added');
            }
            break;

        case 'delete':
            // Show deleted lines in left view
            for (let i = diff.leftLines[0] - 1; i < diff.leftLines[1]; i++) {
                addLine(leftDiff, lines1[i], 'removed');
            }
            // Show context in right view
            for (let i = Math.max(0, diff.rightLine - CONTEXT_LINES); i <= Math.min(lines2.length - 1, diff.rightLine + CONTEXT_LINES); i++) {
                addLine(rightDiff, lines2[i], 'context');
            }
            break;

        case 'modify':
            // Show old lines in left view
            for (let i = diff.leftLines[0] - 1; i < diff.leftLines[1]; i++) {
                addLine(leftDiff, lines1[i], 'removed');
            }
            // Show new lines in right view
            for (let i = diff.rightLines[0] - 1; i < diff.rightLines[1]; i++) {
                addLine(rightDiff, lines2[i], 'added');
            }
            break;
    }

    diffContainer.classList.add('show');
}

document.getElementById('compareButton').addEventListener('click', function() {
    const text1 = document.getElementById('textArea1').value;
    const text2 = document.getElementById('textArea2').value;
    const resultDiv = document.getElementById('result');
    const diffSelect = document.getElementById('diffSelect');
    const diffDetail = document.getElementById('diffDetail');
    const diffContainer = document.querySelector('.diff-view-container');

    if (text1 === text2) {
        diffSelect.style.display = 'none';
        diffDetail.innerHTML = '<p>Both texts are identical.</p>';
        diffContainer.classList.remove('show');
    } else {
        const differences = findLineDifferences(text1, text2);
        if (differences.length === 0) {
            diffSelect.style.display = 'none';
            diffDetail.innerHTML = '<p>Texts are different but no line-level differences found.</p>';
            diffContainer.classList.remove('show');
        } else {
            // Clear previous options
            diffSelect.innerHTML = '<option value="">Select a difference...</option>';
            
            // Add new options
            differences.forEach((diff, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `Diff ${index + 1}`;
                diffSelect.appendChild(option);
            });

            // Show dropdown and clear detail
            diffSelect.style.display = 'block';
            diffDetail.innerHTML = '<p>Select a difference from the dropdown to see details.</p>';
            diffContainer.classList.remove('show');

            // Add change event listener
            diffSelect.onchange = function() {
                const selectedIndex = this.value;
                if (selectedIndex === '') {
                    diffDetail.innerHTML = '<p>Select a difference from the dropdown to see details.</p>';
                    diffContainer.classList.remove('show');
                } else {
                    const diff = differences[selectedIndex];
                    diffDetail.innerHTML = `<p>${formatDifference(diff, parseInt(selectedIndex))}</p>`;
                    showDiffContent(diff, text1, text2);
                }
            };
        }
    }
});

document.getElementById('resetButton').addEventListener('click', function() {
    // Clear both text areas
    document.getElementById('textArea1').value = '';
    document.getElementById('textArea2').value = '';
    
    // Clear the result
    document.getElementById('result').innerHTML = '';
    
    // Hide any warnings
    hideWarning();
    
    // Update line numbers
    updateLineNumbers('textArea1', 'lineNumbers1');
    updateLineNumbers('textArea2', 'lineNumbers2');
    
    // Show a toast confirmation
    showToast('Text areas have been cleared');
});

// Add close button functionality
document.querySelector('.close-button').addEventListener('click', hideWarning);

// Scroll to top functionality
const scrollToTopButton = document.getElementById('scrollToTop');

// Show button when page is scrolled
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 100) {
        scrollToTopButton.classList.add('show');
    } else {
        scrollToTopButton.classList.remove('show');
    }
});

// Smooth scroll to top when button is clicked
scrollToTopButton.addEventListener('click', () => {
    const targetPosition = 0;
    const startPosition = window.pageYOffset;
    const distance = Math.min(startPosition, window.innerHeight);
    
    window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
    });
});
