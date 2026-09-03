import styles from "./About.module.scss";

export function About() {
  return (
    <main className={styles.about}>
      <a href="/" className="btn ghost sm">
        ← ジェネレータへ戻る
      </a>
      <h1>About</h1>
      <p>
        Camo Generator
        は迷彩模様をブラウザ内で計算生成するツールです。シード値で同じ模様を再現でき、色・サイズを自由に変えて
        PNG / JPG / WebP / SVG に書き出せます。
      </p>

      <h2>商標について</h2>
      <p>
        MARPAT、MultiCam
        などの名称は各権利者の商標です。本ツールの各プリセットは実物の「設計言語」を参考にした
        <strong>〜風</strong>
        の生成であり、公式図案の複製ではありません。生成物の利用は各自の責任で行ってください。
      </p>

      <h2>プライバシー</h2>
      <p>
        生成・書き出し・画像からのパレット抽出はすべてお使いのブラウザ内で完結し、画像や設定がサーバーへ送信されることはありません。共有
        URL に含まれるのはパターン・シード・色・サイズの数値のみです。
      </p>

      <h2>実物リファレンス画像のクレジット</h2>
      <p>
        「実物比較」モードで表示する画像は Wikimedia Commons 由来です。各画像のライセンスは Commons
        の該当ファイルページに従います。
      </p>
      <ul className={styles.credits}>
        <li>
          M81 ウッドランド — 米政府図案 (パブリックドメイン)。ファイル・作者: <em>要記入</em>
        </li>
        <li>
          MARPAT ウッドランド / デザート — ファイル・作者・ライセンス: <em>要記入</em>
        </li>
        <li>
          AOR1 / AOR2 — ファイル・作者・ライセンス: <em>要記入</em>
        </li>
        <li>
          UCP — ファイル・作者・ライセンス: <em>要記入</em>
        </li>
      </ul>

      <h2>アルゴリズムの出典</h2>
      <ul>
        <li>M81 ソースマップは米政府図案 (パブリックドメイン) のインデックス化データ</li>
        <li>
          クイルト方式は Efros &amp; Freeman (2001) Image Quilting
          の考え方を有機輪郭パッチに拡張したもの
        </li>
        <li>
          一部の探索実装は <a href="https://github.com/glederrey/camogen">camogen</a> (MIT)
          のアルゴリズムを参考にした
        </li>
      </ul>

      <h2>カラーライブラリの出典</h2>
      <p>
        FS 595 / RAL / BS 381C / RLM 等の規格色の sRGB 値は、GSA 公開の FED-STD-595C
        測色データの変換値および各規格の公開チャートに基づきます。模型塗料の品番は参考情報としてのみ併記しています。詳細はリポジトリの{" "}
        <span className="mono">docs/design/palette-library-sources.md</span> を参照してください。
      </p>

      <h2>デザイン</h2>
      <p>
        UI デザインシステムは{" "}
        <a href="https://github.com/bergside/awesome-design-skills">awesome-design-skills</a>{" "}
        の「spacious」(MIT) に基づきます。フォント: Open Sans / Montserrat / IBM Plex Mono (SIL
        OFL、自前配信)。
      </p>
    </main>
  );
}
