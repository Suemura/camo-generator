// 3D プレビューのシーン管理 (three.js 依存はこのモジュールに閉じる。Preview3D から動的 import する)。
// 目的: 生成した迷彩を実物相当の寸法のモデルに貼り、曲面での歪み (球)・ドレープ時の見え (布)・
// 面またぎの実寸連続性 (ポーチ) を確認する。シーン単位は mm。
import {
  BoxGeometry,
  type BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  FrontSide,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  NoColorSpace,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  RepeatWrapping,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  TOUCH,
  Vector2,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import {
  boxFaceSizes,
  clothWave,
  fabricRepeat,
  MODEL_SIZE_MM,
  type Model3D,
  POUCH_UV_REF_MM,
  scaleBoxUv,
} from "./preview3d-math";

/** モデルごとの布地マップ。球・布は平織り (BDU 綿布)、ポーチはリップストップ格子 (ナイロン装備) */
const FABRIC: Record<Model3D, { normal: string; rough: string }> = {
  sphere: { normal: "/3d/fabric_normal.jpg", rough: "/3d/fabric_rough.jpg" },
  cloth: { normal: "/3d/fabric_normal.jpg", rough: "/3d/fabric_rough.jpg" },
  pouch: { normal: "/3d/ripstop_normal.jpg", rough: "/3d/ripstop_rough.jpg" },
};
const ENV_URL = "/3d/env.hdr";
const FOV = 35;

function buildGeometry(model: Model3D): BufferGeometry {
  if (model === "sphere") {
    // 曲面で模様がどう歪むかを見る。既定 UV = 経度 / 緯度
    return new SphereGeometry(MODEL_SIZE_MM.sphere.d / 2, 64, 48);
  }
  if (model === "cloth") {
    // 吊るした生地のドレープ。頂点を座標のみの決定的関数で変位 (乱数不使用)
    const { w, h } = MODEL_SIZE_MM.cloth;
    const g = new PlaneGeometry(w, h, 48, 48);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, clothWave(pos.getX(i), pos.getY(i)));
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }
  // 箱型ポーチ。6 面の UV を実寸で再スケールし、面をまたいでも模様密度を一致させる
  const { w, h, d } = MODEL_SIZE_MM.pouch;
  const g = new BoxGeometry(w, h, d);
  scaleBoxUv(g.attributes.uv.array as Float32Array, boxFaceSizes(w, h, d), POUCH_UV_REF_MM);
  g.attributes.uv.needsUpdate = true;
  return g;
}

/** モデルの外接球半径 (mm)。カメラ距離の算出用 */
function boundingRadius(model: Model3D): number {
  if (model === "sphere") return MODEL_SIZE_MM.sphere.d / 2;
  if (model === "cloth") return (Math.SQRT2 * MODEL_SIZE_MM.cloth.w) / 2;
  const { w, h, d } = MODEL_SIZE_MM.pouch;
  return Math.hypot(w, h, d) / 2;
}

export interface Scene3DOptions {
  onEnvReady?: () => void;
  onEnvError?: (e: unknown) => void;
}

export class Scene3D {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(FOV, 1, 10, 10_000);
  private controls: OrbitControls;
  private material: MeshStandardMaterial;
  private mesh: Mesh | null = null;
  private model: Model3D = "sphere";
  private map: CanvasTexture | null = null;
  private fabricMaps = new Map<string, Texture>();
  private hemi: HemisphereLight;
  private sun: DirectionalLight;
  private pmrem: PMREMGenerator | null = null;
  private raf = 0;
  private running = false;
  private disposed = false;
  private loader = new TextureLoader();

  constructor(canvas: HTMLCanvasElement, opts: Scene3DOptions = {}) {
    // 背景は透明にして CSS (--color-preview-bg) に任せる → テーマ切替で JS 側の処理不要
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene.background = null;

    // HDRI 到着前・取得失敗時も真っ黒にしないための基本ライト。環境光が入ったら弱める
    this.hemi = new HemisphereLight(0xffffff, 0x555555, 1.6);
    this.sun = new DirectionalLight(0xffffff, 1.4);
    this.sun.position.set(400, 600, 500);
    this.scene.add(this.hemi, this.sun);

    this.material = new MeshStandardMaterial({
      color: new Color(0xffffff),
      roughness: 1,
      metalness: 0,
      normalScale: new Vector2(0.6, 0.6),
    });

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 1.0;
    this.controls.enablePan = false;
    this.controls.touches.ONE = TOUCH.ROTATE;

    this.setModel("sphere");
    this.loadEnvironment(opts);
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  private async loadEnvironment(opts: Scene3DOptions) {
    try {
      const hdr = await new HDRLoader().loadAsync(ENV_URL);
      if (this.disposed) {
        hdr.dispose();
        return;
      }
      this.pmrem = new PMREMGenerator(this.renderer);
      const env = this.pmrem.fromEquirectangular(hdr).texture;
      hdr.dispose();
      this.scene.environment = env;
      this.scene.environmentIntensity = 1.0;
      // 屋外 HDRI が主光源になるので補助ライトは控えめに
      this.hemi.intensity = 0.3;
      this.sun.intensity = 0.6;
      opts.onEnvReady?.();
    } catch (e) {
      opts.onEnvError?.(e);
    }
  }

  private onVisibility = () => {
    if (document.hidden) this.pause();
    else if (this.running) this.loop();
  };

  /** 迷彩テクスチャの元 canvas を差し替える (形状が変わった時) */
  setSource(src: HTMLCanvasElement) {
    this.map?.dispose();
    const t = new CanvasTexture(src);
    t.colorSpace = SRGBColorSpace;
    t.wrapS = t.wrapT = RepeatWrapping;
    t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    if (this.map) t.repeat.copy(this.map.repeat);
    this.map = t;
    this.material.map = t;
    this.material.needsUpdate = true;
  }

  /** パレットだけ変わった時: 元 canvas は描き直されているので GPU へ再アップロードのみ (再生成しない) */
  refreshSource() {
    if (this.map) this.map.needsUpdate = true;
  }

  setRepeat(r: { x: number; y: number }) {
    this.map?.repeat.set(r.x, r.y);
  }

  setModel(model: Model3D) {
    // 同一モデルへの再設定は no-op (コンストラクタの初期構築との二重実行を避ける)
    if (this.mesh && this.model === model) return;
    this.model = model;
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
    }
    const geo = buildGeometry(model);
    this.material.side = model === "cloth" ? DoubleSide : FrontSide;
    this.mesh = new Mesh(geo, this.material);
    this.scene.add(this.mesh);

    const r = boundingRadius(model);
    const dist = (r / Math.sin((FOV * Math.PI) / 360)) * 1.15;
    this.camera.position.set(dist * 0.35, dist * 0.25, dist * 0.9);
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.minDistance = dist * 0.5;
    this.controls.maxDistance = dist * 2.5;
    this.controls.update();
    this.applyFabric();
  }

  private applyFabric() {
    const f = FABRIC[this.model];
    const rep = fabricRepeat(this.model);
    const get = (url: string, srgb: boolean) => {
      let t = this.fabricMaps.get(url);
      if (!t) {
        t = this.loader.load(url, undefined, undefined, () => {
          // 取得失敗時は迷彩テクスチャのみで続行
          if (this.material.normalMap === t) this.material.normalMap = null;
          if (this.material.roughnessMap === t) this.material.roughnessMap = null;
          this.material.needsUpdate = true;
        });
        t.wrapS = t.wrapT = RepeatWrapping;
        t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
        this.fabricMaps.set(url, t);
      }
      t.repeat.set(rep.x, rep.y);
      return t;
    };
    this.material.normalMap = get(f.normal, false);
    this.material.roughnessMap = get(f.rough, false);
    this.material.needsUpdate = true;
  }

  resize(w: number, h: number) {
    if (w <= 0 || h <= 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  private loop = () => {
    if (!this.running || this.disposed) return;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.loop);
  };

  private pause() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  stop() {
    this.running = false;
    this.pause();
  }

  dispose() {
    this.stop();
    this.disposed = true;
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.controls.dispose();
    this.mesh?.geometry.dispose();
    this.material.dispose();
    this.map?.dispose();
    for (const t of this.fabricMaps.values()) t.dispose();
    this.scene.environment?.dispose();
    this.pmrem?.dispose();
    this.renderer.dispose();
    // 明示的にコンテキストを解放 ("Too many active WebGL contexts" 防止)
    this.renderer.forceContextLoss();
  }
}
