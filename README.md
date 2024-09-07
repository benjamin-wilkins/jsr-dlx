# jsr-dlx

A basic utility for runnning JSR packages under Node on the command line. Based on a combination
of `yarn dlx` and `deno run`.

```sh
npx jsr-dlx [PACKAGE]
```

Essentially, `jsr-dlx` calls `npx jsr` to install the package to a temporary directory (the name
of which is stored in the user's cache directory so that subsequent calls to the same package
don't need to re-install every time) before searching for an entry point and running it through
`node`.