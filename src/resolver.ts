import { join as joinPath } from "jsr:@std/path"
import { DirectoryTypes, dir } from "jsr:@cross/dir@^1"
import { getCurrentRuntime, Runtime } from "jsr:@cross/runtime@1"
import { spawn } from "jsr:@cross/utils@^0.15"
import { colorMe } from "jsr:@vef/color-me@1";

import {
  readFile,
  writeFile,
  exists,
  mktempdir,
  mkdir,
  which
} from "jsr:@cross/fs@^0.1"

import {
  maxSatisfying,
  parse as parseVersion,
  format as formatVersion,
  type SemVer,
  parseRange,
  formatRange,
  type Range
} from "jsr:@std/semver"

import { log } from "./log.ts"

const MAIN_LOCATIONS = [
  "mod.js",
  "main.js",
  joinPath("dist", "mod.js"),
  joinPath("dist", "mod.js"),
  joinPath("src", "mod.js"),
  joinPath("src", "main.js"),
]

async function getLatest(pkgName: string): Promise<Range> {
  log("Getting latest version for", colorMe.brightCyan(pkgName))

  const response = await fetch(`https://jsr.io/${pkgName}/meta.json`)
  return parseRange(JSON.parse(await response.text()).latest)
}

async function getInstalled(installDir: string, pkgName: string): Promise<SemVer> {
  const packageJSON = joinPath(installDir, "node_modules", pkgName, "package.json")

  return parseVersion(JSON.parse(await readFile(packageJSON, { encoding: "utf-8" })).version)
}

export class Resolver {
  constructor() {
    this.ready = this.#constructor_async().then(() => {this.#is_ready = true})
  }

  async #constructor_async(): Promise<void> {
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

  #assert_ready(): asserts this is { cacheFile: string, cache: Record<string, Record<string, string>> } {
    if (!this.#is_ready) throw new TypeError("You must await Resolver.ready before using it.")
  }

  async #findExisting(pkgName: string, pkgVersion: Range): Promise<string | void> {
    this.#assert_ready()

    if (!(pkgName in this.cache)) return

    const resolvedPkgVersion = maxSatisfying(Object.keys(this.cache[pkgName]).map(parseVersion), pkgVersion)
    if (!resolvedPkgVersion) return

    if (!(await exists(this.cache[pkgName][formatVersion(resolvedPkgVersion)]))) {
      delete this.cache[pkgName]
      return
    }

    return this.cache[pkgName][formatVersion(resolvedPkgVersion)]
  }

  async #install(pkgName: string, pkgVersion: Range): Promise<string> {
    this.#assert_ready()

    log("[jsr-dlx] Creating tmp dir...")
    const installDir: string = await mktempdir("jsr-dlx-")

    if (!this.cache[pkgName]) this.cache[pkgName] = {}
  
    log("Installing", colorMe.brightCyan(pkgName), "in", colorMe.green(installDir))

    const command: string[] = getCurrentRuntime() === Runtime.Bun
    ? [await which("bunx") ?? "bunx", "jsr", "add", `${pkgName}@${formatRange(pkgVersion)}`]
    : [await which("npx") ?? "npx", "jsr", "add", `${pkgName}@${formatRange(pkgVersion)}`]

    const { code } = await spawn(
      command,
      {},
      installDir,
      {stdin: "inherit", stdout: "inherit", stderr: "inherit"}
    )

    if (code != 0) throw new Error(`A critical error occured. There is likely more information above.`)

    const installedVersion: string = formatVersion(await getInstalled(installDir, pkgName))
    log("Installed", colorMe.brightCyan(`${pkgName}@${installedVersion}`))

    this.cache[pkgName][installedVersion] = installDir
    return installDir
  }

  async resolve(pkg: string): Promise<string> {
    this.#assert_ready()

    const pkgName: string = "@" + pkg.split("@")[1]
    const pkgVersionString: string = pkg.split("@")[2] ?? "*"

    let pkgVersion: Range

    if (pkgVersionString === "latest") {
      pkgVersion = await getLatest(pkgName)
    } else {
      pkgVersion = parseRange(pkgVersionString)
    }

    const installDir = await this.#findExisting(pkgName, pkgVersion) ?? await this.#install(pkgName, pkgVersion)
    const pkgDir = joinPath(installDir, "node_modules", ...pkgName.split("/"))

    for (const loc of MAIN_LOCATIONS) {
      const entryPoint = joinPath(pkgDir, loc)
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
  cache?: Record<string, Record<string, string>>
}