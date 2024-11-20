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

/**
 * Find differences between two texts by comparing them line by line.
 * The algorithm prioritizes:
 * 1. Deletions at the start of the sequence
 * 2. Additions between matched lines
 * 3. Remaining deletions at the end
 * @param {string} text1 - The original text (left side)
 * @param {string} text2 - The modified text (right side)
 * @returns {Array} Array of difference objects describing the changes
 */
function findLineDifferences(text1, text2) {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');

    /**
     * Find matching lines between the two texts in order.
     * This helps identify which lines remain unchanged and their positions.
     * @returns {Object} Object containing:
     *   - matches: Array of [line1Index, line2Index] pairs
     *   - used1: Set of indices from text1 that have matches
     *   - used2: Set of indices from text2 that have matches
     */
    function findMatchingLines() {
        const matches = [];  // Stores pairs of matching line indices
        const used1 = new Set();  // Tracks which lines from text1 are matched
        const used2 = new Set();  // Tracks which lines from text2 are matched

        // Find exact matches while preserving order
        let j = 0;
        for (let i = 0; i < lines1.length; i++) {
            // Skip already matched lines in text2
            while (j < lines2.length && used2.has(j)) j++;
            
            // If we find a match, record it
            if (j < lines2.length && lines1[i] === lines2[j]) {
                matches.push([i, j]);
                used1.add(i);
                used2.add(j);
                j++;
            }
        }

        return { matches, used1, used2 };
    }

    /**
     * Generate difference objects based on matched and unmatched lines.
     * Processes changes in this order:
     * 1. Deletions at the start
     * 2. Additions between matches
     * 3. Remaining additions
     * 4. Remaining deletions
     * @param {Array} matches - Array of matching line index pairs
     * @param {Set} used1 - Set of matched indices from text1
     * @param {Set} used2 - Set of matched indices from text2
     * @returns {Array} Array of difference objects
     */
    function generateDifferences(matches, used1, used2) {
        const differences = [];
        let lastMatchedLine1 = -1;  // Last matched line in text1
        let lastMatchedLine2 = -1;  // Last matched line in text2

        // First, handle deletions at the start of the sequence
        // These are lines in text1 that don't have matches
        for (let i = 0; i < lines1.length; i++) {
            if (!used1.has(i)) {
                differences.push({
                    type: 'delete',
                    leftLines: [i + 1, i + 1],  // Convert to 1-based line numbers
                    rightLine: 1,
                    count: 1
                });
            }
        }

        // Process matches and find additions between them
        for (let i = 0; i < matches.length; i++) {
            const [line1, line2] = matches[i];
            
            // Look for unmatched lines in text2 before this match
            // These are additions relative to the current match
            for (let j = lastMatchedLine2 + 1; j < line2; j++) {
                if (!used2.has(j)) {
                    differences.push({
                        type: 'add',
                        leftLine: line1,
                        rightLines: [j + 1, j + 1],  // Convert to 1-based line numbers
                        count: 1
                    });
                }
            }

            lastMatchedLine1 = line1;
            lastMatchedLine2 = line2;
        }

        // Handle any remaining additions after the last match
        for (let j = lastMatchedLine2 + 1; j < lines2.length; j++) {
            if (!used2.has(j)) {
                differences.push({
                    type: 'add',
                    leftLine: lines1.length,
                    rightLines: [j + 1, j + 1],
                    count: 1
                });
            }
        }

        // Finally, handle any remaining deletions at the end
        for (let i = lastMatchedLine1 + 1; i < lines1.length; i++) {
            if (!used1.has(i)) {
                differences.push({
                    type: 'delete',
                    leftLines: [i + 1, i + 1],
                    rightLine: lines2.length + 1,
                    count: 1
                });
            }
        }

        return differences;
    }

    // Find matching lines and generate differences
    const { matches, used1, used2 } = findMatchingLines();
    return generateDifferences(matches, used1, used2);
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

    const CONTEXT_LINES = 3;
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');

    function addLine(element, content, type, lineNumber) {
        const lineDiv = document.createElement('div');
        lineDiv.className = `diff-line ${type}`;
        
        // Add line number
        const lineNumberSpan = document.createElement('span');
        lineNumberSpan.className = 'line-number';
        lineNumberSpan.textContent = lineNumber;
        lineDiv.appendChild(lineNumberSpan);

        // Add content with prefix
        const contentSpan = document.createElement('span');
        contentSpan.className = 'line-content';
        let prefix = ' ';
        if (type === 'added') prefix = '+';
        if (type === 'removed') prefix = '-';
        contentSpan.textContent = `${prefix} ${content}`;
        lineDiv.appendChild(contentSpan);

        element.appendChild(lineDiv);
    }

    function addContextLines(startIdx, endIdx, side, element, lines) {
        for (let i = startIdx; i <= endIdx; i++) {
            if (i >= 0 && i < lines.length) {
                addLine(element, lines[i], 'context', i + 1);
            }
        }
    }

    switch (diff.type) {
        case 'add':
            // Show context in left view
            const leftContextStart = Math.max(0, diff.leftLine - CONTEXT_LINES);
            const leftContextEnd = Math.min(lines1.length - 1, diff.leftLine + CONTEXT_LINES);
            addContextLines(leftContextStart, leftContextEnd, 'left', leftDiff, lines1);

            // Show context and added lines in right view
            addContextLines(Math.max(0, diff.rightLines[0] - CONTEXT_LINES - 1), diff.rightLines[0] - 2, 'right', rightDiff, lines2);
            
            // Add the new lines
            for (let i = diff.rightLines[0] - 1; i < diff.rightLines[1]; i++) {
                addLine(rightDiff, lines2[i], 'added', i + 1);
            }
            
            addContextLines(diff.rightLines[1], Math.min(lines2.length - 1, diff.rightLines[1] + CONTEXT_LINES - 1), 'right', rightDiff, lines2);
            break;

        case 'delete':
            // Show context and deleted lines in left view
            addContextLines(Math.max(0, diff.leftLines[0] - CONTEXT_LINES - 1), diff.leftLines[0] - 2, 'left', leftDiff, lines1);
            
            // Show the deleted lines
            for (let i = diff.leftLines[0] - 1; i < diff.leftLines[1]; i++) {
                addLine(leftDiff, lines1[i], 'removed', i + 1);
            }
            
            addContextLines(diff.leftLines[1], Math.min(lines1.length - 1, diff.leftLines[1] + CONTEXT_LINES - 1), 'left', leftDiff, lines1);

            // Show context in right view
            const rightContextStart = Math.max(0, diff.rightLine - CONTEXT_LINES);
            const rightContextEnd = Math.min(lines2.length - 1, diff.rightLine + CONTEXT_LINES);
            addContextLines(rightContextStart, rightContextEnd, 'right', rightDiff, lines2);
            break;

        case 'modify':
            // Show context before changes
            addContextLines(Math.max(0, diff.leftLines[0] - CONTEXT_LINES - 1), diff.leftLines[0] - 2, 'left', leftDiff, lines1);
            addContextLines(Math.max(0, diff.rightLines[0] - CONTEXT_LINES - 1), diff.rightLines[0] - 2, 'right', rightDiff, lines2);
            
            // Show modified lines
            for (let i = diff.leftLines[0] - 1; i < diff.leftLines[1]; i++) {
                addLine(leftDiff, lines1[i], 'removed', i + 1);
            }
            for (let i = diff.rightLines[0] - 1; i < diff.rightLines[1]; i++) {
                addLine(rightDiff, lines2[i], 'added', i + 1);
            }
            
            // Show context after changes
            addContextLines(diff.leftLines[1], Math.min(lines1.length - 1, diff.leftLines[1] + CONTEXT_LINES - 1), 'left', leftDiff, lines1);
            addContextLines(diff.rightLines[1], Math.min(lines2.length - 1, diff.rightLines[1] + CONTEXT_LINES - 1), 'right', rightDiff, lines2);
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
