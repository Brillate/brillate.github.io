document.addEventListener('DOMContentLoaded', () => {
    const thumbnailContainers = document.querySelectorAll('.youtube-thumbnail-container');
    const players = [];
    let isUserInteracting = false;
    let interactionTimeout = null;
    let particleSystemState = {
        wasRunning: true,
        spawnRate: 1,
        particleCount: 0,
        forceDisabled: false
    };

    // Debug helper
    const debugState = () => {
        console.debug('Current State:', {
            isUserInteracting,
            particleState: {
                ...particleSystemState,
                currentlyRunning: window.particleSystem?.isRunning
            },
            activeVideos: players.filter(p => p.getPlayerState && p.getPlayerState() === YT.PlayerState.PLAYING).length,
            fullscreen: !!document.fullscreenElement
        });
    };

    // Restore debounce function
    const debounce = (func, delay) => {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => func.apply(this, args), delay);
        };
    };

    // Helper function to store particle system state
    const storeParticleState = () => {
        if (window.particleSystem) {
            if (window.particleSystem.isRunning) {
                particleSystemState.wasRunning = true;
            }
            particleSystemState.spawnRate = window.particleSystem.spawnRate || 1;
            particleSystemState.particleCount = window.particleSystem.particles.length;
            debugState();
        }
    };

    // Helper function to check if we can resume particles
    const canResumeParticles = () => {
        if (!window.particleSystem || !particleSystemState.wasRunning) {
            console.debug('Cannot resume - system not initialized or was not running');
            return false;
        }

        const anyPlaying = players.some(player => 
            player.getPlayerState && player.getPlayerState() === YT.PlayerState.PLAYING
        );
        const isFullscreen = !!document.fullscreenElement;
        
        console.debug('Can resume check:', {
            anyPlaying,
            isFullscreen,
            isUserInteracting,
            forceDisabled: particleSystemState.forceDisabled,
            wasRunning: particleSystemState.wasRunning
        });
        
        return !anyPlaying && !isFullscreen && !isUserInteracting && !particleSystemState.forceDisabled;
    };

    // Enhanced particle system management
    window.pauseParticles = () => {
        if (!window.particleSystem) return;
        
        console.debug('Pausing particle system');
        storeParticleState();
        window.particleSystem.stop();
        debugState();
    };

    window.resumeParticles = () => {
        if (!window.particleSystem || !canResumeParticles()) {
            console.debug('Cannot resume particles - conditions not met');
            debugState();
            return;
        }
        
        console.debug('Resuming particle system');
        window.particleSystem.start();
        debugState();
    };

    const setUserInteracting = debounce(() => {
        console.debug('User interaction timeout complete');
        isUserInteracting = false;
        if (canResumeParticles()) {
            window.resumeParticles();
        }
    }, 2000);

    const onUserInteraction = (e) => {
        // Ignore interactions with links or within YouTube embeds
        if (e && e.target && (e.target.closest('a') || e.target.closest('iframe.youtube-embed'))) {
            return;
        }

        if (!isUserInteracting) {
            console.debug('User started interacting');
            isUserInteracting = true;
            window.pauseParticles();
        }
        setUserInteracting();
    };

    const preloadThumbnails = () => {
        thumbnailContainers.forEach(container => {
            const thumbnail = container.querySelector('.youtube-thumbnail');
            const desktopImg = new Image();
            const mobileImg = new Image();

            desktopImg.src = thumbnail.dataset.srcDesktop;
            mobileImg.src = thumbnail.dataset.srcMobile;

            if (window.innerWidth <= 767) {
                thumbnail.src = thumbnail.dataset.srcMobile;
                thumbnail.style.opacity = '0.98';
            } else {
                thumbnail.src = thumbnail.dataset.srcDesktop;
                thumbnail.style.opacity = '1';
            }
        });
    };

    const setupVideoHandlers = () => {
        thumbnailContainers.forEach(container => {
            const iframe = container.nextElementSibling;
            let playerInitialized = false;
            let player;

            const onClickHandler = () => {
                console.debug('Video thumbnail clicked');
                particleSystemState.forceDisabled = true;
                container.style.display = 'none';
                iframe.style.display = 'block';

                if (iframe.src === 'about:blank') {
                    console.debug('Loading video iframe:', iframe.dataset.src);
                    iframe.src = iframe.dataset.src;
                }

                if (!playerInitialized) {
                    console.debug('Initializing YouTube player');
                    player = new YT.Player(iframe, {
                        events: {
                            'onReady': (event) => {
                                console.debug('YouTube player ready');
                                event.target.mute();
                                event.target.setVolume(0);
                            },
                            'onStateChange': (event) => {
                                console.debug('YouTube player state changed:', event.data);
                                if (event.data === YT.PlayerState.PLAYING) {
                                    particleSystemState.forceDisabled = true;
                                    window.pauseParticles();
                                } else if (event.data === YT.PlayerState.ENDED || 
                                         event.data === YT.PlayerState.PAUSED) {
                                    particleSystemState.forceDisabled = false;
                                    if (canResumeParticles()) {
                                        window.resumeParticles();
                                    }
                                }
                            },
                            'onError': (event) => {
                                console.error('YouTube Player error:', event.data);
                                particleSystemState.forceDisabled = false;
                                if (canResumeParticles()) {
                                    window.resumeParticles();
                                }
                            }
                        }
                    });
                    playerInitialized = true;
                    players.push(player);
                }
            };

            const onKeyDownHandler = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClickHandler();
                }
            };

            // Add event listeners to container
            container.addEventListener('click', onClickHandler);
            container.addEventListener('keydown', onKeyDownHandler);
            container.setAttribute('tabindex', '0');
            container.setAttribute('role', 'button');
            container.setAttribute('aria-label', 'Play YouTube video');

            // Add event listeners to iframe
            ['mousemove', 'keydown', 'click'].forEach(eventName => {
                iframe.addEventListener(eventName, onUserInteraction);
            });
        });
    };

    // Handle clicks outside YouTube embeds
    document.addEventListener('click', (e) => {
        // Ignore clicks on links, within YouTube embeds, or any interactive elements
        if (e.target.closest('a') || 
            e.target.closest('iframe.youtube-embed') || 
            e.target.closest('button') ||
            e.target.closest('[role="button"]')) {
            return;
        }
        
        console.debug('Clicked outside interactive elements');
        particleSystemState.forceDisabled = false;
        if (canResumeParticles()) {
            window.resumeParticles();
        }
    });

    // Handle fullscreen changes
    document.addEventListener('fullscreenchange', () => {
        const fullscreenElement = document.fullscreenElement;
        if (!fullscreenElement) {
            console.debug('Exited fullscreen');
            particleSystemState.forceDisabled = false;
            if (canResumeParticles()) {
                window.resumeParticles();
            }
        }
    });

    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            window.pauseParticles();
        } else if (canResumeParticles()) {
            window.resumeParticles();
        }
    });

    // Initialize on page load
    window.addEventListener('load', () => {
        if (window.particleSystem) {
            console.debug('Initializing particle system state');
            particleSystemState.wasRunning = true;
            particleSystemState.spawnRate = window.particleSystem.spawnRate || 1;
            particleSystemState.particleCount = window.particleSystem.particles.length;
            particleSystemState.forceDisabled = false;
            debugState();
        }
    });

    preloadThumbnails();
    setupVideoHandlers();
});
