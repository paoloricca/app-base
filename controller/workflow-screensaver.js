(function () {
    function initialize() {
        var $screensaver = $('.workflow-screensaver');
        if (!$screensaver.length) {
            return;
        }

        var element = $screensaver[0];
        var canvas = $screensaver.find('.workflow-screensaver-particles')[0];
        var context = canvas.getContext('2d');
        var $hint = $screensaver.find('.workflow-screensaver-hint');
        var navbar = document.querySelector('.app-header-navbar');
        var particles = [];
        var animationFrame = null;
        var idleTimer = null;
        var active = false;
        var idleDelay = 4000;
        var palette = ['#2563eb', '#0891b2', '#4f46e5', '#3b82f6'];
        var reducedMotion = window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function positionBelowNavbar() {
            if (!navbar) {
                return;
            }
            var navbarBottom = Math.ceil(navbar.getBoundingClientRect().bottom);
            element.style.setProperty('--workflow-screensaver-top', navbarBottom + 'px');
        }

        for (var index = 0; index < 34; index++) {
            particles.push({
                angle: Math.random() * Math.PI * 2,
                radius: 48 + Math.random() * 88,
                speed: (0.003 + Math.random() * 0.008) * (Math.random() < 0.5 ? 1 : -1),
                size: 1.5 + Math.random() * 2.4,
                color: palette[Math.floor(Math.random() * palette.length)],
                alpha: 0.25 + Math.random() * 0.55
            });
        }

        function animate() {
            context.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(function (particle) {
                particle.angle += particle.speed;
                var x = canvas.width / 2 + Math.cos(particle.angle) * particle.radius;
                var y = canvas.height / 2 + Math.sin(particle.angle) * particle.radius;
                context.beginPath();
                context.arc(x, y, particle.size, 0, Math.PI * 2);
                context.fillStyle = particle.color;
                context.globalAlpha = particle.alpha;
                context.fill();
            });
            context.globalAlpha = 1;
            animationFrame = window.requestAnimationFrame(animate);
        }

        function startAnimation() {
            if (!reducedMotion && animationFrame === null) {
                animationFrame = window.requestAnimationFrame(animate);
            }
        }

        function stopAnimation() {
            if (animationFrame !== null) {
                window.cancelAnimationFrame(animationFrame);
                animationFrame = null;
            }
            context.clearRect(0, 0, canvas.width, canvas.height);
        }

        function show() {
            $screensaver.removeClass('d-none');
            element.setAttribute('aria-hidden', 'false');
            startAnimation();
        }

        function hide() {
            $screensaver.addClass('d-none');
            element.setAttribute('aria-hidden', 'true');
            stopAnimation();
        }

        function resetIdleTimer() {
            if (!active) {
                return;
            }
            hide();
            window.clearTimeout(idleTimer);
            idleTimer = window.setTimeout(show, idleDelay);
        }

        ['mousemove', 'mousedown', 'keydown', 'touchstart'].forEach(function (eventName) {
            document.addEventListener(eventName, resetIdleTimer, { passive: true });
        });

        window.workflowScreensaver = {
            setActive: function (isActive) {
                active = Boolean(isActive);
                window.clearTimeout(idleTimer);
                if (active) {
                    show();
                } else {
                    hide();
                }
            },
            setHasProcessCards: function (hasCards) {
                $hint.toggleClass('d-none', !hasCards);
            }
        };
        positionBelowNavbar();
        window.addEventListener('resize', positionBelowNavbar);
        hide();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
}());
