document.addEventListener('DOMContentLoaded', function() {
    // Track animation state
    let animationRunning = true;
    let animationId = null;

    // Explicit pause/resume functions
    function pauseParticles() {
        console.debug('Particle system paused');
        if (animationRunning) {
            cancelAnimationFrame(animationId);
            animationRunning = false;
        }
    }

    function resumeParticles() {
        console.debug('Particle system resumed');
        if (!animationRunning) {
            animationId = requestAnimationFrame(animate);
            animationRunning = true;
        }
    }

    // Expose pause/resume functions globally if needed
    window.pauseParticles = pauseParticles;
    window.resumeParticles = resumeParticles;

    // Initial load handler
    // Resume particles when clicking outside iframes
    document.addEventListener('click', (e) => {
        const clickedOnIframe = e.target.closest('iframe.youtube-embed');
        if (!clickedOnIframe && !animationRunning) {
            resumeParticles();
        }
    });

    // Initialize load screen elements
    const initialLoad = document.getElementById('initial-load');
    const clickToStart = document.getElementById('click-to-start');

    // Initialize canvas with safety checks
    const canvas = document.getElementById('particles');
    if (!canvas) {
        console.error('Particle canvas not found');
        initialLoad.remove();
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get canvas context');
        initialLoad.remove();
        return;
    }

    // Disable interaction initially
    canvas.style.pointerEvents = 'none';

    // Add subtle pulse animation to button
    clickToStart.style.animation = 'pulse 2s infinite';

    // Set initial body state
    document.body.classList.add('loading');

    function startTransition() {
        // Only run once
        if (document.body.classList.contains('loaded')) return;

        // Disable button and show loading state if button exists
        if (clickToStart) {
            clickToStart.disabled = true;
            clickToStart.style.cursor = 'wait';
            clickToStart.textContent = 'LOADING...';
            clickToStart.style.animation = 'none';
        }

        // Fade out initial load screen
        initialLoad.classList.add('hidden');

        // Delay adding the loaded class to allow fade-out to complete
        setTimeout(() => {
            // Mark body as loaded
            document.body.classList.remove('loading');
            document.body.classList.add('loaded');
        }, 1500); // Match the fade-out duration

        // Enable mouse interaction with particles
        canvas.style.pointerEvents = 'auto';

        // Start main audio playback
        if (typeof attemptPlayback === 'function') {
            attemptPlayback();
        }

        // Remove initial load screen after fade completes
        setTimeout(() => {
            initialLoad.remove();
            // Dispatch custom event for any other components
            document.dispatchEvent(new Event('initComplete'));
        }, 1500);
    }

    // Only handle click event for the button
    clickToStart.addEventListener('click', startTransition);

    // Set canvas width to window width but keep height at viewport height
    // This prevents stretching while maintaining the extended background
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Store original viewport height for particle calculations
    const viewportHeight = window.innerHeight;

    // ======================
    // WHITE PARTICLE SYSTEM
    // ======================
    const whiteParticles = [];
    const whiteParticleCount = 500;

    // Create white particles (stretched vertically)
    for (let i = 0; i < whiteParticleCount; i++) {
        whiteParticles.push({
            type: 'white',
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 4 + 2,
            speedX: Math.random() * 2 - 1,
            speedY: Math.random() * 2 - 1,
            opacity: Math.random() * 0.5 + 0.5
        });
    }

    // ======================
    // BLACK PARTICLE SYSTEM (vertically compressed)
    // ======================
    const blackParticles = [];
    const blackParticleCount = 2000; // Increased particle count

    // Create black particles (vertically compressed, overlapping white)
    for (let i = 0; i < blackParticleCount; i++) {
        blackParticles.push({
            type: 'black',
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 1,
            speedX: (Math.random() * 4 - 2) * 0.5,
            speedY: (Math.random() * 4 - 2) * 0.5,
            opacity: Math.random() * 0.3 + 0.5
        });
    }

    // Enhanced mouse tracking with stronger effects
    const mouse = {
        x: null,
        y: null,
        radius: 550  // Increased interaction radius for more noticeable effect
    };

    function trackMouse(e) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    }

    document.addEventListener('mousemove', trackMouse);
    document.addEventListener('mouseenter', trackMouse);
    document.addEventListener('mouseout', () => {
        mouse.x = null;
        mouse.y = null;
    });

    // Animation loop
    function animate() {
        if (!animationRunning) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        function updateParticle(p, isBlackParticle = false) {

            // MOUSE INTERACTION (both types)
            if (mouse.x !== null && mouse.y !== null) {
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < mouse.radius) {
                    const force = (mouse.radius - distance) / 15;
                    const angle = Math.atan2(dy, dx);
                    p.x += Math.cos(angle) * force * 3;
                    p.y += Math.sin(angle) * force * 3;
                }
            }

            // POSITION UPDATE
            p.x += p.speedX;
            p.y += p.speedY;

            // X-axis wrapping (both types)
            if (p.x > canvas.width + p.size) p.x = -p.size;
            if (p.x < -p.size) p.x = canvas.width + p.size;

            // Y-axis bounds (both types)
            if (p.y > viewportHeight + p.size) {
                p.y = viewportHeight - p.size;
                p.speedY *= -0.8;
            }
            if (p.y < -p.size) {
                p.y = p.size;
                p.speedY *= -0.8;
            }

            // PARTICLE RENDERING
            ctx.beginPath();
            if (isBlackParticle) {
                // Save current transform state
                ctx.save();
                // Reset transform to identity matrix
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                // Calculate position relative to viewport
                const viewportY = p.y % window.innerHeight;
                // Draw vertically compressed black particles
                const verticalScale = 4; // % of original height (more compressed)
                ctx.ellipse(p.x, viewportY, p.size, p.size * verticalScale, 0, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 0, 0, ${p.opacity})`; // Black color
                ctx.fill();
                // Restore transform state
                ctx.restore();
            } else {
                // White particles - stretched vertically
                ctx.arc(p.x, p.y, p.size / 4, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
                ctx.fill();
            }

            // Ensure black particles always overlap white
            if (isBlackParticle) {
                ctx.globalCompositeOperation = 'source-over';
            }
        }

        // ===================================
        // DRAW WHITE PARTICLES (BACKGROUND)
        // ===================================
        whiteParticles.forEach(p => {
            ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
            updateParticle(p);
        });

        // ===================================
        // DRAW BLACK PARTICLES (vertically compressed)
        // Always drawn on top of white particles
        // ===================================
        blackParticles.forEach(p => {
            ctx.fillStyle = `rgba(0, 0, 0, ${p.opacity})`; // Black color
            updateParticle(p, true); // true = is black particle
        });

        animationId = requestAnimationFrame(animate);
    }

    // Move animate function to global scope
    window.animate = animate;

    // Start animation
    animationId = requestAnimationFrame(animate);

    // Handle window resize
    window.addEventListener('resize', function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
});
