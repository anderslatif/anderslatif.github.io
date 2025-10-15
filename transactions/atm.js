let actualBalance = 1000;
let displayedBalance = '???';
let pendingBalance = null;
let bobBalance = null; // Bob's view of the balance (separate from bank's actual balance)
let legitimateBalance = null; // What the balance should be if operations were applied correctly
let lastReadBalance = null; // The balance from the most recent read
let operationsSinceLastRead = 0; // Count operations since last read
let transactionStartBalance = null; // Balance at the start of entire transaction

let bobOperations = [];
let bankOperations = [];
let bobOperationBalances = []; // Track expected balance after each Bob operation
let totalOperationsInTransaction = 0; // Count all operations across all updates
let allBobOperations = []; // Track all Bob operations across entire transaction
let pendingUpdates = []; // Track available updates to apply
let appliedUpdateIndices = new Set(); // Track which bob operations have been used in updates


let achievements = loadAchievements();
let achievementReplays = loadReplays();

let exploitsThisSession = new Set();
let isRecording = false;
let currentRecording = [];
let isReplaying = false; // Flag to disable prompts during replay


// DOM elements
const balanceDisplay = document.getElementById('balance');
const withdrawBtn = document.getElementById('withdraw');
const depositBtn = document.getElementById('deposit');
const readBalanceBtn = document.getElementById('read-balance');
const updateBalanceBtn = document.getElementById('update-balance');
const updateDropdown = document.getElementById('update-dropdown');
const finishTransactionBtn = document.getElementById('finish-transaction');
const bobOpsDiv = document.getElementById('bob-operations');
const bankOpsDiv = document.getElementById('bank-operations');
const achievementsDiv = document.getElementById('achievements');
const rulesSection = document.getElementById('rules-section');

// Initialize
updateDisplay();
updateButtonStates();
displayAchievements();

// Check if rules should be shown (show if no achievements unlocked and no localStorage)
const hasAchievements = localStorage.getItem('achievements');
if (!hasAchievements) {
    rulesSection.classList.remove('hidden');
} else {
    rulesSection.classList.add('hidden');
}

// Start recording if there are still achievements to unlock
if (Object.values(achievements).some(val => !val)) {
    startRecording();
}

// Event listeners
withdrawBtn.addEventListener('click', () => {
    hideRulesOnFirstClick();
    withdraw();
});
depositBtn.addEventListener('click', () => {
    hideRulesOnFirstClick();
    deposit();
});
readBalanceBtn.addEventListener('click', () => {
    hideRulesOnFirstClick();
    readBalance();
});
updateBalanceBtn.addEventListener('click', () => {
    hideRulesOnFirstClick();
    applySelectedUpdate();
});
updateDropdown.addEventListener('change', updateButtonText);
finishTransactionBtn.addEventListener('click', () => {
    hideRulesOnFirstClick();
    finishTransaction();
});

// Rules link - toggle visibility
document.getElementById('rules-link').addEventListener('click', () => {
    rulesSection.classList.toggle('hidden');
});

function hideRulesOnFirstClick() {
    if (!rulesSection.classList.contains('hidden')) {
        rulesSection.classList.add('hidden');
    }
}

function updateDisplay() {
    balanceDisplay.textContent = displayedBalance;
}

function updateButtonStates() {
    const hasRead = pendingBalance !== null;
    withdrawBtn.disabled = !hasRead;
    depositBtn.disabled = !hasRead;
    updateBalanceBtn.disabled = pendingUpdates.length === 0;
    updateDropdown.disabled = pendingUpdates.length === 0;
    finishTransactionBtn.disabled = bobOperations.length === 0 && bankOperations.length === 0;
}

function updateDropdownList() {
    updateDropdown.innerHTML = '';
    if (pendingUpdates.length === 0) {
        updateButtonText();
        return;
    }
    pendingUpdates.forEach((update, idx) => {
        const option = document.createElement('option');
        option.value = idx;
        const opType = update.text.includes('Withdraw') ? 'Withdraw' : 'Deposit';
        option.textContent = `${opType} 100 DKK`;
        updateDropdown.appendChild(option);
    });
    updateButtonText();
}

function updateButtonText() {
    if (pendingUpdates.length === 0) {
        updateBalanceBtn.textContent = 'Update Balance';
        return;
    }
    const selectedIdx = updateDropdown.value !== '' ? parseInt(updateDropdown.value) : 0;
    const update = pendingUpdates[selectedIdx];
    if (update) {
        const amount = update.text.includes('Withdraw') ? '-100' : '+100';
        updateBalanceBtn.textContent = `Update ${amount} DKK`;
    }
}

function addBobOperation(text, expectedBalance) {
    const index = bobOperations.length;
    bobOperations.push(text);
    bobOperationBalances.push(expectedBalance);
    allBobOperations.push(text); // Track across entire transaction

    const p = document.createElement('p');
    p.textContent = text;
    p.className = 'operation-item';
    p.dataset.operationIndex = index;
    bobOpsDiv.appendChild(p);

    // Add matching spacer to Bank side
    const spacer = document.createElement('p');
    spacer.className = 'operation-spacer';
    spacer.innerHTML = '&nbsp;';
    bankOpsDiv.appendChild(spacer);

    // After render, match the heights
    requestAnimationFrame(() => {
        spacer.style.height = p.offsetHeight + 'px';
    });

    // Add to pending updates if not already applied
    if (!appliedUpdateIndices.has(index)) {
        pendingUpdates.push({
            index: index,
            text: text,
            balance: expectedBalance
        });
        updateDropdownList();
        updateButtonStates();
    }
}

function addBankOperation(text) {
    bankOperations.push(text);

    const p = document.createElement('p');
    p.textContent = text;
    p.className = 'operation-item';
    bankOpsDiv.appendChild(p);

    // Add matching spacer to Bob side
    const spacer = document.createElement('p');
    spacer.className = 'operation-spacer';
    spacer.innerHTML = '&nbsp;';
    bobOpsDiv.appendChild(spacer);

    // After render, match the heights
    requestAnimationFrame(() => {
        spacer.style.height = p.offsetHeight + 'px';
    });
}

function readBalance() {
    if (isRecording) currentRecording.push('readBalance');
    pendingBalance = actualBalance;
    lastReadBalance = actualBalance;
    operationsSinceLastRead = 0;

    // Only set bobBalance if this is the first read (no operations yet)
    if (bobBalance === null) {
        bobBalance = actualBalance;
    }

    // Track starting balance for achievement checking
    if (transactionStartBalance === null) {
        transactionStartBalance = actualBalance;
    }

    displayedBalance = actualBalance;
    addBankOperation(`Read balance: ${actualBalance} DKK`);
    updateDisplay();
    updateButtonStates();
}

function withdraw() {
    if (isRecording) currentRecording.push('withdraw');
    bobBalance -= 100;
    operationsSinceLastRead++;
    totalOperationsInTransaction++;

    const lastIndex = bobOperations.length;
    addBobOperation(`Withdraw 100 DKK (Balance now: ${bobBalance} DKK)`, bobBalance);

    // Update the operation to show the balance
    const lastOpElement = bobOpsDiv.querySelector(`p[data-operation-index="${lastIndex}"]`);
    if (lastOpElement) {
        lastOpElement.textContent = `Withdraw 100 DKK (Balance now: ${bobBalance} DKK) ✓`;
        lastOpElement.style.borderLeftColor = '#4CAF50';
    }

    // Add wiggle effect to update button (skip during replay)
    if (!isReplaying) {
        updateBalanceBtn.classList.add('wiggle');
        setTimeout(() => {
            updateBalanceBtn.classList.remove('wiggle');
        }, 500);
    }
}

function deposit() {
    if (isRecording) currentRecording.push('deposit');
    bobBalance += 100;
    operationsSinceLastRead++;
    totalOperationsInTransaction++;

    const lastIndex = bobOperations.length;
    addBobOperation(`Deposit 100 DKK (Balance now: ${bobBalance} DKK)`, bobBalance);

    // Update the operation to show the balance
    const lastOpElement = bobOpsDiv.querySelector(`p[data-operation-index="${lastIndex}"]`);
    if (lastOpElement) {
        lastOpElement.textContent = `Deposit 100 DKK (Balance now: ${bobBalance} DKK) ✓`;
        lastOpElement.style.borderLeftColor = '#4CAF50';
    }

    // Add wiggle effect to update button (skip during replay)
    if (!isReplaying) {
        updateBalanceBtn.classList.add('wiggle');
        setTimeout(() => {
            updateBalanceBtn.classList.remove('wiggle');
        }, 500);
    }
}

function applySelectedUpdate() {
    if (pendingUpdates.length === 0) return;

    const selectedIdx = updateDropdown.value !== '' ? parseInt(updateDropdown.value) : 0;
    const selectedUpdate = pendingUpdates[selectedIdx];

    if (!selectedUpdate) {
        console.error('No update found at index:', selectedIdx, 'pendingUpdates:', pendingUpdates);
        return;
    }

    if (isRecording) currentRecording.push(`updateBalance:${selectedIdx}`);

    const oldBalance = actualBalance;
    const amount = selectedUpdate.text.includes('Withdraw') ? -100 : 100;
    actualBalance += amount;

    addBankOperation(`Update balance: ${oldBalance} DKK → ${actualBalance} DKK`);

    // Mark this operation as applied (grey it out)
    appliedUpdateIndices.add(selectedUpdate.index);
    const opElement = bobOpsDiv.querySelector(`p[data-operation-index="${selectedUpdate.index}"]`);
    if (opElement) {
        opElement.style.opacity = '0.4';
        opElement.style.textDecoration = 'line-through';
    }

    // Remove from pending updates
    pendingUpdates.splice(selectedIdx, 1);
    updateDropdownList();
    updateButtonStates();

    // Add wiggle effect to finish transaction button (skip during replay)
    if (!isReplaying) {
        finishTransactionBtn.classList.add('wiggle');
        setTimeout(() => {
            finishTransactionBtn.classList.remove('wiggle');
        }, 500);
    }
}

function finishTransaction() {
    if (bobOperations.length === 0 && bankOperations.length === 0) return;

    // Skip prompts during replay
    if (!isReplaying) {
        // Calculate actual changes
        // Bob's gain = cash gained from operations - what was actually applied to account
        // Operations affect bobBalance, but updates applied affect actualBalance
        const cashFromOperations = transactionStartBalance - bobBalance; // Money Bob withdrew/deposited
        const bankApplied = transactionStartBalance - actualBalance; // What bank actually deducted/added
        const bobChange = cashFromOperations - bankApplied; // Net gain (cash in hand minus account change)
        const bankChange = actualBalance - transactionStartBalance;

        // Ask about Bob's gain/loss
        const bobGuess = prompt(`Bob started with ${transactionStartBalance} DKK.\n\nHow much has Bob gained (positive value) or lost (negative value)?`);
        if (bobGuess === null) return; // User cancelled

        const bobGuessNum = parseInt(bobGuess);
        if (isNaN(bobGuessNum)) {
            new SnackBar({
                message: 'Please enter a valid number',
                status: 'warning'
            });
            return finishTransaction();
        }

        if (bobGuessNum !== bobChange) {
            new SnackBar({
                message: `✗ Incorrect. Bob's change is ${bobChange} DKK. Try again!`,
                status: 'danger'
            });
            return finishTransaction();
        }

        // Correct answer
        new SnackBar({
            message: '✓ Correct! Transaction complete.',
            status: 'success'
        });
    }

    if (isRecording) currentRecording.push('finishTransaction');

    console.log('Finishing transaction:', {
        transactionStartBalance,
        actualBalance,
        totalOperationsInTransaction,
        allBobOperations
    });

    checkAchievements(transactionStartBalance);

    // Only reset if not replaying (replay will handle reset with delay)
    if (!isReplaying) {
        resetTransaction();
    }
}

function checkAchievements(startingBalance) {
    // Calculate total balance change from the starting balance at beginning of transaction
    const balanceChange = actualBalance - startingBalance;

    // Calculate how many updates were applied
    const updatesApplied = appliedUpdateIndices.size;

    console.log('Achievement Check:', {
        startingBalance,
        actualBalance,
        balanceChange,
        totalOperationsInTransaction,
        updatesApplied,
        allBobOperations,
        appliedUpdateIndices: Array.from(appliedUpdateIndices)
    });

    let unlockedAchievements = [];

    // First Steps
    if (!achievements.firstSteps) {
        achievements.firstSteps = true;
        unlockAchievement('First Steps', 'firstSteps', true);
        unlockedAchievements.push('firstSteps');
    }

    // By the Book (single operation with correct result)
    if (totalOperationsInTransaction === 1 && updatesApplied === 1 && (balanceChange === 100 || balanceChange === -100)) {
        const wasNew = !achievements.byTheBook;
        if (!achievements.byTheBook) {
            achievements.byTheBook = true;
            unlockedAchievements.push('byTheBook');
        }
        unlockAchievement('By the Book', 'byTheBook', wasNew);
    }

    // Triple Dip (three withdrawals but only one or fewer updates applied)
    const withdrawCount = allBobOperations.filter(op => op.includes('Withdraw')).length;
    if (withdrawCount >= 3 && updatesApplied <= 1) {
        const wasNew = !achievements.tripleDip;
        if (!achievements.tripleDip) {
            achievements.tripleDip = true;
            exploitsThisSession.add('tripleDip');
            unlockedAchievements.push('tripleDip');
        }
        unlockAchievement('Triple Dip', 'tripleDip', wasNew);
    }

    // Money Printer (deposit multiple times but only apply one update - Bob loses deposited money)
    const depositCount = allBobOperations.filter(op => op.includes('Deposit')).length;
    const appliedDepositUpdates = updatesApplied; // Count how many updates were applied
    if (depositCount >= 2 && appliedDepositUpdates === 1 && balanceChange === 100) {
        const wasNew = !achievements.moneyPrinter;
        if (!achievements.moneyPrinter) {
            achievements.moneyPrinter = true;
            exploitsThisSession.add('moneyPrinter');
            unlockedAchievements.push('moneyPrinter');
        }
        unlockAchievement('Money Printer', 'moneyPrinter', wasNew);
    }

    // Bob the Robber (withdrew more than once but didn't apply all updates)
    if (withdrawCount >= 2 && updatesApplied < withdrawCount) {
        const wasNew = !achievements.bobTheRobber;
        if (!achievements.bobTheRobber) {
            achievements.bobTheRobber = true;
            exploitsThisSession.add('bobTheRobber');
            unlockedAchievements.push('bobTheRobber');
        }
        unlockAchievement('Bob the Robber', 'bobTheRobber', wasNew);
    }

    // Fat Banker (lose 500+ DKK by depositing but not applying updates)
    // If Bob deposited money but updates weren't applied, Bob loses that money
    const unappliedDeposits = depositCount - (balanceChange / 100);
    const moneyLost = unappliedDeposits * 100;
    if (moneyLost >= 500) {
        const wasNew = !achievements.fatBanker;
        if (!achievements.fatBanker) {
            achievements.fatBanker = true;
            unlockedAchievements.push('fatBanker');
        }
        unlockAchievement('Fat Banker', 'fatBanker', wasNew);
    }

    // Race Condition Master (3+ operations with multiple discrepancies - operations not updated)
    const discrepancies = totalOperationsInTransaction - updatesApplied;
    if (totalOperationsInTransaction >= 3 && discrepancies >= 3) {
        const wasNew = !achievements.raceConditionMaster;
        if (!achievements.raceConditionMaster) {
            achievements.raceConditionMaster = true;
            exploitsThisSession.add('raceCondition');
            unlockedAchievements.push('raceConditionMaster');
        }
        unlockAchievement('Race Condition Master', 'raceConditionMaster', wasNew);
    }

    // Save recording for newly unlocked achievements
    if (unlockedAchievements.length > 0) {
        unlockedAchievements.forEach(key => stopRecording(key));
        clearRecording();
    }
}

function loadAchievements() {
    const saved = localStorage.getItem('achievements');
    if (saved) {
        return JSON.parse(saved);
    }
    return {
        firstSteps: false,
        byTheBook: false,
        tripleDip: false,
        moneyPrinter: false,
        bobTheRobber: false,
        fatBanker: false,
        raceConditionMaster: false
    };
}

function saveAchievements() {
    localStorage.setItem('achievements', JSON.stringify(achievements));
}

function loadReplays() {
    const saved = localStorage.getItem('achievementReplays');
    if (saved) {
        return JSON.parse(saved);
    }
    return {};
}

function saveReplays() {
    localStorage.setItem('achievementReplays', JSON.stringify(achievementReplays));
}

function startRecording() {
    isRecording = true;
    currentRecording = [];
}

function stopRecording(achievementKey) {
    if (currentRecording.length > 0) {
        achievementReplays[achievementKey] = [...currentRecording];
        saveReplays();
    }
}

function clearRecording() {
    isRecording = false;
    currentRecording = [];
}

function replayAchievement(achievementKey) {
    const replay = achievementReplays[achievementKey];
    if (!replay || replay.length === 0) {
        new SnackBar({
            message: 'No replay available for this achievement',
            status: 'warning'
        });
        return;
    }

    // Set replay mode to disable prompts BEFORE resetting
    isReplaying = true;

    // Reset the transaction state
    resetTransaction();

    // Disable buttons during replay
    const allButtons = [withdrawBtn, depositBtn, readBalanceBtn, updateBalanceBtn, finishTransactionBtn];
    allButtons.forEach(btn => btn.disabled = true);

    // Replay actions with delay
    let index = 0;
    const replayInterval = setInterval(() => {
        if (index >= replay.length) {
            clearInterval(replayInterval);
            // Wait 1.5 seconds before resetting
            setTimeout(() => {
                resetTransaction();
                isReplaying = false; // Exit replay mode AFTER reset
                allButtons.forEach(btn => btn.disabled = false);
                updateButtonStates();
            }, 1500);
            return;
        }

        const action = replay[index];

        // Handle updateBalance with index (e.g., "updateBalance:0")
        if (action.startsWith('updateBalance:')) {
            const updateIdx = parseInt(action.split(':')[1]);
            if (pendingUpdates[updateIdx]) {
                updateDropdown.value = updateIdx;
                applySelectedUpdate();
            }
        } else {
            switch(action) {
                case 'readBalance':
                    readBalance();
                    break;
                case 'withdraw':
                    withdraw();
                    break;
                case 'deposit':
                    deposit();
                    break;
                case 'finishTransaction':
                    finishTransaction();
                    break;
            }
        }
        index++;
    }, 1000);
}

function displayAchievements() {
    achievementsDiv.innerHTML = '';
    const achievementNames = {
        firstSteps: 'First Steps',
        byTheBook: 'By the Book',
        bobTheRobber: 'Bob the Robber',
        tripleDip: 'Triple Dip',
        raceConditionMaster: 'Race Condition Master',
        moneyPrinter: 'Money Printer',
        fatBanker: 'Fat Banker',
    };

    const achievementDescriptions = {
        firstSteps: 'Complete your first transaction',
        byTheBook: 'Complete a single legitimate operation',
        tripleDip: 'Withdraw three times but only apply one or zero updates',
        moneyPrinter: 'Deposit multiple times but only apply one update',
        bobTheRobber: 'Withdraw multiple times without applying all updates',
        raceConditionMaster: 'Perform 3+ operations with 3+ discrepancies (operations not updated)',
        fatBanker: 'Accumulate 1500 DKK or more'
    };

    const achievementCategories = {
        firstSteps: 'Innocent',
        byTheBook: 'Innocent',
        tripleDip: 'Hacker',
        moneyPrinter: 'Financier',
        bobTheRobber: 'Hacker',
        fatBanker: 'Financier',
        raceConditionMaster: 'Hacker'
    };

    for (const [key, name] of Object.entries(achievementNames)) {
        const div = document.createElement('div');
        const unlocked = achievements[key];
        div.className = unlocked ? 'achievement-slot unlocked' : 'achievement-slot';
        div.title = achievementDescriptions[key];
        div.dataset.achievementKey = key;
        const nameDisplay = unlocked ? `<div class="achievement-name">${name}</div>` : '';
        const category = achievementCategories[key];
        const categoryClass = category === 'Innocent' ? 'category-innocent' : (category === 'Hacker' ? 'category-hacker' : 'category-financier');
        const categoryDisplay = `<div class="achievement-category ${categoryClass}">${category}</div>`;
        div.innerHTML = `🏆${nameDisplay}${categoryDisplay}`;

        // Add swipe-to-delete functionality
        if (unlocked) {
            addSwipeToDelete(div, key);

            // Add double-click to replay
            div.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                replayAchievement(key);
            });
        }

        achievementsDiv.appendChild(div);
    }
}

function addSwipeToDelete(element, achievementKey) {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    element.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        element.style.transition = 'none';
        element.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        currentX = e.clientX - startX;
        element.style.transform = `translateX(${currentX}px) rotate(${currentX * 0.1}deg)`;
    });

    document.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        element.style.cursor = 'help';

        // If swiped more than 100px in either direction, delete it
        if (Math.abs(currentX) > 100) {
            element.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
            element.style.transform = `translateX(${currentX > 0 ? '200%' : '-200%'}) rotate(${currentX > 0 ? '45deg' : '-45deg'})`;
            element.style.opacity = '0';

            setTimeout(() => {
                achievements[achievementKey] = false;
                saveAchievements();
                displayAchievements();
            }, 300);
        } else {
            // Snap back
            element.style.transition = 'transform 0.3s ease-out';
            element.style.transform = 'translateX(0) rotate(0)';
        }
    });
}

function unlockAchievement(name, id, isNewlyUnlocked) {
    // Only show toast if newly unlocked
    if (!isNewlyUnlocked) {
        return;
    }

    // Determine achievement type and color
    const hackerAchievements = ['tripleDip', 'bobTheRobber', 'raceConditionMaster'];
    const bankAchievements = ['moneyPrinter', 'fatBanker'];
    const innocentAchievements = ['firstSteps', 'byTheBook'];

    const message = `🏆 Achievement Unlocked: ${name}`;

    new SnackBar({
        message: message,
        status: hackerAchievements.includes(id) ? 'danger' : (bankAchievements.includes(id) ? 'warning' : (innocentAchievements.includes(id) ? 'info' : 'success'))
    });

    saveAchievements();
    displayAchievements();
}


function resetTransaction() {
    pendingBalance = null;
    bobBalance = null;
    lastReadBalance = null;
    operationsSinceLastRead = 0;
    transactionStartBalance = null;
    displayedBalance = '???';
    bobOperations = [];
    bankOperations = [];
    bobOperationBalances = [];
    totalOperationsInTransaction = 0;
    allBobOperations = [];
    pendingUpdates = [];
    appliedUpdateIndices.clear();
    bobOpsDiv.innerHTML = '';
    bankOpsDiv.innerHTML = '';
    updateDisplay();
    updateButtonStates();
    updateDropdownList();

    // Restart recording if there are still achievements to unlock
    if (Object.values(achievements).some(val => !val)) {
        startRecording();
    }
}