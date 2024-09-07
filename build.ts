import { build } from "npm:esbuild"
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader"

await Promise.all([
  build({
    plugins: [...denoPlugins({
      importMapURL: import.meta.resolve("./deno.json")
    })],
    entryPoints: ["src/mod.ts"],
    outdir: "dist",
    bundle: true,
    format: "esm"
  }),
  Deno.copyFile(
    "./README.md",
    "./dist/README.md"
  ),
  Deno.copyFile(
    "./LICENSE",
    "./dist/LICENSE"
  )
])