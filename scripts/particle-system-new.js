class ParticleSystem {
    constructor() {
        // Get canvas element
        this.canvas = document.getElementById('particles');
        if (!this.canvas) return;
        
        // Get canvas context
        this.ctx = this.canvas.getContext('2d', {
            alpha: false,
            desynchronized: true
        });
        if (!this.ctx) return;

        // Detect monitor refresh rate
        this.detectRefreshRate().then(refreshRate => {
            console.debug('Detected refresh rate:', refreshRate);
            this.fpsMonitoring.maxFps = refreshRate;
            this.fpsMonitoring.targetFps = refreshRate;
        });

        // Performance monitoring
        this.fpsMonitoring = {
            lastTimestamp: 0,
            frameCount: 0,
            currentFps: 60,
            fpsHistory: [],
            historySize: 10,
            targetFps: 60, // Will match refresh rate
            particleRemovalRate: 5,
            lastParticleAdjustment: 0,
            adjustmentInterval: 500, // ms between particle count adjustments
            maxFps: 60, // Will match refresh rate
            minFps: 30
        };

        // Physics constants (using scaled values for visual effect)
        this.dt = 0.04;
        this.G = 6.67430e-11;
        this.c = 2.99792458e8;
        this.scale_factor = 1e-8;
        this.M_solar = 1.98847e30;
        this.M_bullet = 10 * this.M_solar;
        this.R_sun = 696340000;

        // Derived values
        this.Rs = this.calculateEventHorizonRadius(this.M_bullet);
        this.R_isco = this.calculateISCO(this.M_bullet);
        this.R_photon = this.calculatePhotonSphereRadius(this.M_bullet);

        // Visualization settings
        this.blackHoleRadius = 40;
        this.visualScale = this.blackHoleRadius / this.Rs;
        
        // Calculate particle size
        const scaled_star_radius = (this.R_sun / this.Rs) * this.blackHoleRadius;
        this.particleSize = Math.max(0.8, Math.min(1.2, scaled_star_radius * 0.015));

        // Particle management settings
        this.particles = [];
        this.baseMaxParticles = 300; // Max particles
        this.maxParticles = this.calculateMaxParticles();
        this.targetParticles = Math.floor(this.maxParticles * 0.9); // Higher target density
        this.particleColor = 'rgba(255, 255, 255, 0.85)';
        this.isRunning = false;
        
        // Animation frame tracking
        this.animationFrameId = null;
        
        // Spawn control
        this.spawnRate = 2.5; // Increased spawn rate further
        this.spawnAccumulator = 0;
        this.lastSpawnTime = 0;
        this.spawnInterval = 100; // Even faster spawning

        // Mouse tracking
        this.mouse = { x: this.canvas.width / 2, y: this.canvas.height / 2 };

        // Get DOM elements
        this.initialLoad = document.getElementById('initial-load');
        this.clickToStart = document.getElementById('click-to-start');
        this.mainContent = document.getElementById('main-content');

        // Initialize
        window.addEventListener('resize', () => this.resizeCanvas());
        this.resizeCanvas();
        this.initParticles();
        this.setupEventListeners();
    }

    // Calculate maximum particles based on screen size and device performance
    calculateMaxParticles() {
        const screenArea = window.innerWidth * window.innerHeight;
        const baseArea = 1920 * 1080; // Reference resolution
        const scaleFactor = Math.min(1.2, Math.max(0.5, screenArea / baseArea));
        return Math.floor(this.baseMaxParticles * scaleFactor);
    }

    // Modify addParticles to support radial initial spawn
    addParticles(count, isInitialSpawn = false) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Calculate maximum safe spawn radius based on screen dimensions
        const screenRadius = Math.min(width, height) / 2;
        const safeRadius = screenRadius * 0.95; // Increased spawn area coverage
        
        for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
            // Use consistent spawn radius for all particles
            const angle = Math.random() * Math.PI * 2;
            
            // Scale spawn distances to screen size - increased both min and max distances
            const min_spawn_distance = Math.min(this.R_isco * 15 * this.visualScale, safeRadius * 0.2);
            const max_spawn_distance = Math.min(this.R_isco * 90 * this.visualScale, safeRadius);
            
            // Use sqrt for better radial distribution
            const r = (min_spawn_distance + (max_spawn_distance - min_spawn_distance) * Math.sqrt(Math.random()));
            
            // Add more variation to prevent uniform distribution
            const angle_variation = (Math.random() - 0.5) * 0.3;
            const final_angle = angle + angle_variation;
            
            const size_variation = 0.5 + Math.random();
            const particle_size = this.particleSize * size_variation;

            // Calculate initial orbital velocity - slightly reduced for better visual at larger radius
            const v_orbital = Math.sqrt((this.G * this.M_bullet) / (r / this.visualScale));
            const scaledVelocity = v_orbital * this.scale_factor * 0.6; // Adjusted velocity scaling
            const velocityAngle = final_angle + Math.PI / 2; // Tangential velocity

            // Add color variation for visual interest
            const colorVariation = Math.floor(200 + Math.random() * 55);
            const alphaVariation = 0.85 + Math.random() * 0.15;
            const particleColor = `rgba(255, 255, ${colorVariation}, ${alphaVariation})`;

            this.particles.push({
                x: width/2 + r * Math.cos(final_angle),
                y: height/2 + r * Math.sin(final_angle),
                vx: scaledVelocity * Math.cos(velocityAngle),
                vy: scaledVelocity * Math.sin(velocityAngle),
                size: particle_size,
                color: particleColor
            });
        }
    }

    // Safely remove particles
    removeParticles(count) {
        const removeCount = Math.min(count, this.particles.length - 100); // Keep at least 100 particles
        if (removeCount > 0) {
            this.particles.splice(this.particles.length - removeCount, removeCount);
        }
    }

    // Initialize particles with no initial spawn
    initParticles() {
        this.particles = [];
        this.maxParticles = this.calculateMaxParticles();
        this.targetParticles = Math.floor(this.maxParticles * 0.8); // Target 80% of max for steady state
        // No initial particle spawn - they will spawn gradually
    }

    resizeCanvas() {
        if (!this.canvas) {
            console.error('[ERROR] Canvas not found during resize');
            return;
        }

        // Get the window dimensions
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Set canvas size to match window
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Ensure canvas is visible and properly sized
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;

        // Reset mouse position to center after resize
        this.mouse.x = width / 2;
        this.mouse.y = height / 2;

        // Reinitialize particles for new dimensions
        this.initParticles();
    }

    ensureInitialState() {
        if (this.initialLoad) {
            this.initialLoad.classList.remove('hidden');
        }

        if (this.clickToStart) {
            this.clickToStart.disabled = false;
            this.clickToStart.style.cursor = 'pointer';
            this.clickToStart.textContent = 'ENTER';
            this.clickToStart.style.animation = 'pulse 2s infinite';
        }

        if (this.mainContent) {
            document.body.classList.remove('loaded');
        }

        if (this.canvas) {
            this.stop();
            this.resizeCanvas();
        }
    }

    setupEventListeners() {
        document.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.mouse.x = this.canvas.width / 2;
            this.mouse.y = this.canvas.height / 2;
        });

        window.addEventListener('resize', () => this.resizeCanvas());
        
        if (this.clickToStart) {
            this.clickToStart.removeEventListener('click', this.handleStartClick);
            this.clickToStart.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleStartClick(e);
            };
        } else {
            console.error('[ERROR] Click to start button not found for event listener');
        }
    }

    handleStartClick(e) {
        if (document.body.classList.contains('loaded')) {
            return;
        }

        if (this.clickToStart) {
            this.clickToStart.disabled = true;
            this.clickToStart.style.cursor = 'wait';
            this.clickToStart.textContent = 'LOADING...';
            this.clickToStart.style.animation = 'none';
            this.clickToStart.onclick = null;
        }

        this.start();

        if (this.initialLoad) {
            this.initialLoad.classList.add('hidden');
        }

        document.body.classList.add('loaded');
        
        setTimeout(() => {
            if (this.initialLoad) {
                this.initialLoad.remove();
            }
            document.dispatchEvent(new Event('initComplete'));
        }, 100);
    }

    handleResize() {
        this.resizeCanvas();
    }

    updateParticle(particle) {
        const dx = this.mouse.x - particle.x;
        const dy = this.mouse.y - particle.y;
        const distance_pixels = Math.hypot(dx, dy);
        
        if (distance_pixels < this.blackHoleRadius) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.max(600, this.blackHoleRadius * 15) * Math.sqrt(Math.random());
            particle.x = this.canvas.width/2 + r * Math.cos(angle);
            particle.y = this.canvas.height/2 + r * Math.sin(angle);
            
            const v_orbital = Math.sqrt((this.G * this.M_bullet) / (r / this.visualScale));
            const scaledVelocity = v_orbital * this.scale_factor;
            const tangentialAngle = angle + Math.PI / 2;
            particle.vx = scaledVelocity * Math.cos(tangentialAngle);
            particle.vy = scaledVelocity * Math.sin(tangentialAngle);
            return;
        }
        
        const distance_real = distance_pixels / this.visualScale;
        const force_magnitude = (this.G * this.M_bullet) / (distance_real * distance_real);
        const scaled_force = force_magnitude * this.scale_factor;
        
        const r_ratio = distance_real / this.Rs;
        const proximityFactor = r_ratio < 6 ? r_ratio / 6 : 1;
        const force = scaled_force * proximityFactor;
        
        const angle = Math.atan2(dy, dx);
        const tangentialAngle = angle + Math.PI / 2;
        const distanceFactor = r_ratio < 12 ? 0.5 + (r_ratio / 24) : 1;
        
        const forceScale = force * this.dt;
        const radialForce = forceScale * 0.85 * distanceFactor;
        const tangentialForce = forceScale * 0.32 * (1 - distanceFactor);
        
        particle.vx += Math.cos(angle) * radialForce + Math.cos(tangentialAngle) * tangentialForce;
        particle.vy += Math.sin(angle) * radialForce + Math.sin(tangentialAngle) * tangentialForce;

        const speed = Math.hypot(particle.vx, particle.vy);
        const speedLimit = this.c * this.scale_factor * (1 + (r_ratio * 0.1));
        if (speed > speedLimit) {
            const ratio = speedLimit / speed;
            particle.vx *= ratio;
            particle.vy *= ratio;
        }

        particle.x += particle.vx * this.dt;
        particle.y += particle.vy * this.dt;

        if (particle.x < 0) particle.x = this.canvas.width;
        else if (particle.x > this.canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = this.canvas.height;
        else if (particle.y > this.canvas.height) particle.y = 0;
    }

    drawParticle(particle) {
        const glow = particle.size * 2;
        const gradient = this.ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, glow
        );
        gradient.addColorStop(0, particle.color || this.particleColor);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, glow, 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fillStyle = particle.color || 'rgba(255, 255, 255, 0.95)';
        this.ctx.fill();
    }

    animate(timestamp) {
        if (!this.isRunning) return;

        // Update FPS monitoring
        this.updateFps(timestamp);

        this.updateSpawnRate(timestamp);

        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const len = this.particles.length;
        for (let i = 0; i < len; i++) {
            this.updateParticle(this.particles[i]);
            this.drawParticle(this.particles[i]);
        }

        // Draw FPS counter after particles
        this.drawFpsCounter();

        if (this.isRunning) {
            // Store the animation frame ID
            this.animationFrameId = requestAnimationFrame((t) => this.animate(t));
        }
    }

    start() {
        if (!this.isRunning) {
            if (!this.particles || this.particles.length === 0) {
                this.initParticles();
            }

            if (this.canvas) {
                this.canvas.style.display = 'block';
                this.canvas.style.opacity = '1';
            }

            // Reset animation and monitoring state
            this.isRunning = true;
            this.lastSpawnTime = performance.now();
            this.spawnAccumulator = 0;
            this.fpsMonitoring.lastTimestamp = performance.now();
            this.fpsMonitoring.frameCount = 0;
            this.fpsMonitoring.fpsHistory = [];
            
            // Start new animation frame
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
            }
            this.animationFrameId = requestAnimationFrame((t) => this.animate(t));
        }
    }

    stop() {
        // Cancel any pending animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        this.isRunning = false;
        
        if (this.canvas) {
            this.canvas.style.transition = 'opacity 0.3s ease';
            this.canvas.style.opacity = '0';
            setTimeout(() => {
                if (!this.isRunning) {
                    this.canvas.style.display = 'none';
                }
            }, 300);
        }
    }

    calculateEventHorizonRadius(M_bullet) {
        return (2 * this.G * M_bullet) / (this.c * this.c);
    }

    calculateISCO(M_bullet) {
        return (6 * this.G * M_bullet) / (this.c * this.c);
    }

    calculatePhotonSphereRadius(M_bullet) {
        return (3 * this.G * M_bullet) / (this.c * this.c);
    }

    updateSpawnRate(timestamp) {
        if (timestamp - this.lastSpawnTime < this.spawnInterval) {
            return;
        }
        this.lastSpawnTime = timestamp;

        const particleDeficit = this.maxParticles - this.particles.length;
        if (particleDeficit <= 0) return;

        // Use a constant spawn rate
        this.spawnRate = 2.5;  // Constant moderate spawn rate

        this.spawnAccumulator += this.spawnRate;
        if (this.spawnAccumulator >= 1) {
            const spawnCount = Math.floor(this.spawnAccumulator);
            this.spawnAccumulator -= spawnCount;
            this.addParticles(spawnCount);
        }
    }

    // Add FPS monitoring methods
    updateFps(timestamp) {
        const monitoring = this.fpsMonitoring;
        monitoring.frameCount++;

        // Calculate FPS every second
        const elapsed = timestamp - monitoring.lastTimestamp;
        if (elapsed >= 1000) {
            monitoring.currentFps = (monitoring.frameCount * 1000) / elapsed;
            monitoring.fpsHistory.push(monitoring.currentFps);
            if (monitoring.fpsHistory.length > monitoring.historySize) {
                monitoring.fpsHistory.shift();
            }

            // Reset counters
            monitoring.frameCount = 0;
            monitoring.lastTimestamp = timestamp;

            // Log performance metrics
            console.debug('Performance:', {
                fps: monitoring.currentFps.toFixed(1),
                particles: this.particles.length,
                avgFps: (monitoring.fpsHistory.reduce((a, b) => a + b, 0) / monitoring.fpsHistory.length).toFixed(1),
                maxFps: monitoring.maxFps
            });

            // Adjust particle count if needed
            this.adjustParticleCount(timestamp);
        }
    }

    adjustParticleCount(timestamp) {
        const monitoring = this.fpsMonitoring;
        const avgFps = monitoring.fpsHistory.reduce((a, b) => a + b, 0) / monitoring.fpsHistory.length;

        // Only adjust if enough time has passed since last adjustment
        if (timestamp - monitoring.lastParticleAdjustment < monitoring.adjustmentInterval) {
            return;
        }

        // Now compare against the exact refresh rate
        if (avgFps < monitoring.maxFps && this.particles.length > 50) {
            // Remove particles to improve performance
            const removeCount = Math.min(monitoring.particleRemovalRate, this.particles.length - 50);
            this.particles.splice(this.particles.length - removeCount, removeCount);
            
            // Adjust max particles to prevent respawning
            this.maxParticles = this.particles.length;
            this.targetParticles = Math.floor(this.maxParticles * 0.9);
            
            console.debug('Reducing particles for performance:', {
                removed: removeCount,
                newTotal: this.particles.length,
                avgFps: avgFps.toFixed(1),
                targetFps: monitoring.maxFps
            });
            
            monitoring.lastParticleAdjustment = timestamp;
        }
    }

    // Add method to interpolate color
    getFpsColor(fps) {
        const { maxFps, minFps } = this.fpsMonitoring;
        // Clamp FPS between min and max
        fps = Math.max(minFps, Math.min(maxFps, fps));
        
        // Calculate how far we are between min and max (0 = min, 1 = max)
        const ratio = (fps - minFps) / (maxFps - minFps);
        
        // Interpolate between red (255,0,0) and white (255,255,255)
        const green = Math.round(255 * ratio);
        const blue = Math.round(255 * ratio);
        
        return `rgb(255,${green},${blue})`;
    }

    // Add method to draw FPS counter
    drawFpsCounter() {
        const fps = Math.round(this.fpsMonitoring.currentFps);
        const color = this.getFpsColor(fps);
        
        this.ctx.save();
        this.ctx.fillStyle = color;
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'bottom';
        
        // Increased right padding to move counter left
        const rightPadding = 50;
        const bottomPadding = 30;
        const text = `${fps} FPS`;
        this.ctx.fillText(text, this.canvas.width - rightPadding, this.canvas.height - bottomPadding);
        this.ctx.restore();
    }

    // Add refresh rate detection method
    async detectRefreshRate() {
        // Try using modern Screen Refresh Rate API
        if (window.screen && window.screen.refresh) {
            try {
                return Math.round(await window.screen.refresh);
            } catch (e) {
                console.debug('Screen Refresh Rate API failed:', e);
            }
        }

        // Fallback: Use requestAnimationFrame timing
        return new Promise(resolve => {
            let frames = 0;
            let lastTime = performance.now();
            let totalDelta = 0;
            
            const measure = (timestamp) => {
                frames++;
                totalDelta += timestamp - lastTime;
                lastTime = timestamp;

                if (frames < 60) { // Measure for 60 frames
                    requestAnimationFrame(measure);
                } else {
                    const avgDelta = totalDelta / frames;
                    const refreshRate = Math.round(1000 / avgDelta);
                    // Clamp between reasonable values (30-360Hz)
                    resolve(Math.max(30, Math.min(360, refreshRate)));
                }
            };

            requestAnimationFrame(measure);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('particles');
    if (!canvas) {
        console.error('Particle canvas not found');
        return;
    }
    console.log('Canvas found:', canvas);

    try {
        const particleSystem = new ParticleSystem();
        console.log('Particle system initialized successfully');

        window.particleSystem = particleSystem;
    } catch (error) {
        console.error('Error initializing particle system:', error);
    }
}); 