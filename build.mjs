import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { rollup } from "rollup";
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import esbuild from "rollup-plugin-esbuild";

const bundle = await rollup({
  input: "src/index.tsx",
  external: (id) => id.startsWith("@vendetta/") || id === "react",
  plugins: [nodeResolve(), commonjs(), esbuild()],
  onwarn: () => {},
});

await bundle.write({
  file: "index.js",
  format: "iife",
  compact: true,
  exports: "named",
  globals: {
    react: "window.React",
    "@vendetta/metro": "vendetta.metro",
    "@vendetta/metro/common": "vendetta.metro.common",
    "@vendetta/patcher": "vendetta.patcher",
    "@vendetta/ui/assets": "vendetta.ui.assets",
    "@vendetta/ui/components": "vendetta.ui.components",
    "@vendetta/utils": "vendetta.utils",
  },
});

await bundle.close();

const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
const output = await readFile("index.js");
manifest.main = "index.js";
manifest.hash = createHash("sha256").update(output).digest("hex");
await writeFile("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
