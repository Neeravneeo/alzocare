/**
 * N-Back Memory Game Component
 * 
 * A cognitive assessment tool that tests working memory by asking users to identify
 * when the current stimulus matches the one shown n steps back in the sequence.
 * 
 * @author Zen Coder
 * @version 1.0.0
 */

/**
 * Initialize the N-Back Memory Game component
 * 
 * @param {HTMLElement} containerEl - The container element to render the game in
 * @param {Object} options - Configuration options
 * @param {number} options.nValue - N value for the test (default: 1)
 * @param {number} options.sequenceLength - Number of stimuli in the sequence (default: 20)
 * @param {number} options.stimulusDuration - Duration to show each stimulus in ms (default: 1500)
 * @param {number} options.interStimulusInterval - Time between stimuli in ms (default: 500)
 * @param {Function} options.onComplete - Callback when test is completed with score object
 * @returns {Object} - API for controlling the game
 * 
 * @example
 * // Basic initialization
 * const nbackGame = NBackMemoryGame.init(document.getElementById('game-container'), {
 *   onComplete: (score) => console.log(`N-back test completed with ${score.correct} correct responses`)
 * });
 * 
 * // With custom options
 * const nbackGame = NBackMemoryGame.init(document.getElementById('game-container'), {
 *   nValue: 2,
 *   sequenceLength: 30,
 *   stimulusDuration: 2000,
 *   onComplete: (score) => {
 *     console.log(`N-back test completed with ${score.correct} correct and ${score.missed} missed responses`);
 *     // Save results to server
 *     saveResults('nback-test', score);
 *   }
 * });
 */
const NBackMemoryGame = (function() {
  // Private variables
  let container, canvas, ctx;
  let sequence = [];
  let currentIndex = -1;
  let timer = null;
  let completeCallback;
  let instructions, startButton, matchButton, scoreDisplay;
  let gameStarted = false;
  let gameCompleted = false;
  let score = {
    correct: 0,
    incorrect: 0,
    missed: 0,
    total: 0
  };
  let nValue = 1;
  let sequenceLength = 20;
  let stimulusDuration = 1500;
  let interStimulusInterval = 500;
  
  // Constants
  const SHAPES = ['square', 'circle', 'triangle'];
  const COLORS = {
    square: '#57B5E7',   // Primary blue
    circle: '#8DD3C7',   // Secondary teal
    triangle: '#FF9F7F', // Coral
    background: '#F9FAFB'
  };
  
  /**
   * Generate a random sequence of shapes
   * @param {number} length - Length of sequence
   * @returns {Array} - Array of shape names
   */
  function generateSequence(length) {
    const seq = [];
    
    // Generate initial sequence
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * SHAPES.length);
      seq.push(SHAPES[randomIndex]);
    }
    
    // Ensure there are some matches (about 30% of the time after the first n items)
    const matchCount = Math.floor((length - nValue) * 0.3);
    for (let i = 0; i < matchCount; i++) {
      // Pick a random position to create a match (after the first n items)
      const matchPos = nValue + Math.floor(Math.random() * (length - nValue));
      // Set the current item to match the item n positions back
      seq[matchPos] = seq[matchPos - nValue];
    }
    
    return seq;
  }
  
  /**
   * Draw the current shape on the canvas
   * @param {string} shape - Shape name ('square', 'circle', or 'triangle')
   */
  function drawShape(shape) {
    if (!ctx) return;
    
    // Clear canvas
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const size = Math.min(canvas.width, canvas.height) * 0.3;
    
    ctx.fillStyle = COLORS[shape];
    
    switch (shape) {
      case 'square':
        ctx.fillRect(centerX - size / 2, centerY - size / 2, size, size);
        break;
        
      case 'circle':
        ctx.beginPath();
        ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - size / 2);
        ctx.lineTo(centerX + size / 2, centerY + size / 2);
        ctx.lineTo(centerX - size / 2, centerY + size / 2);
        ctx.closePath();
        ctx.fill();
        break;
    }
  }
  
  /**
   * Clear the canvas
   */
  function clearCanvas() {
    if (!ctx) return;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  /**
   * Show the next shape in the sequence
   */
  function showNextShape() {
    currentIndex++;
    
    // Check if sequence is complete
    if (currentIndex >= sequence.length) {
      completeGame();
      return;
    }
    
    // Draw current shape
    const currentShape = sequence[currentIndex];
    drawShape(currentShape);
    
    // Check if this should be a match
    if (currentIndex >= nValue) {
      const isMatch = sequence[currentIndex] === sequence[currentIndex - nValue];
      score.total += isMatch ? 1 : 0;
    }
    
    // Schedule next shape after a delay
    timer = setTimeout(() => {
      clearCanvas();
      
      // Brief pause before next shape
      timer = setTimeout(showNextShape, interStimulusInterval);
    }, stimulusDuration);
    
    // Update score display
    updateScoreDisplay();
  }
  
  /**
   * Handle match button click
   */
  function handleMatchClick() {
    if (!gameStarted || gameCompleted || currentIndex < nValue) return;
    
    // Check if current shape matches the one n positions back
    const isMatch = sequence[currentIndex] === sequence[currentIndex - nValue];
    
    if (isMatch) {
      score.correct++;
    } else {
      score.incorrect++;
    }
    
    // Visual feedback
    matchButton.classList.add(isMatch ? 'bg-green-500' : 'bg-red-500');
    matchButton.classList.remove('bg-primary');
    
    setTimeout(() => {
      matchButton.classList.remove(isMatch ? 'bg-green-500' : 'bg-red-500');
      matchButton.classList.add('bg-primary');
    }, 300);
    
    // Update score display
    updateScoreDisplay();
  }
  
  /**
   * Update the score display
   */
  function updateScoreDisplay() {
    if (!scoreDisplay) return;
    
    scoreDisplay.innerHTML = `
      <div class="flex justify-between w-full">
        <div class="text-center">
          <div class="text-green-500 font-bold">${score.correct}</div>
          <div class="text-xs text-gray-500">Correct</div>
        </div>
        <div class="text-center">
          <div class="text-red-500 font-bold">${score.incorrect}</div>
          <div class="text-xs text-gray-500">Incorrect</div>
        </div>
        <div class="text-center">
          <div class="text-orange-500 font-bold">${score.missed}</div>
          <div class="text-xs text-gray-500">Missed</div>
        </div>
      </div>
    `;
  }
  
  /**
   * Complete the game and show results
   */
  function completeGame() {
    gameCompleted = true;
    clearTimeout(timer);
    
    // Calculate missed matches
    let totalMatches = 0;
    for (let i = nValue; i < sequence.length; i++) {
      if (sequence[i] === sequence[i - nValue]) {
        totalMatches++;
      }
    }
    score.missed = totalMatches - score.correct;
    
    // Update final score display
    updateScoreDisplay();
    
    // Create results display
    const resultsElement = document.createElement('div');
    resultsElement.className = 'mt-4 p-4 bg-white rounded-lg shadow-sm text-center w-full';
    
    // Calculate percentage score
    const totalPossible = totalMatches;
    const percentageScore = totalPossible > 0 ? Math.round((score.correct / totalPossible) * 100) : 0;
    
    resultsElement.innerHTML = `
      <p class="font-bold text-lg">Test Complete</p>
      <div class="mt-2 grid grid-cols-2 gap-4">
        <div>
          <p class="text-sm text-gray-600">Correct Matches</p>
          <p class="font-bold text-green-500">${score.correct} / ${totalMatches}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600">Score</p>
          <p class="font-bold text-primary">${percentageScore}%</p>
        </div>
        <div>
          <p class="text-sm text-gray-600">Incorrect Responses</p>
          <p class="font-bold text-red-500">${score.incorrect}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600">Missed Matches</p>
          <p class="font-bold text-orange-500">${score.missed}</p>
        </div>
      </div>
    `;
    container.appendChild(resultsElement);
    
    // Show reset button
    startButton.textContent = 'Try Again';
    startButton.style.display = 'block';
    matchButton.style.display = 'none';
    
    // Call completion callback
    if (typeof completeCallback === 'function') {
      completeCallback({
        correct: score.correct,
        incorrect: score.incorrect,
        missed: score.missed,
        total: totalMatches,
        percentageScore
      });
    }
  }
  
  /**
   * Create UI controls for the game
   */
  function createControls() {
    // Create instructions
    instructions = document.createElement('div');
    instructions.className = 'mt-4 text-center text-gray-700 w-full';
    instructions.innerHTML = `
      <p class="font-medium">Press the button when you see a shape that matches the one shown ${nValue} step${nValue !== 1 ? 's' : ''} ago</p>
      <p class="text-sm mt-1">Each shape will appear for ${stimulusDuration/1000} seconds</p>
    `;
    container.appendChild(instructions);
    
    // Create score display
    scoreDisplay = document.createElement('div');
    scoreDisplay.className = 'mt-4 p-3 bg-white rounded-lg shadow-sm w-full';
    updateScoreDisplay();
    container.appendChild(scoreDisplay);
    
    // Create start button
    startButton = document.createElement('button');
    startButton.className = 'mt-4 bg-primary text-white px-6 py-2 rounded-button font-semibold hover:bg-primary/90 w-full';
    startButton.textContent = 'Start Test';
    startButton.addEventListener('click', startGame);
    container.appendChild(startButton);
    
    // Create match button (initially hidden)
    matchButton = document.createElement('button');
    matchButton.className = 'mt-4 bg-primary text-white px-6 py-3 rounded-button font-semibold hover:bg-primary/90 w-full text-lg';
    matchButton.textContent = 'Match!';
    matchButton.style.display = 'none';
    matchButton.addEventListener('click', handleMatchClick);
    container.appendChild(matchButton);
  }
  
  /**
   * Start the game
   */
  function startGame() {
    // Reset game state
    currentIndex = -1;
    score = {
      correct: 0,
      incorrect: 0,
      missed: 0,
      total: 0
    };
    gameStarted = true;
    gameCompleted = false;
    clearTimeout(timer);
    
    // Generate new sequence
    sequence = generateSequence(sequenceLength);
    
    // Update UI
    startButton.style.display = 'none';
    matchButton.style.display = 'block';
    updateScoreDisplay();
    
    // Remove results element if exists
    const resultsElement = container.querySelector('div:last-child');
    if (resultsElement !== matchButton && resultsElement !== startButton && 
        resultsElement !== scoreDisplay && resultsElement !== instructions) {
      resultsElement.remove();
    }
    
    // Start showing shapes
    clearCanvas();
    setTimeout(showNextShape, 1000);
  }
  
  /**
   * Reset the game
   */
  function reset() {
    clearTimeout(timer);
    clearCanvas();
    
    // Reset UI
    startButton.textContent = 'Start Test';
    startButton.style.display = 'block';
    matchButton.style.display = 'none';
    
    // Reset game state
    gameStarted = false;
    gameCompleted = false;
    currentIndex = -1;
    score = {
      correct: 0,
      incorrect: 0,
      missed: 0,
      total: 0
    };
    updateScoreDisplay();
    
    // Remove results element if exists
    const resultsElement = container.querySelector('div:last-child');
    if (resultsElement !== matchButton && resultsElement !== startButton && 
        resultsElement !== scoreDisplay && resultsElement !== instructions) {
      resultsElement.remove();
    }
  }
  
  /**
   * Initialize the game
   * @param {HTMLElement} containerEl - Container element
   * @param {Object} options - Game options
   */
  function init(containerEl, options = {}) {
    // Set default options
    const defaultOptions = {
      nValue: 1,
      sequenceLength: 20,
      stimulusDuration: 1500,
      interStimulusInterval: 500,
      onComplete: null
    };
    
    const gameOptions = { ...defaultOptions, ...options };
    
    // Store references and options
    container = containerEl;
    container.classList.add('flex', 'flex-col', 'items-center', 'p-4');
    completeCallback = gameOptions.onComplete;
    nValue = gameOptions.nValue;
    sequenceLength = gameOptions.sequenceLength;
    stimulusDuration = gameOptions.stimulusDuration;
    interStimulusInterval = gameOptions.interStimulusInterval;
    
    // Create canvas
    canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    canvas.className = 'border border-gray-300 rounded-lg bg-white';
    container.appendChild(canvas);
    
    ctx = canvas.getContext('2d');
    clearCanvas();
    
    // Create UI controls
    createControls();
    
    // Return public API
    return {
      reset,
      getScore: () => ({ ...score })
    };
  }
  
  // Public API
  return {
    init
  };
})();

// Export as ES module
export default NBackMemoryGame;