/**
 * VectorCutter - 3D Preview Viewport (§7.6)
 * Embedded Three.js r128 viewport with custom Orbit/Pan/Zoom camera controls.
 */

export class Preview3D {
    constructor(containerEl) {
        this.container = containerEl;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.mesh = null;
        this.grid = null;
        this.axes = null;

        // Custom Orbit Controls State
        this.target = { x: 0, y: 0, z: 0 };
        this.spherical = { radius: 100, theta: Math.PI / 4, phi: Math.PI / 3 };
        this.isOrbiting = false;
        this.isPanning = false;
        this.lastMouse = { x: 0, y: 0 };
        this.wireframe = false;

        this.init();
    }

    init() {
        if (!window.THREE || !this.container) return;

        const w = this.container.clientWidth || 340;
        const h = 260;

        // 1. Scene
        this.scene = new window.THREE.Scene();
        this.scene.background = new window.THREE.Color(0x18181a);

        // 2. Camera
        this.camera = new window.THREE.PerspectiveCamera(45, w / h, 0.5, 2000);
        this.updateCameraTransform();

        // 3. Renderer
        this.renderer = new window.THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // 4. Lights
        const amb = new window.THREE.AmbientLight(0xffffff, 0.65);
        this.scene.add(amb);

        const dir1 = new window.THREE.DirectionalLight(0xffffff, 0.7);
        dir1.position.set(100, 150, 200);
        this.scene.add(dir1);

        const dir2 = new window.THREE.DirectionalLight(0x8899aa, 0.4);
        dir2.position.set(-100, -100, -50);
        this.scene.add(dir2);

        // 5. Grid at Z=0 & Axes Helper
        this.grid = new window.THREE.GridHelper(200, 20, 0x007acc, 0x333333);
        this.grid.rotation.x = Math.PI / 2; // Lie on XY plane (Z is up)
        this.scene.add(this.grid);

        this.axes = new window.THREE.AxesHelper(30);
        this.scene.add(this.axes);

        // 6. Bind Mouse Orbit/Pan/Zoom
        this.bindControls();
        this.render();
    }

    bindControls() {
        const dom = this.renderer?.domElement;
        if (!dom) return;

        dom.addEventListener('contextmenu', (e) => e.preventDefault());

        dom.addEventListener('pointerdown', (e) => {
            if (e.button === 0) { // Left click = Orbit
                this.isOrbiting = true;
            } else if (e.button === 1 || e.button === 2) { // Middle / Right = Pan
                this.isPanning = true;
            }
            this.lastMouse = { x: e.clientX, y: e.clientY };
            dom.setPointerCapture(e.pointerId);
        });

        dom.addEventListener('pointermove', (e) => {
            const dx = e.clientX - this.lastMouse.x;
            const dy = e.clientY - this.lastMouse.y;
            this.lastMouse = { x: e.clientX, y: e.clientY };

            if (this.isOrbiting) {
                this.spherical.theta -= dx * 0.01;
                this.spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, this.spherical.phi - dy * 0.01));
                this.updateCameraTransform();
                this.render();
            } else if (this.isPanning) {
                const panSpeed = this.spherical.radius * 0.0015;
                this.target.x -= dx * panSpeed;
                this.target.y += dy * panSpeed;
                this.updateCameraTransform();
                this.render();
            }
        });

        dom.addEventListener('pointerup', (e) => {
            this.isOrbiting = false;
            this.isPanning = false;
            try { dom.releasePointerCapture(e.pointerId); } catch (err) {}
        });

        dom.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 0.9 : 1.1;
            this.spherical.radius = Math.max(5, Math.min(800, this.spherical.radius * factor));
            this.updateCameraTransform();
            this.render();
        }, { passive: false });

        dom.addEventListener('dblclick', () => {
            this.setPresetView('iso');
        });
    }

    setPresetView(view) {
        if (view === 'iso') {
            this.spherical.theta = Math.PI / 4;
            this.spherical.phi = Math.PI / 3;
        } else if (view === 'top') {
            this.spherical.theta = 0;
            this.spherical.phi = 0.05;
        } else if (view === 'front') {
            this.spherical.theta = 0;
            this.spherical.phi = Math.PI / 2;
        } else if (view === 'side') {
            this.spherical.theta = Math.PI / 2;
            this.spherical.phi = Math.PI / 2;
        }
        this.updateCameraTransform();
        this.render();
    }

    toggleWireframe() {
        this.wireframe = !this.wireframe;
        if (this.mesh && this.mesh.material) {
            this.mesh.material.wireframe = this.wireframe;
            this.render();
        }
        return this.wireframe;
    }

    updateCameraTransform() {
        if (!this.camera) return;
        const r = this.spherical.radius;
        const sinPhi = Math.sin(this.spherical.phi);
        const cosPhi = Math.cos(this.spherical.phi);
        const sinTheta = Math.sin(this.spherical.theta);
        const cosTheta = Math.cos(this.spherical.theta);

        // Z is Up in 3D Prep
        this.camera.position.x = this.target.x + r * sinPhi * sinTheta;
        this.camera.position.y = this.target.y + r * sinPhi * cosTheta;
        this.camera.position.z = this.target.z + r * cosPhi;
        this.camera.up.set(0, 0, 1);
        this.camera.lookAt(this.target.x, this.target.y, this.target.z);
    }

    updateMesh(meshData, colorHex = '#007acc') {
        if (!this.scene) return;

        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.mesh = null;
        }

        if (!meshData || meshData.vertices.length === 0) {
            this.render();
            return;
        }

        const geom = new window.THREE.BufferGeometry();
        geom.setAttribute('position', new window.THREE.BufferAttribute(meshData.vertices, 3));
        geom.setIndex(new window.THREE.BufferAttribute(meshData.indices, 1));
        geom.computeVertexNormals();
        geom.computeBoundingSphere();

        const mat = new window.THREE.MeshStandardMaterial({
            color: new window.THREE.Color(colorHex),
            roughness: 0.35,
            metalness: 0.1,
            wireframe: this.wireframe,
            side: window.THREE.DoubleSide
        });

        this.mesh = new window.THREE.Mesh(geom, mat);
        this.scene.add(this.mesh);

        // Frame camera around object
        if (geom.boundingSphere) {
            this.target.x = geom.boundingSphere.center.x;
            this.target.y = geom.boundingSphere.center.y;
            this.target.z = geom.boundingSphere.center.z;
            this.spherical.radius = Math.max(30, geom.boundingSphere.radius * 2.8);
            this.updateCameraTransform();
        }

        this.render();
    }

    render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    resize(w, h = 260) {
        if (!this.renderer || !this.camera) return;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        this.render();
    }
}
