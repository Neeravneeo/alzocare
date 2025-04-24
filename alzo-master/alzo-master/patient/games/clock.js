/**
 * Clock-Drawing Game Component
 * 
 * A cognitive assessment tool that asks users to set an analog clock to a specific time.
 * This test evaluates visuospatial abilities, executive function, and fine motor skills.
 * 
 * @author Zen Coder
 * @version 1.0.0
 */

/**
 * Initialize the Clock-Drawing Game component
 * 
 * @param {HTMLElement} containerEl - The container element to render the game in
 * @param {Object} options - Configuration options
 * @param {string} options.targetTime - The time to set (default: "10:55" for "5 minutes to 11")
 * @param {number} options.clockSize - The diameter of the clock in pixels (default: 300)
 * @param {Function} options.onComplete - Callback when test is completed with score parameter
 * @returns {Object} - API for controlling the game
 * 
 * @example
 * // Basic initialization
 * const clockGame = ClockDrawingGame.init(document.getElementById('game-container'), {
 *   onComplete: (score) => console.log(`Clock test completed with score: ${score}`)
 * });
 * 
 * // With custom options
 * const clockGame = ClockDrawingGame.init(document.getElementById('game-container'), {
 *   targetTime: "10:10", // 10 past 10
 *   clockSize: 400,
 *   onComplete: (score) => {
 *     console.log(`Clock test completed with score: ${score}`);
 *     // Save results to server
 *     saveResults('clock-test', score);
 *   }
 * });
 */
const ClockDrawingGame = (function() {
  // Private variables
  let svg, hourHand, minuteHand, clockFace;
  let isDraggingHour = false;
  let isDraggingMinute = false;
  let clockCenterX, clockCenterY, clockRadius;
  let targetHourAngle, targetMinuteAngle;
  let currentHourAngle = 0;
  let currentMinuteAngle = 0;
  let container, completeCallback;
  let submitButton;
  let instructions;
  let targetTime;
  
  // Constants
  const HOUR_HAND_LENGTH_RATIO = 0.5;   // Hour hand is 50% of clock radius
  const MINUTE_HAND_LENGTH_RATIO = 0.8; // Minute hand is 80% of clock radius
  const HOUR_HAND_WIDTH = 8;            // Hour hand width in pixels
  const MINUTE_HAND_WIDTH = 4;          // Minute hand width in pixels
  const TOLERANCE_DEGREES = 5;          // Tolerance in degrees for hand placement
  
  /**
   * Calculate angle for clock hands based on time
   * @param {number} unit - Hour (0-12) or minute (0-60)
   * @param {boolean} isHour - Whether calculating for hour or minute hand
   * @returns {number} - Angle in degrees
   */
  function calculateAngle(unit, isHour) {
    if (isHour) {
      // Each hour is 30 degrees (360 / 12)
      return ((unit % 12) * 30) - 90; // -90 to start at 12 o'clock
    } else {
      // Each minute is 6 degrees (360 / 60)
      return (unit * 6) - 90; // -90 to start at 12 o'clock
    }
  }
  
  /**
   * Parse time string into hour and minute
   * @param {string} timeStr - Time in format "HH:MM"
   * @returns {Object} - Object with hour and minute properties
   */
  function parseTime(timeStr) {
    const [hourStr, minuteStr] = timeStr.split(':');
    return {
      hour: parseInt(hourStr, 10),
      minute: parseInt(minuteStr, 10)
    };
  }
  
  /**
   * Calculate score based on hand placement accuracy
   * @returns {number} - Score from 0-100
   */
  function calculateScore() {
    // Calculate difference between current and target angles
    const hourDiff = Math.abs(((currentHourAngle - targetHourAngle + 180) % 360) - 180);
    const minuteDiff = Math.abs(((currentMinuteAngle - targetMinuteAngle + 180) % 360) - 180);
    
    // Convert to percentage accuracy (100 - error percentage)
    const hourAccuracy = Math.max(0, 100 - (hourDiff / 1.8)); // 1.8 = 180/100
    const minuteAccuracy = Math.max(0, 100 - (minuteDiff / 1.8));
    
    // Weight hour and minute accuracy (hour slightly more important)
    return Math.round((hourAccuracy * 0.6) + (minuteAccuracy * 0.4));
  }
  
  /**
   * Create the clock SVG element
   * @param {number} size - Clock diameter in pixels
   */
  function createClockSVG(size) {
    // Remove any existing clock
    if (container.querySelector('svg')) {
      container.querySelector('svg').remove();
    }
    
    // Set dimensions
    clockRadius = size / 2;
    clockCenterX = clockRadius;
    clockCenterY = clockRadius;
    
    // Create SVG element
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('class', 'clock-svg');
    container.appendChild(svg);
    
    // Create clock face
    clockFace = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    clockFace.setAttribute('cx', clockCenterX);
    clockFace.setAttribute('cy', clockCenterY);
    clockFace.setAttribute('r', clockRadius - 2); // Slight padding
    clockFace.setAttribute('fill', 'white');
    clockFace.setAttribute('stroke', '#57B5E7');
    clockFace.setAttribute('stroke-width', '2');
    svg.appendChild(clockFace);
    
    // Add hour markers
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30) * (Math.PI / 180); // Convert to radians
      const markerLength = i % 3 === 0 ? 15 : 10; // Longer markers at 12, 3, 6, 9
      
      const x1 = clockCenterX + (clockRadius - markerLength) * Math.cos(angle);
      const y1 = clockCenterY + (clockRadius - markerLength) * Math.sin(angle);
      const x2 = clockCenterX + (clockRadius - 2) * Math.cos(angle);
      const y2 = clockCenterY + (clockRadius - 2) * Math.sin(angle);
      
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      marker.setAttribute('x1', x1);
      marker.setAttribute('y1', y1);
      marker.setAttribute('x2', x2);
      marker.setAttribute('y2', y2);
      marker.setAttribute('stroke', '#333');
      marker.setAttribute('stroke-width', i % 3 === 0 ? '3' : '2');
      svg.appendChild(marker);
      
      // Add numbers for 12, 3, 6, 9
      if (i % 3 === 0) {
        const numX = clockCenterX + (clockRadius - 30) * Math.cos(angle);
        const numY = clockCenterY + (clockRadius - 30) * Math.sin(angle);
        
        const num = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        num.setAttribute('x', numX);
        num.setAttribute('y', numY);
        num.setAttribute('text-anchor', 'middle');
        num.setAttribute('dominant-baseline', 'middle');
        num.setAttribute('font-size', '18');
        num.setAttribute('font-weight', 'bold');
        num.setAttribute('fill', '#333');
        num.textContent = i === 0 ? '12' : (i / 3).toString();
        svg.appendChild(num);
      }
    }
    
    // Create hour hand
    hourHand = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    hourHand.setAttribute('x1', clockCenterX);
    hourHand.setAttribute('y1', clockCenterY);
    hourHand.setAttribute('x2', clockCenterX);
    hourHand.setAttribute('y2', clockCenterY - (clockRadius * HOUR_HAND_LENGTH_RATIO));
    hourHand.setAttribute('stroke', '#333');
    hourHand.setAttribute('stroke-width', HOUR_HAND_WIDTH);
    hourHand.setAttribute('stroke-linecap', 'round');
    hourHand.classList.add('hour-hand');
    hourHand.style.cursor = 'pointer';
    svg.appendChild(hourHand);
    
    // Create minute hand
    minuteHand = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    minuteHand.setAttribute('x1', clockCenterX);
    minuteHand.setAttribute('y1', clockCenterY);
    minuteHand.setAttribute('x2', clockCenterX);
    minuteHand.setAttribute('y2', clockCenterY - (clockRadius * MINUTE_HAND_LENGTH_RATIO));
    minuteHand.setAttribute('stroke', '#666');
    minuteHand.setAttribute('stroke-width', MINUTE_HAND_WIDTH);
    minuteHand.setAttribute('stroke-linecap', 'round');
    minuteHand.classList.add('minute-hand');
    minuteHand.style.cursor = 'pointer';
    svg.appendChild(minuteHand);
    
    // Create center dot
    const centerDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerDot.setAttribute('cx', clockCenterX);
    centerDot.setAttribute('cy', clockCenterY);
    centerDot.setAttribute('r', 5);
    centerDot.setAttribute('fill', '#333');
    svg.appendChild(centerDot);
    
    // Add event listeners for dragging
    setupDragHandlers();
  }
  
  /**
   * Set up drag event handlers for clock hands
   */
  function setupDragHandlers() {
    // Hour hand events
    hourHand.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isDraggingHour = true;
    });
    
    // Minute hand events
    minuteHand.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isDraggingMinute = true;
    });
    
    // Mouse move and up events on document
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', () => {
      isDraggingHour = false;
      isDraggingMinute = false;
    });
    
    // Touch events for mobile
    hourHand.addEventListener('touchstart', (e) => {
      e.preventDefault();
      isDraggingHour = true;
    });
    
    minuteHand.addEventListener('touchstart', (e) => {
      e.preventDefault();
      isDraggingMinute = true;
    });
    
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', () => {
      isDraggingHour = false;
      isDraggingMinute = false;
    });
  }
  
  /**
   * Handle mouse move events for dragging clock hands
   * @param {MouseEvent} e - Mouse event
   */
  function handleMouseMove(e) {
    if (!isDraggingHour && !isDraggingMinute) return;
    
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    updateHandPosition(mouseX, mouseY);
  }
  
  /**
   * Handle touch move events for dragging clock hands
   * @param {TouchEvent} e - Touch event
   */
  function handleTouchMove(e) {
    if (!isDraggingHour && !isDraggingMinute) return;
    
    const rect = svg.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    
    updateHandPosition(touchX, touchY);
    e.preventDefault();
  }
  
  /**
   * Update hand position based on pointer coordinates
   * @param {number} pointerX - X coordinate
   * @param {number} pointerY - Y coordinate
   */
  function updateHandPosition(pointerX, pointerY) {
    // Calculate angle from center to pointer
    const deltaX = pointerX - clockCenterX;
    const deltaY = pointerY - clockCenterY;
    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI) + 90;
    
    // Normalize angle to 0-360
    if (angle < 0) angle += 360;
    
    if (isDraggingHour) {
      currentHourAngle = angle;
      rotateHand(hourHand, angle, HOUR_HAND_LENGTH_RATIO);
    } else if (isDraggingMinute) {
      currentMinuteAngle = angle;
      rotateHand(minuteHand, angle, MINUTE_HAND_LENGTH_RATIO);
    }
  }
  
  /**
   * Rotate a clock hand to the specified angle
   * @param {SVGElement} hand - The hand element to rotate
   * @param {number} angle - Angle in degrees
   * @param {number} lengthRatio - Length ratio of hand to clock radius
   */
  function rotateHand(hand, angle, lengthRatio) {
    const radians = (angle - 90) * (Math.PI / 180);
    const handLength = clockRadius * lengthRatio;
    
    const endX = clockCenterX + handLength * Math.cos(radians);
    const endY = clockCenterY + handLength * Math.sin(radians);
    
    hand.setAttribute('x2', endX);
    hand.setAttribute('y2', endY);
  }
  
  /**
   * Create UI controls for the game
   */
  function createControls() {
    // Create instructions
    instructions = document.createElement('div');
    instructions.className = 'mt-4 text-center text-gray-700';
    instructions.innerHTML = `
      <p class="font-medium">Please set the clock to show <span class="text-primary font-bold">10:10</span> (10 past 10)</p>
      <p class="text-sm mt-1">Drag the hour and minute hands to position them</p>
    `;
    container.appendChild(instructions);
    
    // Create submit button
    submitButton = document.createElement('button');
    submitButton.className = 'mt-4 bg-primary text-white px-6 py-2 rounded-button font-semibold hover:bg-primary/90 w-full';
    submitButton.textContent = 'Submit';
    submitButton.addEventListener('click', handleSubmit);
    container.appendChild(submitButton);
  }
  
  /**
   * Handle submit button click
   */
  function handleSubmit() {
    const score = calculateScore();
    
    // Show result feedback
    const resultElement = document.createElement('div');
    resultElement.className = 'mt-4 text-center';
    
    if (score >= 90) {
      resultElement.innerHTML = `
        <p class="text-green-600 font-bold">Excellent!</p>
        <p class="text-sm">Your clock setting was very accurate.</p>
      `;
    } else if (score >= 70) {
      resultElement.innerHTML = `
        <p class="text-blue-600 font-bold">Good job!</p>
        <p class="text-sm">Your clock setting was mostly accurate.</p>
      `;
    } else {
      resultElement.innerHTML = `
        <p class="text-orange-600 font-bold">Nice try!</p>
        <p class="text-sm">The clock setting could be more accurate.</p>
      `;
    }
    
    container.appendChild(resultElement);
    
    // Disable further interaction
    hourHand.style.pointerEvents = 'none';
    minuteHand.style.pointerEvents = 'none';
    submitButton.disabled = true;
    submitButton.classList.add('opacity-50');
    
    // Call completion callback
    if (typeof completeCallback === 'function') {
      completeCallback(score);
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
      targetTime: '10:10', // 10 past 10
      clockSize: 300,
      onComplete: null
    };
    
    const gameOptions = { ...defaultOptions, ...options };
    
    // Store references
    container = containerEl;
    container.classList.add('flex', 'flex-col', 'items-center', 'p-4');
    completeCallback = gameOptions.onComplete;
    targetTime = gameOptions.targetTime;
    
    // Parse target time
    const { hour, minute } = parseTime(targetTime);
    targetHourAngle = calculateAngle(hour + (minute / 60), true); // Hour hand moves slightly with minutes
    targetMinuteAngle = calculateAngle(minute, false);
    
    // Create clock and controls
    createClockSVG(gameOptions.clockSize);
    createControls();
    
    // Update instructions with target time
    const timeText = targetTime === '10:55' ? '5 minutes to 11' : 
                    (targetTime === '10:10' ? '10 past 10' : targetTime);
    instructions.querySelector('p').innerHTML = `
      Please set the clock to show <span class="text-primary font-bold">${timeText}</span>
    `;
    
    // Return public API
    return {
      reset: () => {
        // Reset hands to 12 o'clock
        rotateHand(hourHand, 0, HOUR_HAND_LENGTH_RATIO);
        rotateHand(minuteHand, 0, MINUTE_HAND_LENGTH_RATIO);
        currentHourAngle = 0;
        currentMinuteAngle = 0;
        
        // Remove result element if exists
        const resultElement = container.querySelector('div:last-child');
        if (resultElement !== submitButton && resultElement !== instructions) {
          resultElement.remove();
        }
        
        // Re-enable interaction
        hourHand.style.pointerEvents = 'auto';
        minuteHand.style.pointerEvents = 'auto';
        submitButton.disabled = false;
        submitButton.classList.remove('opacity-50');
      },
      getScore: calculateScore
    };
  }
  
  // Public API
  return {
    init
  };
})();

// Export as ES module
export default ClockDrawingGame;