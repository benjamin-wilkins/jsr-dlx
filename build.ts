import { build } from "npm:esbuild"
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader"

await build({
  plugins: [...denoPlugins({
    importMapURL: import.meta.resolve("./deno.json")
  })],
  entryPoints: ["src/mod.ts"],
  outdir: "dist",
  bundle: true,
  format: "esm"
})