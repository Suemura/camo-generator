// About page body (English). The top bar (back link + language toggle) lives in About.tsx.
import styles from "./About.module.scss";
import { CREDITS, LINKS } from "./about-links";

export function AboutEn() {
  return (
    <>
      <h1>About</h1>
      <p>
        Camo Generator is a tool that procedurally generates camouflage patterns entirely in your
        browser. A seed value reproduces the same pattern every time, and you can freely change the
        colors and size before exporting to PNG / JPG / WebP / SVG.
      </p>

      <h2>Trademarks</h2>
      <p>
        Names such as MARPAT and MultiCam are trademarks of their respective owners. Each preset in
        this tool borrows only the &ldquo;design language&rdquo; of the real pattern, which is why
        every preset is labeled <strong>-inspired</strong>; none is a reproduction of an official
        pattern. Use of the generated output is at your own responsibility.
      </p>

      <h2>Privacy</h2>
      <p>
        Generation, export, and palette extraction from images all run inside your browser. No
        images or settings are ever sent to a server. A share URL contains only the numeric values
        of the pattern, seed, colors, and size.
      </p>

      <h2>3D preview assets</h2>
      <p>
        The environment lighting and fabric texture maps used in the &ldquo;3D&rdquo; view mode are
        all CC0 (public-domain equivalent).
      </p>
      <ul className={styles.credits}>
        <li>
          Environment (HDRI): <em>{CREDITS.hdriTitle}</em> — {CREDITS.hdriAuthor},{" "}
          <a href={LINKS.polyHavenHdri}>{CREDITS.polyHaven}</a> (CC0)
        </li>
        <li>
          Fabric (plain weave): <em>{CREDITS.fabric036Title}</em> —{" "}
          <a href={LINKS.ambientCgFabric036}>{CREDITS.ambientCg}</a> (CC0). Normal / roughness maps
          for the sphere and cloth models
        </li>
        <li>
          Fabric (ripstop): <em>{CREDITS.fabric062Title}</em> —{" "}
          <a href={LINKS.ambientCgFabric062}>{CREDITS.ambientCg}</a> (CC0). Normal / roughness maps
          for the pouch model
        </li>
        <li>
          3D rendering by <a href={LINKS.threeJs}>{CREDITS.threeJs}</a> (MIT)
        </li>
      </ul>

      <h2>Algorithm sources</h2>
      <ul>
        <li>
          The M81 source map is indexed data derived from the US government pattern (public domain)
        </li>
        <li>
          The JGSDF Type 2 source map is indexed data derived from{" "}
          <a href={LINKS.wikimediaJgsdfType2}>{CREDITS.jgsdfType2FileTitle}</a> (photo by{" "}
          {CREDITS.jgsdfType2Photographer}, CC BY 3.0)
        </li>
        <li>
          The DPM / Desert DPM source maps are indexed data derived from{" "}
          <a href={LINKS.wikimediaDpm}>{CREDITS.dpmFileTitle}</a> (photo by{" "}
          {CREDITS.dpmPhotographer}, UK MOD). {CREDITS.oglNotice}
        </li>
        <li>
          The quilting method extends the idea of Efros &amp; Freeman (2001) Image Quilting to
          organically outlined patches
        </li>
        <li>
          Some of the exploratory implementations were informed by the algorithms in{" "}
          <a href={LINKS.camogen}>{CREDITS.camogen}</a> (MIT)
        </li>
      </ul>

      <h2>Color library sources</h2>
      <p>
        The sRGB values of standard colors such as FS 595 / RAL / BS 381C / RLM are based on
        conversions of the FED-STD-595C colorimetric data published by the GSA and on the published
        charts of each standard. Model paint numbers are listed for reference only. See{" "}
        <span className="mono">{CREDITS.paletteSourcesDoc}</span> in the repository for details.
      </p>

      <h2>Design</h2>
      <p>
        The UI design system is based on &ldquo;spacious&rdquo; (MIT) from{" "}
        <a href={LINKS.awesomeDesignSkills}>{CREDITS.awesomeDesignSkills}</a>. Fonts: Open Sans /
        Montserrat / IBM Plex Mono (SIL OFL, self-hosted).
      </p>
    </>
  );
}
