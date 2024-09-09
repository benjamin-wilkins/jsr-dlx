import { join, join as joinPath } from "jsr:@std/path"
import { DirectoryTypes, dir } from "jsr:@cross/dir@^1"
import { readFile, writeFile, exists, mktempdir, mkdir, which } from "jsr:@cross/fs@^0.1"
import { spawn } from "jsr:@cross/utils@^0.15"

const MAIN_LOCATIONS = [
  "mod.js",
  "main.js",
  joinPath("dist", "mod.js"),
  joinPath("dist", "mod.js"),
  joinPath("src", "mod.js"),
  joinPath("src", "main.js"),
]

export class Resolver {
  constructor() {
    let resolve: () => void
    ({ promise: this.ready, resolve } = Promise.withResolvers())

    this.#constructor_async()
    .then(() => this.#is_ready = true)
    .then(resolve)
  }

  async #constructor_async() {
    const cacheDir = joinPath(await dir(DirectoryTypes.cache), "jsr-dlx")
    this.cacheFile = joinPath(cacheDir, "cache.json")
    
    if (await exists(this.cacheFile)) {
      this.cache = JSON.parse(await readFile(this.cacheFile, {encoding: "utf-8"}))
    } else {
      if (!await exists(cacheDir)) await mkdir(cacheDir)
      this.cache = {}
    }
  }

  ready: Promise<void>
  #is_ready: boolean = false

  #assert_ready(): asserts this is { cacheFile: string, cache: Record<string, string> } {
    if (!this.#is_ready) throw new TypeError("You must await Resolver.ready before using it.")
  }

  async #findExisting(pkg: string): Promise<string | void> {
    this.#assert_ready()

    if (!(pkg in this.cache)) return

    if (!(await exists(this.cache[pkg]))) {
      delete this.cache[pkg]
      return
    }

    return this.cache[pkg]
  }

  async #install(pkg: string): Promise<string> {
    this.#assert_ready()

    console.log("Creating tmp dir...")
    const installDir: string = await mktempdir("jsr-dlx-")
    this.cache[pkg] = installDir
  
    console.log(`Installing ${pkg} in ${installDir}`)
    console.log(`$ npx jsr install ${pkg}`)

    const { code } = await spawn(
      [await which("npx") ?? "npx", "jsr", "add", pkg],
      {},
      installDir,
      {stdin: "inherit", stdout: "inherit", stderr: "inherit"}
    )

    if (code != 0) throw new Error(`A critical error occured. There is likely more information above.`)

    return installDir
  }

  async resolve(pkg: string): Promise<string> {
    this.#assert_ready()

    const installDir = await this.#findExisting(pkg) ?? await this.#install(pkg)
    const pkgDir = joinPath(installDir, "node_modules", ...pkg.split("/"))

    for (const loc of MAIN_LOCATIONS) {
      const entryPoint = join(pkgDir, loc)
      if (await exists(entryPoint)) {
        return entryPoint
      }
    }

    throw new Error("No entrypoint found")
  }

  async writeCache(): Promise<void> {
    this.#assert_ready()

    await writeFile(this.cacheFile, JSON.stringify(this.cache, undefined, 2))
  }

  cacheFile?: string
  cache?: Record<string, string>
}