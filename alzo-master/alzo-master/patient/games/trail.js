/**
 * Trail-Making Puzzle Component
 * 
 * A cognitive assessment tool that asks users to connect numbered dots in sequence.
 * This test evaluates visual attention, task switching, and executive function.
 * 
 * @author Zen Coder
 * @version 1.0.0
 */

/**
 * Initialize the Trail-Making Puzzle component
 * 
 * @param {HTMLElement} containerEl - The container element to render the game in
 * @param {Object} options - Configuration options
 * @param {number} options.dotCount - Number of dots to connect (default: 10)
 * @param {number} options.gridSize - Size of the grid in pixels (default: 400)
 * @param {Function} options.onComplete - Callback when test is completed with results object
 * @returns {Object} - API for controlling the game
 * 
 * @example
 * // Basic initialization
 * const trailGame = TrailMakingPuzzle.init(document.getElementById('game-container'), {
 *   onComplete: (results) => console.log(`Trail test completed in ${results.time}s with ${results.errors} errors`)
 * });
 * 
 * // With custom options
 * const trailGame = TrailMakingPuzzle.init(document.getElementById('game-container'), {
 *   dotCount: 15,
 *   gridSize: 500,
 *   onComplete: (results) => {
 *     console.log(`Trail test completed in ${results.time}s with ${results.errors} errors`);
 *     // Save results to server
 *     saveResults('trail-test', results);
 *   }
 * });
 */
const TrailMakingPuzzle = (function() {
  // Private variables
  let container, canvas, ctx;
  let dots = [];
  let lines = [];
  let currentDot = 1;
  let startTime, endTime;
  let errorCount = 0;
  let isDrawing = false;
  let lastPoint = null;
  let completeCallback;
  let instructions, startButton, resetButton;
  let gameStarted = false;
  let gameCompleted = false;
  
  // Constants
  const DOT_RADIUS = 20;
  const DOT_COLOR = '#57B5E7';
  const LINE_COLOR = '#333';
  const CORRECT_COLOR = '#4CAF50';
  const ERROR_COLOR = '#F44336';
  const TEXT_COLOR = 'white';
  const MIN_DISTANCE = 60; // Minimum distance between dot centers
  
  /**
   * Generate random dots on the canvas
   * @param {number} count - Number of dots to generate
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   */
  function generateDots(count, width, height) {
    dots = [];
    const padding = DOT_RADIUS * 2;
    
    // Create dots with random positions
    for (let i = 1; i <= count; i++) {
      let x, y, overlapping;
      let attempts = 0;
      const maxAttempts = 50;
      
      // Try to find a non-overlapping position
      do {
        overlapping = false;
        x = Math.random() * (width - padding * 2) + padding;
        y = Math.random() * (height - padding * 2) + padding;
        
        // Check if too close to existing dots
        for (const dot of dots) {
          const distance = Math.sqrt(Math.pow(x - dot.x, 2) + Math.pow(y - dot.y, 2));
          if (distance < MIN_DISTANCE) {
            overlapping = true;
            break;
          }
        }
        
        attempts++;
      } while (overlapping && attempts < maxAttempts);
      
      // If we couldn't find a non-overlapping position after max attempts,
      // place it in a grid pattern as fallback
      if (attempts >= maxAttempts) {
        const gridCols = Math.ceil(Math.sqrt(count));
        const gridRows = Math.ceil(count / gridCols);
        const cellWidth = width / gridCols;
        const cellHeight = height / gridRows;
        
        const col = (i - 1) % gridCols;
        const row = Math.floor((i - 1) / gridCols);
        
        x = col * cellWidth + cellWidth / 2;
        y = row * cellHeight + cellHeight / 2;
      }
      
      dots.push({ x, y, number: i });
    }
  }
  
  /**
   * Draw the dots and lines on the canvas
   */
  function drawCanvas() {
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw lines
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    for (const line of lines) {
      ctx.beginPath();
      ctx.moveTo(line.start.x, line.start.y);
      ctx.lineTo(line.end.x, line.end.y);
      ctx.strokeStyle = line.isError ? ERROR_COLOR : LINE_COLOR;
      ctx.stroke();
    }
    
    // Draw dots
    for (const dot of dots) {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, DOT_RADIUS, 0, Math.PI * 2);
      
      // Color based on status
      if (dot.number < currentDot) {
        ctx.fillStyle = CORRECT_COLOR; // Completed dots
      } else if (dot.number === currentDot) {
        ctx.fillStyle = DOT_COLOR; // Current dot
      } else {
        ctx.fillStyle = DOT_COLOR; // Future dots
        ctx.globalAlpha = 0.7;
      }
      
      ctx.fill();
      ctx.globalAlpha = 1.0;
      
      // Draw number
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(dot.number.toString(), dot.x, dot.y);
    }
    
    // Draw current line if drawing
    if (isDrawing && lastPoint) {
      const mousePos = getMousePos(canvas, lastPoint);
      const currentDotObj = dots.find(d => d.number === currentDot - 1);
      
      if (currentDotObj) {
        ctx.beginPath();
        ctx.moveTo(currentDotObj.x, currentDotObj.y);
        ctx.lineTo(mousePos.x, mousePos.y);
        ctx.strokeStyle = LINE_COLOR;
        ctx.stroke();
      }
    }
  }
  
  /**
   * Get mouse position relative to canvas
   * @param {HTMLCanvasElement} canvas - The canvas element
   * @param {MouseEvent|Touch} evt - Mouse or touch event
   * @returns {Object} - {x, y} coordinates
   */
  function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  }
  
  /**
   * Check if a point is inside a dot
   * @param {Object} point - {x, y} coordinates
   * @param {Object} dot - Dot object with x, y, and number properties
   * @returns {boolean} - True if point is inside dot
   */
  function isPointInDot(point, dot) {
    const distance = Math.sqrt(Math.pow(point.x - dot.x, 2) + Math.pow(point.y - dot.y, 2));
    return distance <= DOT_RADIUS;
  }
  
  /**
   * Handle mouse down event
   * @param {MouseEvent} e - Mouse event
   */
  function handleMouseDown(e) {
    if (gameCompleted) return;
    
    const mousePos = getMousePos(canvas, e);
    
    // Check if clicking on the current dot
    const currentDotObj = dots.find(d => d.number === currentDot);
    if (currentDotObj && isPointInDot(mousePos, currentDotObj)) {
      isDrawing = true;
      lastPoint = e;
      
      // Start timer on first dot
      if (currentDot === 1 && !startTime) {
        startTime = new Date();
        gameStarted = true;
        
        // Hide start button, show reset button
        if (startButton) startButton.style.display = 'none';
        if (resetButton) resetButton.style.display = 'block';
      }
    }
  }
  
  /**
   * Handle mouse move event
   * @param {MouseEvent} e - Mouse event
   */
  function handleMouseMove(e) {
    if (!isDrawing || gameCompleted) return;
    lastPoint = e;
    drawCanvas();
  }
  
  /**
   * Handle mouse up event
   * @param {MouseEvent} e - Mouse event
   */
  function handleMouseUp(e) {
    if (!isDrawing || gameCompleted) return;
    
    const mousePos = getMousePos(canvas, e);
    
    // Check if released on the next dot
    const nextDotObj = dots.find(d => d.number === currentDot + 1);
    if (nextDotObj && isPointInDot(mousePos, nextDotObj)) {
      // Correct connection
      const currentDotObj = dots.find(d => d.number === currentDot);
      lines.push({
        start: { x: currentDotObj.x, y: currentDotObj.y },
        end: { x: nextDotObj.x, y: nextDotObj.y },
        isError: false
      });
      
      currentDot++;
      
      // Check if completed
      if (currentDot === dots.length) {
        endTime = new Date();
        gameCompleted = true;
        completeGame();
      }
    } else {
      // Check if released on any other dot
      const clickedDot = dots.find(d => isPointInDot(mousePos, d));
      if (clickedDot && clickedDot.number !== currentDot) {
        // Error - connected to wrong dot
        const currentDotObj = dots.find(d => d.number === currentDot);
        lines.push({
          start: { x: currentDotObj.x, y: currentDotObj.y },
          end: { x: clickedDot.x, y: clickedDot.y },
          isError: true
        });
        
        errorCount++;
        
        // Remove error line after a short delay
        setTimeout(() => {
          lines = lines.filter(line => !line.isError);
          drawCanvas();
        }, 500);
      }
    }
    
    isDrawing = false;
    drawCanvas();
  }
  
  /**
   * Handle touch events
   */
  function handleTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      handleMouseDown(e.touches[0]);
    }
  }
  
  function handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      handleMouseMove(e.touches[0]);
    }
  }
  
  function handleTouchEnd(e) {
    e.preventDefault();
    // Use the last known touch position
    if (lastPoint) {
      handleMouseUp(lastPoint);
    }
  }
  
  /**
   * Complete the game and show results
   */
  function completeGame() {
    const timeTaken = (endTime - startTime) / 1000; // in seconds
    
    // Create results display
    const resultsElement = document.createElement('div');
    resultsElement.className = 'mt-4 text-center';
    resultsElement.innerHTML = `
      <p class="text-green-600 font-bold">Completed!</p>
      <p class="text-sm">Time: ${timeTaken.toFixed(1)} seconds</p>
      <p class="text-sm">Errors: ${errorCount}</p>
    `;
    container.appendChild(resultsElement);
    
    // Call completion callback
    if (typeof completeCallback === 'function') {
      completeCallback({
        time: timeTaken,
        errors: errorCount
      });
    }
  }
  
  /**
   * Create UI controls for the game
   */
  function createControls() {
    // Create instructions
    instructions = document.createElement('div');
    instructions.className = 'mt-4 text-center text-gray-700';
    instructions.innerHTML = `
      <p class="font-medium">Connect the dots in numerical order (1→2→3...)</p>
      <p class="text-sm mt-1">Click and drag from one number to the next</p>
    `;
    container.appendChild(instructions);
    
    // Create start button
    startButton = document.createElement('button');
    startButton.className = 'mt-4 bg-primary text-white px-6 py-2 rounded-button font-semibold hover:bg-primary/90 w-full';
    startButton.textContent = 'Start Test';
    startButton.addEventListener('click', () => {
      startTime = new Date();
      gameStarted = true;
      startButton.style.display = 'none';
      resetButton.style.display = 'block';
      drawCanvas();
    });
    container.appendChild(startButton);
    
    // Create reset button (initially hidden)
    resetButton = document.createElement('button');
    resetButton.className = 'mt-4 bg-gray-500 text-white px-6 py-2 rounded-button font-semibold hover:bg-gray-600 w-full';
    resetButton.textContent = 'Reset';
    resetButton.style.display = 'none';
    resetButton.addEventListener('click', reset);
    container.appendChild(resetButton);
  }
  
  /**
   * Reset the game
   */
  function reset() {
    // Reset game state
    currentDot = 1;
    lines = [];
    errorCount = 0;
    startTime = null;
    endTime = null;
    isDrawing = false;
    lastPoint = null;
    gameStarted = false;
    gameCompleted = false;
    
    // Reset UI
    startButton.style.display = 'block';
    resetButton.style.display = 'none';
    
    // Remove results element if exists
    const resultsElement = container.querySelector('div:last-child');
    if (resultsElement !== resetButton && resultsElement !== startButton && resultsElement !== instructions) {
      resultsElement.remove();
    }
    
    // Redraw canvas
    drawCanvas();
  }
  
  /**
   * Initialize the game
   * @param {HTMLElement} containerEl - Container element
   * @param {Object} options - Game options
   */
  function init(containerEl, options = {}) {
    // Set default options
    const defaultOptions = {
      dotCount: 10,
      gridSize: 400,
      onComplete: null
    };
    
    const gameOptions = { ...defaultOptions, ...options };
    
    // Store references
    container = containerEl;
    container.classList.add('flex', 'flex-col', 'items-center', 'p-4');
    completeCallback = gameOptions.onComplete;
    
    // Create canvas
    canvas = document.createElement('canvas');
    canvas.width = gameOptions.gridSize;
    canvas.height = gameOptions.gridSize;
    canvas.className = 'border border-gray-300 rounded-lg bg-white';
    container.appendChild(canvas);
    
    ctx = canvas.getContext('2d');
    
    // Generate dots
    generateDots(gameOptions.dotCount, canvas.width, canvas.height);
    
    // Add event listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);
    
    // Create UI controls
    createControls();
    
    // Initial draw
    drawCanvas();
    
    // Return public API
    return {
      reset,
      getResults: () => ({
        time: startTime && endTime ? (endTime - startTime) / 1000 : 0,
        errors: errorCount,
        completed: gameCompleted
      })
    };
  }
  
  // Public API
  return {
    init
  };
})();

// Export as ES module
export default TrailMakingPuzzle;