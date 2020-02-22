(() => {
  const _polyfill = new WebXRPolyfill();

  const LOCALIZATION = {
    'session-button-checking': 'Checking XR',
    'sessino-button-disabled': 'XR is disabled',
    'sessino-button-enter': 'Enter XR',
    'session-button-exit': 'Exit XR'
  };

  const ELEMENTS = {};

  const XR = {
    SESSION_TYPE: 'immersive-ar',
    session: null,
    hitTestSource: null
  };

  let APPLICATION = null;

  class Application {
    constructor() {
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(
        70,
        ELEMENTS.canvas.clientWidth / ELEMENTS.canvas.clientHeight,
        0.01,
        20
      );

      // Init renderer
      this.renderer = new THREE.WebGLRenderer({
        canvas: ELEMENTS.canvas,
        antialias: true,
        alpha: true
      });
      this.renderer.setPixelRatio(window.devicePixelRatio);

      this.renderer.xr.setReferenceSpaceType('local');
      this.renderer.xr.setSession(XR.session);
      this.renderer.xr.enabled = true;

      // Init lights
      this.scene.add(new THREE.DirectionalLight());
      this.scene.add(new THREE.HemisphereLight());

      // Init reticle
      this.reticle = new THREE.Mesh(
        new THREE.RingBufferGeometry(0.015, 0.02, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial()
      );
      this.reticle.matrixAutoUpdate = false;
      this.reticle.visible = false;
      this.scene.add(this.reticle);

      // Init placeable geometry
      this.placeableGeometry = new THREE.BoxGeometry(
        0.01,
        0.01,
        0.01
      ).translate(0, 0.005, 0);

      // Init controllers
      this.controller = this.renderer.xr.getController(0);
      this.controller.addEventListener('select', this.onSelect);
      this.scene.add(this.controller);
    }

    onStart = () => this.renderer.setAnimationLoop(this.onUpdate);

    onStop = () => this.renderer.setAnimationLoop(null);

    onUpdate = (time, frame) => {
      this.renderer.xr.getCamera(this.camera);

      if (frame) {
        const hitTestResults = frame.getHitTestResults(XR.hitTestSource);

        if (hitTestResults.length > 0) {
          const referenceSpace = this.renderer.xr.getReferenceSpace();

          const hit = hitTestResults[0];

          this.reticle.visible = true;
          this.reticle.matrix.fromArray(
            hit.getPose(referenceSpace).transform.matrix
          );
        } else {
          this.reticle.visible = false;
        }
      }

      this.renderer.render(this.scene, this.camera);
    };

    onSelect = () => {
      if (!this.reticle.visible) {
        return;
      }

      const material = new THREE.MeshPhongMaterial({
        color: 0xffffff * Math.random()
      });
      const mesh = new THREE.Mesh(this.placeableGeometry, material);
      mesh.position.setFromMatrixPosition(this.reticle.matrix);
      mesh.scale.y = Math.random() * 2 + 1;
      this.scene.add(mesh);
    };

    onResize = () => {
      const canvas = ELEMENTS.canvas;

      this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    };
  }

  const onSessionEnded = () => {
    if (APPLICATION != null) {
      APPLICATION.onStop();
      APPLICATION = null;
    }

    if (XR.session != null) {
      XR.session.end().catch(() => {});
      XR.session = null;
    }

    ELEMENTS.sessionButton.textContent = LOCALIZATION['sessino-button-enter'];
  };

  const onSessionStarted = async () => {
    APPLICATION = new Application();

    XR.hitTestSource = await XR.session.requestHitTestSource({
      space: await XR.session.requestReferenceSpace('viewer')
    });

    XR.session.addEventListener('end', onSessionEnded);

    APPLICATION.onStart();
  };

  const toggleSession = async () => {
    if (XR.session == null) {
      XR.session = await window.navigator.xr.requestSession(XR.SESSION_TYPE, {
        requiredFeatures: ['local', 'hit-test']
      });
      ELEMENTS.sessionButton.textContent = LOCALIZATION['session-button-exit'];

      onSessionStarted();
    } else {
      onSessionEnded();
    }
  };

  const initElements = () => {
    ELEMENTS.canvas = document.getElementById('main-canvas');
    ELEMENTS.sessionButton = document.getElementById('session-button');
  };

  const main = async () => {
    initElements();

    if (window.navigator.xr) {
      const supported = await window.navigator.xr.isSessionSupported(
        XR.SESSION_TYPE
      );

      if (supported) {
        ELEMENTS.sessionButton.addEventListener('click', toggleSession);
        ELEMENTS.sessionButton.textContent =
          LOCALIZATION['sessino-button-enter'];
      } else {
        ELEMENTS.sessionButton.textContent =
          LOCALIZATION['sessino-button-disabled'];
      }

      ELEMENTS.sessionButton.enabled = supported;
    }
  };

  document.addEventListener('DOMContentLoaded', main);
})();
