document.addEventListener('DOMContentLoaded', () => {
    const thumbnailContainers = document.querySelectorAll('.youtube-thumbnail-container');
    const players = [];
    let isUserInteracting = false;
    let interactionTimeout = null;

    const debounce = (func, delay) => {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const setUserInteracting = debounce(() => {
        console.debug('User interaction ended');
        isUserInteracting = false;
        const fullscreenElement = document.fullscreenElement;
        const anyPlaying = players.some(player => player.getPlayerState && player.getPlayerState() === YT.PlayerState.PLAYING);
        if (!anyPlaying && !fullscreenElement) {
            console.debug('Resuming particles after interaction timeout');
            if (window.resumeParticles) {
                window.resumeParticles();
            }
        }
    }, 2000);

    const onUserInteraction = () => {
        if (!isUserInteracting) {
            console.debug('User interacting with YouTube embed');
            isUserInteracting = true;
            if (window.pauseParticles) {
                window.pauseParticles();
            }
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

            ['mousemove', 'keydown', 'click'].forEach(eventName => {
                iframe.addEventListener(eventName, onUserInteraction);
            });

            const onClickHandler = () => {
                container.style.display = 'none';
                iframe.style.display = 'block';

                if (iframe.src === 'about:blank') {
                    iframe.src = iframe.dataset.src;
                }

                if (!playerInitialized) {
                    player = new YT.Player(iframe, {
                        events: {
                            'onReady': (event) => {
                                event.target.mute();
                                event.target.setVolume(0);
                            },
                            'onStateChange': (event) => {
                                if (event.data === YT.PlayerState.PLAYING) {
                                    console.debug('YouTube video playing - pausing particles');
                                    if (window.pauseParticles) {
                                        window.pauseParticles();
                                    }
                                }
                                // Removed resume on pause to prevent particle system resuming on video pause
                                /*
                                else if (event.data === YT.PlayerState.PAUSED) {
                                    console.debug('YouTube video paused');
                                    if (!isUserInteracting) {
                                        if (window.resumeParticles) {
                                            window.resumeParticles();
                                        }
                                    }
                                }
                                */
                                else if (event.data === YT.PlayerState.BUFFERING) {
                                    const fullscreenElement = document.fullscreenElement;
                                    if (fullscreenElement && fullscreenElement.tagName === 'IFRAME' && fullscreenElement.classList.contains('youtube-embed')) {
                                        const player = event.target;
                                        const currentTime = player.getCurrentTime();
                                        player.seekTo(currentTime, true);
                                        player.playVideo();
                                    }
                                }
                            },
                            'onError': (event) => {
                                console.error('YouTube Player error:', event.data);
                            }
                        }
                    });
                    playerInitialized = true;
                    players.push(player);
                }

                container.removeEventListener('click', onClickHandler);
                container.removeEventListener('keydown', onKeyDownHandler);
            };

            const onKeyDownHandler = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClickHandler();
                }
            };

            container.addEventListener('click', onClickHandler);
            container.addEventListener('keydown', onKeyDownHandler);
            container.setAttribute('tabindex', '0');
            container.setAttribute('role', 'button');
            container.setAttribute('aria-label', 'Play YouTube video');
        });
    };

    const handleFullscreenChange = () => {
        const fullscreenElement = document.fullscreenElement;
        if (fullscreenElement && fullscreenElement.tagName === 'IFRAME' && fullscreenElement.classList.contains('youtube-embed')) {
            console.debug('Entered fullscreen on YouTube embed');
            const playerInFullscreen = players.find(player => player.getIframe() === fullscreenElement);
            if (playerInFullscreen && playerInFullscreen.getPlayerState() === YT.PlayerState.PLAYING) {
                console.debug('Fullscreen video is playing - pausing particles');
                if (window.pauseParticles) {
                    window.pauseParticles();
                }
            }
        } else {
            console.debug('Exited fullscreen');
            const anyPlaying = players.some(player => player.getPlayerState && player.getPlayerState() === YT.PlayerState.PLAYING);
            if (!anyPlaying && !isUserInteracting) {
                if (window.resumeParticles) {
                    console.debug('Resuming particles after exiting fullscreen');
                    window.resumeParticles();
                }
            }
        }
    };

    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    document.addEventListener('click', (e) => {
        const clickedOnIframe = e.target.closest('iframe.youtube-embed');
        if (!clickedOnIframe && !isUserInteracting) {
            console.debug('Clicked outside YouTube embed - resuming particles');
            if (window.resumeParticles) {
                window.resumeParticles();
            }
        }
    });

    preloadThumbnails();
    setupVideoHandlers();
});
