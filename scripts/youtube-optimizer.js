// Enhanced YouTube Thumbnail and Embed Optimizer
document.addEventListener('DOMContentLoaded', function() {
    const thumbnailContainers = document.querySelectorAll('.youtube-thumbnail-container');
    
    // Preload all thumbnails for better performance
    function preloadThumbnails() {
        thumbnailContainers.forEach(container => {
            const thumbnail = container.querySelector('.youtube-thumbnail');
            const desktopImg = new Image();
            const mobileImg = new Image();
            
            desktopImg.src = thumbnail.dataset.srcDesktop;
            mobileImg.src = thumbnail.dataset.srcMobile;
            
            // Set appropriate thumbnail based on screen size
            if (window.innerWidth <= 767) {
                thumbnail.src = thumbnail.dataset.srcMobile;
                thumbnail.style.opacity = '0.98';
            } else {
                thumbnail.src = thumbnail.dataset.srcDesktop;
                thumbnail.style.opacity = '1';
            }
        });
    }

    // Handle thumbnail clicks to show video
    function setupVideoHandlers() {
        thumbnailContainers.forEach(container => {
            const iframe = container.nextElementSibling;
            
            container.addEventListener('click', function() {
                // Hide thumbnail and show iframe
                container.style.display = 'none';
                iframe.style.display = 'block';
                
                // Only load iframe source when clicked to save bandwidth
                if (iframe.src === 'about:blank') {
                    iframe.src = iframe.dataset.src;
                }
            });
        });
    }

    // Handle responsive thumbnail switching with debounce
    function handleResponsiveThumbnails() {
        const isMobile = window.innerWidth <= 767;
        
        thumbnailContainers.forEach(container => {
            const thumbnail = container.querySelector('.youtube-thumbnail');
            const newSrc = isMobile ? thumbnail.dataset.srcMobile : thumbnail.dataset.srcDesktop;
            
            // Only update if source needs to change
            if (thumbnail.src !== newSrc) {
                thumbnail.style.opacity = '0.8'; // Loading state
                
                const img = new Image();
                img.src = newSrc;
                img.onload = () => {
                    thumbnail.src = newSrc;
                    thumbnail.style.opacity = isMobile ? '0.98' : '1';
                };
            }
        });
    }

    // Initialize everything
    preloadThumbnails();
    setupVideoHandlers();
    
    // Handle window resize with debounce
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleResponsiveThumbnails, 200);
    });
});
