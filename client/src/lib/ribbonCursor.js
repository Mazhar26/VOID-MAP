// ─── Ribbon Trails Mouse Cursor Physics Engine ────────────────────────────────
// Organic smooth fluid spring-friction trail cursor for VOID-MAP

class TrailNode {
    x = 0;
    y = 0;
    vx = 0;
    vy = 0;
}

class Line {
    constructor(cfg) {
        this.cfg = cfg;
        this.spring = cfg.spring + 0.1 * Math.random() - 0.02;
        this.friction = cfg.friction + 0.01 * Math.random() - 0.002;
        this.nodes = [];
        for (let i = 0; i < cfg.size; i++) {
            const node = new TrailNode();
            node.x = cfg.target.x;
            node.y = cfg.target.y;
            this.nodes.push(node);
        }
    }

    update() {
        let spring = this.spring;
        const { target, dampening, tension } = this.cfg;
        let node = this.nodes[0];

        node.vx += (target.x - node.x) * spring;
        node.vy += (target.y - node.y) * spring;

        for (let i = 0, len = this.nodes.length; i < len; i++) {
            node = this.nodes[i];
            if (i > 0) {
                const prev = this.nodes[i - 1];
                node.vx += (prev.x - node.x) * spring;
                node.vy += (prev.y - node.y) * spring;
                node.vx += prev.vx * dampening;
                node.vy += prev.vy * dampening;
            }
            node.vx *= this.friction;
            node.vy *= this.friction;
            node.x += node.vx;
            node.y += node.vy;
            spring *= tension;
        }
    }

    draw(ctx) {
        if (this.nodes.length < 3) return;
        let a, b;
        let x = this.nodes[0].x;
        let y = this.nodes[0].y;

        ctx.beginPath();
        ctx.moveTo(x, y);

        for (let i = 1, len = this.nodes.length - 2; i < len; i++) {
            a = this.nodes[i];
            b = this.nodes[i + 1];
            x = 0.5 * (a.x + b.x);
            y = 0.5 * (a.y + b.y);
            ctx.quadraticCurveTo(a.x, a.y, x, y);
        }

        a = this.nodes[this.nodes.length - 2];
        b = this.nodes[this.nodes.length - 1];
        ctx.quadraticCurveTo(a.x, a.y, b.x, b.y);
        ctx.stroke();
        ctx.closePath();
    }
}

export function initRibbonCursor(options = {}) {
    const config = {
        colors: options.colors || ["#FFFFFF", "#FF6F00", "#F24E1E", "#4ade80"],
        thickness: options.thickness || 0.5,
        trails: options.trails || 50,
        trailLength: options.trailLength || 25,
    };

    const canvas = document.createElement("canvas");
    canvas.id = "ribbonCursorCanvas";
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "99999";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    let running = true;
    let rafId = 0;

    const count = Math.max(1, config.trails);
    const lineCfg = {
        spring: 0.4,
        friction: 0.5,
        dampening: 0.1,
        tension: 0.95,
        size: Math.max(2, config.trailLength),
        target,
    };

    const lines = [];
    for (let i = 0; i < count; i++) {
        lines.push(new Line({ ...lineCfg, spring: 0.4 + (i / count) * 0.025 }));
    }

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.scale(dpr, dpr);
    }

    function updatePosition(e) {
        target.x = e.clientX || (e.touches && e.touches[0].clientX) || target.x;
        target.y = e.clientY || (e.touches && e.touches[0].clientY) || target.y;
    }

    function loop() {
        if (!running || !ctx) return;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = config.colors[Math.floor(Date.now() / 1000) % config.colors.length];
        ctx.lineWidth = config.thickness;

        for (let i = 0; i < count; i++) {
            lines[i].update();
            lines[i].draw(ctx);
        }
        rafId = requestAnimationFrame(loop);
    }

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", updatePosition);
    window.addEventListener("touchmove", updatePosition, { passive: true });

    resize();
    loop();

    return {
        destroy: () => {
            running = false;
            cancelAnimationFrame(rafId);
            window.removeEventListener("resize", resize);
            window.removeEventListener("mousemove", updatePosition);
            window.removeEventListener("touchmove", updatePosition);
            canvas.remove();
        },
    };
}
