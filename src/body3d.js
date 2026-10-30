import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * BodyModel renders a transparent 3D human figure with internal organs.
 * Call highlight([{ organ, severity, text }]) to glow affected parts and
 * drop short labels beside them. The written conclusion is handled by the DOM.
 */

const SEVERITY_COLOR = {
  high: 0xff4d4d,
  medium: 0xffa033,
  low: 0xffe14d
};

const SEVERITY_INTENSITY = {
  high: 1.15,
  medium: 0.85,
  low: 0.6
};

// Human-readable organ names for the floating labels.
const ORGAN_LABEL = {
  brain: 'Brain',
  eyes: 'Eyes',
  teeth: 'Teeth / gums',
  thyroid: 'Thyroid',
  heart: 'Heart',
  lungs: 'Lungs',
  liver: 'Liver',
  stomach: 'Stomach',
  pancreas: 'Pancreas',
  spleen: 'Spleen',
  kidneys: 'Kidneys',
  intestines: 'Intestines',
  bladder: 'Bladder',
  reproductive: 'Reproductive',
  spine: 'Spine',
  skin: 'Skin',
  muscles: 'Muscles',
  skeleton: 'Skeleton',
  blood: 'Blood',
  nerves: 'Nerves',
  hair: 'Hair'
};

function ellipsoid(radius, sx, sy, sz, color) {
  const geo = new THREE.SphereGeometry(radius, 32, 24);
  const mat = new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity: 0.9,
    roughness: 0.55,
    metalness: 0.0,
    emissive: 0x000000,
    emissiveIntensity: 0
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.set(sx, sy, sz);
  return mesh;
}

export class BodyModel {
  constructor(container) {
    this.container = container;
    this.organs = {};          // key -> { meshes:[], anchor:Vector3 }
    this.highlighted = [];     // [{ meshes, severity }]
    this.labelSprites = [];
    this.clock = new THREE.Clock();
    this._interacted = false;

    this._initScene();
    this._buildBody();
    this._buildOrgans();
    this._animate = this._animate.bind(this);
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
    requestAnimationFrame(this._animate);
  }

  _initScene() {
    const { clientWidth: w, clientHeight: h } = this.container;
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(40, (w || 1) / (h || 1), 0.1, 100);
    this.camera.position.set(0, 0.18, 2.55);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w || 600, h || 600);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 0.12, 0);
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 5;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.9;
    this.controls.addEventListener('start', () => {
      this._interacted = true;
      this.controls.autoRotate = false;
    });

    // Lighting
    this.scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x0a0f1e, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(2, 3, 3);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x6ea8ff, 0.9);
    rim.position.set(-2.5, 1.5, -2);
    this.scene.add(rim);
    this.scene.add(new THREE.AmbientLight(0x334466, 0.4));

    // Soft platform ring under the figure
    const ring = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 48),
      new THREE.MeshBasicMaterial({ color: 0x1b2b50, transparent: true, opacity: 0.35 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.98;
    this.scene.add(ring);

    this.labelsGroup = new THREE.Group();
    this.scene.add(this.labelsGroup);
  }

  _buildBody() {
    this.shellMeshes = [];
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: 0x8fd0ff,
      transparent: true,
      opacity: 0.1,
      roughness: 0.15,
      metalness: 0.0,
      clearcoat: 0.6,
      clearcoatRoughness: 0.3,
      emissive: 0x0a2740,
      emissiveIntensity: 0.0,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.shellMat = shellMat;

    const body = new THREE.Group();
    const add = (mesh) => {
      mesh.material = shellMat;
      mesh.renderOrder = 2;
      body.add(mesh);
      this.shellMeshes.push(mesh);
    };

    // Head + neck
    add(new THREE.Mesh(new THREE.SphereGeometry(0.135, 32, 24).scale(0.92, 1.05, 0.95).translate(0, 0.78, 0)));
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 24).translate(0, 0.64, 0)));

    // Torso (chest + abdomen) and pelvis
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.42, 12, 24));
    torso.scale.set(1.05, 1, 0.6);
    torso.position.set(0, 0.33, 0);
    add(torso);
    const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 20).scale(1.0, 0.7, 0.6).translate(0, -0.03, 0));
    add(pelvis);

    // Shoulders
    add(new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 16).translate(-0.2, 0.56, 0)));
    add(new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 16).translate(0.2, 0.56, 0)));

    // Arms
    const armGeo = new THREE.CapsuleGeometry(0.052, 0.5, 8, 16);
    const lArm = new THREE.Mesh(armGeo);
    lArm.position.set(-0.26, 0.28, 0);
    lArm.rotation.z = 0.18;
    add(lArm);
    const rArm = new THREE.Mesh(armGeo);
    rArm.position.set(0.26, 0.28, 0);
    rArm.rotation.z = -0.18;
    add(rArm);

    // Legs
    const legGeo = new THREE.CapsuleGeometry(0.07, 0.62, 8, 16);
    const lLeg = new THREE.Mesh(legGeo);
    lLeg.position.set(-0.09, -0.52, 0);
    add(lLeg);
    const rLeg = new THREE.Mesh(legGeo);
    rLeg.position.set(0.09, -0.52, 0);
    add(rLeg);

    this.scene.add(body);
    this.bodyGroup = body;

    // Hair cap (field key: hair)
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2.1),
      new THREE.MeshStandardMaterial({ color: 0x2a2320, roughness: 0.8, transparent: true, opacity: 0.9, emissive: 0x000000, emissiveIntensity: 0 })
    );
    hair.position.set(0, 0.82, 0);
    this.scene.add(hair);
    this._register('hair', [hair], new THREE.Vector3(0, 0.95, 0));

    // Spine (field keys: spine / skeleton / nerves)
    const spine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.72, 12),
      new THREE.MeshStandardMaterial({ color: 0x9aa7b5, roughness: 0.6, transparent: true, opacity: 0.9, emissive: 0x000000, emissiveIntensity: 0 })
    );
    spine.position.set(0, 0.28, -0.075);
    this.scene.add(spine);
    this._register('spine', [spine], new THREE.Vector3(-0.28, 0.3, -0.1));
  }

  _register(key, meshes, anchor) {
    this.organs[key] = { meshes, anchor };
  }

  _buildOrgans() {
    const addOrgan = (key, mesh, anchor) => {
      this.scene.add(mesh);
      this._register(key, [mesh], anchor);
    };

    // Brain
    const brain = ellipsoid(0.078, 1, 0.85, 0.95, 0x6f7d92);
    brain.position.set(0, 0.8, 0);
    addOrgan('brain', brain, new THREE.Vector3(0.22, 0.86, 0));

    // Eyes
    const eyeMatColor = 0x5c6b80;
    const eyeL = ellipsoid(0.02, 1, 1, 1, eyeMatColor); eyeL.position.set(-0.05, 0.79, 0.1);
    const eyeR = ellipsoid(0.02, 1, 1, 1, eyeMatColor); eyeR.position.set(0.05, 0.79, 0.1);
    this.scene.add(eyeL); this.scene.add(eyeR);
    this._register('eyes', [eyeL, eyeR], new THREE.Vector3(0.24, 0.79, 0.1));

    // Teeth / gums
    const teeth = ellipsoid(0.03, 1.4, 0.5, 0.9, 0x8a94a6);
    teeth.position.set(0, 0.705, 0.085);
    addOrgan('teeth', teeth, new THREE.Vector3(0.22, 0.7, 0.1));

    // Thyroid
    const thyroid = ellipsoid(0.028, 1.5, 0.8, 0.8, 0x7a6b8c);
    thyroid.position.set(0, 0.63, 0.045);
    addOrgan('thyroid', thyroid, new THREE.Vector3(0.22, 0.63, 0.06));

    // Heart
    const heart = ellipsoid(0.058, 1, 1.1, 0.95, 0x7a5560);
    heart.position.set(-0.04, 0.46, 0.05);
    addOrgan('heart', heart, new THREE.Vector3(-0.3, 0.47, 0.08));

    // Lungs
    const lungL = ellipsoid(0.072, 0.8, 1.25, 0.7, 0x6b7f8c); lungL.position.set(-0.1, 0.47, 0.0);
    const lungR = ellipsoid(0.072, 0.8, 1.25, 0.7, 0x6b7f8c); lungR.position.set(0.1, 0.47, 0.0);
    this.scene.add(lungL); this.scene.add(lungR);
    this._register('lungs', [lungL, lungR], new THREE.Vector3(0.32, 0.5, 0.05));

    // Liver
    const liver = ellipsoid(0.07, 1.5, 0.85, 0.9, 0x6e4f4a);
    liver.position.set(0.075, 0.27, 0.03);
    addOrgan('liver', liver, new THREE.Vector3(0.33, 0.27, 0.05));

    // Stomach
    const stomach = ellipsoid(0.055, 1.1, 1.2, 0.9, 0x7c6a52);
    stomach.position.set(-0.07, 0.29, 0.04);
    addOrgan('stomach', stomach, new THREE.Vector3(-0.32, 0.31, 0.06));

    // Spleen
    const spleen = ellipsoid(0.035, 1, 1.2, 0.9, 0x5f4a63);
    spleen.position.set(-0.135, 0.27, -0.01);
    addOrgan('spleen', spleen, new THREE.Vector3(-0.34, 0.24, -0.02));

    // Pancreas
    const pancreas = ellipsoid(0.03, 2.2, 0.7, 0.8, 0x7d7458);
    pancreas.position.set(-0.01, 0.22, -0.02);
    addOrgan('pancreas', pancreas, new THREE.Vector3(0.3, 0.2, -0.04));

    // Kidneys
    const kidL = ellipsoid(0.034, 0.8, 1.3, 0.8, 0x6a4e4e); kidL.position.set(-0.085, 0.15, -0.07);
    const kidR = ellipsoid(0.034, 0.8, 1.3, 0.8, 0x6a4e4e); kidR.position.set(0.085, 0.15, -0.07);
    this.scene.add(kidL); this.scene.add(kidR);
    this._register('kidneys', [kidL, kidR], new THREE.Vector3(0.32, 0.13, -0.1));

    // Intestines
    const intestines = ellipsoid(0.11, 1, 0.85, 0.8, 0x80705a);
    intestines.position.set(0, 0.03, 0.03);
    addOrgan('intestines', intestines, new THREE.Vector3(0.32, 0.0, 0.06));

    // Bladder
    const bladder = ellipsoid(0.04, 1, 0.9, 0.9, 0x6b7a84);
    bladder.position.set(0, -0.12, 0.05);
    addOrgan('bladder', bladder, new THREE.Vector3(0.26, -0.14, 0.07));

    // Reproductive
    const repro = ellipsoid(0.038, 1.3, 0.8, 0.9, 0x6d5a74);
    repro.position.set(0, -0.17, 0.03);
    addOrgan('reproductive', repro, new THREE.Vector3(-0.26, -0.18, 0.06));
  }

  // Map a data organ key to the mesh groups that should glow.
  _targetsFor(key) {
    switch (key) {
      case 'skin':
      case 'muscles':
      case 'blood':
        return ['__shell'];
      case 'skeleton':
        return ['spine'];
      case 'nerves':
        return ['spine', 'brain'];
      default:
        return this.organs[key] ? [key] : [];
    }
  }

  _anchorFor(key) {
    if (key === 'skin' || key === 'muscles' || key === 'blood') return new THREE.Vector3(0.34, 0.33, 0.2);
    if (this.organs[key]) return this.organs[key].anchor;
    return new THREE.Vector3(0.34, 0.2, 0.2);
  }

  /**
   * affected: [{ organ, severity, text }]
   */
  highlight(affected) {
    this._resetHighlights();
    const seen = new Set();

    for (const item of affected || []) {
      const key = item.organ;
      const color = SEVERITY_COLOR[item.severity] || SEVERITY_COLOR.medium;
      const intensity = SEVERITY_INTENSITY[item.severity] || SEVERITY_INTENSITY.medium;
      const targets = this._targetsFor(key);

      for (const t of targets) {
        if (t === '__shell') {
          this.shellMat.emissive.setHex(color);
          this.shellMat.emissiveIntensity = 0.0; // animated in loop
          this.shellMat.opacity = 0.22;
          this.highlighted.push({ meshes: this.shellMeshes, severity: item.severity, isShell: true });
        } else {
          const org = this.organs[t];
          if (!org) continue;
          for (const m of org.meshes) {
            m.material.emissive.setHex(color);
            m.material.color.setHex(color);
            m.material.opacity = 0.97;
          }
          this.highlighted.push({ meshes: org.meshes, severity: item.severity });
        }
      }

      // One label per organ key
      if (!seen.has(key) && targets.length) {
        seen.add(key);
        this._addLabel(ORGAN_LABEL[key] || key, color, this._anchorFor(key));
      }
    }
  }

  _resetHighlights() {
    // Restore organ base look
    for (const key of Object.keys(this.organs)) {
      for (const m of this.organs[key].meshes) {
        if (!m.userData.baseColor) m.userData.baseColor = m.material.color.getHex();
        m.material.emissive.setHex(0x000000);
        m.material.emissiveIntensity = 0;
        m.material.color.setHex(m.userData.baseColor);
        m.material.opacity = 0.88;
      }
    }
    this.shellMat.emissive.setHex(0x0a2740);
    this.shellMat.emissiveIntensity = 0;
    this.shellMat.opacity = 0.1;
    this.highlighted = [];
    this._clearLabels();
  }

  _addLabel(text, color, anchor) {
    const pad = 24;
    const fontSize = 44;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `600 ${fontSize}px Segoe UI, system-ui, sans-serif`;
    const textW = ctx.measureText(text).width;
    canvas.width = textW + pad * 2;
    canvas.height = fontSize + pad;

    ctx.font = `600 ${fontSize}px Segoe UI, system-ui, sans-serif`;
    const hex = '#' + color.toString(16).padStart(6, '0');
    ctx.fillStyle = 'rgba(10,16,32,0.82)';
    roundRect(ctx, 2, 2, canvas.width - 4, canvas.height - 4, 14);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = hex;
    roundRect(ctx, 2, 2, canvas.width - 4, canvas.height - 4, 14);
    ctx.stroke();
    ctx.fillStyle = '#eaf2ff';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, pad, canvas.height / 2 + 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
    const aspect = canvas.width / canvas.height;
    const scale = 0.11;
    sprite.scale.set(scale * aspect, scale, 1);
    sprite.position.copy(anchor);
    sprite.renderOrder = 10;
    this.labelsGroup.add(sprite);
    this.labelSprites.push(sprite);
  }

  _clearLabels() {
    for (const s of this.labelSprites) {
      this.labelsGroup.remove(s);
      s.material.map?.dispose();
      s.material.dispose();
    }
    this.labelSprites = [];
  }

  resetView() {
    this.camera.position.set(0, 0.18, 2.55);
    this.controls.target.set(0, 0.12, 0);
    this.controls.autoRotate = true;
    this._interacted = false;
    this.controls.update();
  }

  _onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _animate() {
    requestAnimationFrame(this._animate);
    const t = this.clock.getElapsedTime();
    const pulse = (Math.sin(t * 3.2) + 1) / 2; // 0..1

    for (const h of this.highlighted) {
      const base = SEVERITY_INTENSITY[h.severity] || 0.8;
      if (h.isShell) {
        this.shellMat.emissiveIntensity = 0.25 + pulse * 0.5;
      } else {
        for (const m of h.meshes) {
          m.material.emissiveIntensity = base * (0.5 + pulse * 0.7);
        }
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
