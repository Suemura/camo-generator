// About ページ本文 (日本語)。上部バー (戻る + 言語切替) は About.tsx が持つ。
import styles from "./About.module.scss";
import { CREDITS, LINKS } from "./about-links";

export function AboutJa() {
  return (
    <>
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

      <h2>3D プレビューのアセット</h2>
      <p>
        「3D」表示モードで使う環境光と布地の質感マップはいずれも CC0 (パブリックドメイン相当) です。
      </p>
      <ul className={styles.credits}>
        <li>
          環境光 (HDRI): <em>{CREDITS.hdriTitle}</em> — {CREDITS.hdriAuthor},{" "}
          <a href={LINKS.polyHavenHdri}>{CREDITS.polyHaven}</a> (CC0)
        </li>
        <li>
          布地 (平織り): <em>{CREDITS.fabric036Title}</em> —{" "}
          <a href={LINKS.ambientCgFabric036}>{CREDITS.ambientCg}</a> (CC0)。球・布モデルの normal /
          roughness
        </li>
        <li>
          布地 (リップストップ): <em>{CREDITS.fabric062Title}</em> —{" "}
          <a href={LINKS.ambientCgFabric062}>{CREDITS.ambientCg}</a> (CC0)。ポーチモデルの normal /
          roughness
        </li>
        <li>
          3D 描画は <a href={LINKS.threeJs}>{CREDITS.threeJs}</a> (MIT)
        </li>
      </ul>

      <h2>アルゴリズムの出典</h2>
      <ul>
        <li>M81 ソースマップは米政府図案 (パブリックドメイン) のインデックス化データ</li>
        <li>
          陸自迷彩 2 型のソースマップは{" "}
          <a href={LINKS.wikimediaJgsdfType2}>{CREDITS.jgsdfType2FileTitle}</a> (
          {CREDITS.jgsdfType2Photographer} 撮影、CC BY 3.0) のインデックス化データ
        </li>
        <li>
          DPM / デザート DPM のソースマップは{" "}
          <a href={LINKS.wikimediaDpm}>{CREDITS.dpmFileTitle}</a> ({CREDITS.dpmPhotographer}{" "}
          撮影、UK MOD) のインデックス化データ。{CREDITS.oglNotice}
        </li>
        <li>
          クイルト方式は Efros &amp; Freeman (2001) Image Quilting
          の考え方を有機輪郭パッチに拡張したもの
        </li>
        <li>
          一部の探索実装は <a href={LINKS.camogen}>{CREDITS.camogen}</a> (MIT)
          のアルゴリズムを参考にした
        </li>
      </ul>

      <h2>カラーライブラリの出典</h2>
      <p>
        FS 595 / RAL / BS 381C / RLM 等の規格色の sRGB 値は、GSA 公開の FED-STD-595C
        測色データの変換値および各規格の公開チャートに基づきます。模型塗料の品番は参考情報としてのみ併記しています。詳細はリポジトリの{" "}
        <span className="mono">{CREDITS.paletteSourcesDoc}</span> を参照してください。
      </p>

      <h2>デザイン</h2>
      <p>
        UI デザインシステムは <a href={LINKS.awesomeDesignSkills}>{CREDITS.awesomeDesignSkills}</a>{" "}
        の「spacious」(MIT) に基づきます。フォント: Open Sans / Montserrat / IBM Plex Mono (SIL
        OFL、自前配信)。
      </p>
    </>
  );
}
