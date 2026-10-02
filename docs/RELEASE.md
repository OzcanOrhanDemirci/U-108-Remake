# Releasing

## Before the tag: one version, four places

The version is written in four places, and all four have to agree:

| Where | What reads it |
| --- | --- |
| `package.json`, `version` | The package name of the release zip |
| `host/U108.csproj`, `<Version>` | The product version of `U-108.exe` |
| `src/story/surum.ts`, `SURUM` | The game: a returning player's memory is compared against it, and the character notices what changed |
| `CHANGELOG.md`, the top `## [x.y.z]` heading | The release notes |

`node tools/surum-denetle.mjs` compares them and exits with an error when they disagree. It runs on
every push.

When `SURUM` changes, decide what a returning player should hear about the change. In this game a
fix is never only a fix: `surumDegisti()` in `src/scenes/ziyaret.ts` gives each version its own
lines, and a player coming from an older version hears every change they missed, in order.

## What the pipeline does

Pushing a tag that starts with `v` runs [`.github/workflows/release.yml`](../.github/workflows/release.yml),
which:

1. Checks the tag against all four declared versions, and stops if any disagrees.
2. Takes the notes for that version out of `CHANGELOG.md`, and stops if there are none.
3. Type-checks the game.
4. Builds the package with `node tools/paketle.mjs --tam`: the game bundled and minified, the shell
   published self-contained for `win-x64`, so the .NET runtime is inside `U-108.exe`.
5. Zips it as `U-108-Remake-x.y.z-win-x64.zip` with `LICENSE`, both READMEs and the changelog, and
   writes its SHA-256 next to it.
6. Publishes the release with the zip and the checksum attached, the changelog section as its notes,
   a download note, the checksum and a link to the run that built it.

```bash
git tag -a v1.0.3 -m "1.0.3: ..."
git push origin v1.0.3
```

## Why the tag is checked against the source

The tag is what people quote. The version inside the game is what a returning player's memory is
compared against, and it decides what the character says about the change. A release where those
disagree is worse than no release: a player would be told about a change that is not there, or not
told about one that is.

## Why the notes come from the changelog

The notes on a release should be the ones written for that version by hand, not a list of commit
subjects assembled afterwards. They are in the changelog already, so the pipeline reads them out of
it, and a version nobody wrote up there is not published at all.

## Why the package is self-contained

A player should need nothing but Windows. A framework-dependent build is smaller, but asks a person
who only wants to play a short game to install the .NET Desktop Runtime first. The self-contained
build carries the runtime inside the executable, compressed.

The WebView2 Runtime is the one thing it does not carry: it is part of Windows 11, and Microsoft's
Evergreen installer provides it on Windows 10.

## What goes into a release, and what does not

The package is built only from what is in the repository. `tools/paketle.mjs` can lay a local,
ignored `yerel/` folder over the game folder, so that one computer can keep files that are not
published; it does that **only** for the personal build and never with `--tam`. A release does not
depend on anybody's computer.

## Building a package by hand

```bash
node tools/paketle.mjs           # personal build: framework-dependent, yerel/ applied, dist/U-108.exe
node tools/paketle.mjs --tam     # release build: self-contained, zipped, with its SHA-256
```

The release build is written to `dist/U-108-Remake-x.y.z-win-x64.zip`. Before giving it to anyone,
check it the way the pipeline's tests do, without opening a window:

```powershell
$env:U108_TEST = '1'; $env:U108_SAHNE = 'sahne=ziyaret&bitmis=1&sifirla=1'; $env:U108_BEKLE = '12'
.\dist\U-108.exe
Get-Content "$env:TEMP\u108_test\sonuc.json"
```

The shell opens off screen, muted and without focus, exercises the bridge, saves a picture to
`%TEMP%\u108_test\goruntu.png` and closes. It writes to that folder instead of the real memory file
and the desktop.

## The executable is not signed

There is no code-signing certificate, so Windows SmartScreen may ask before the first launch. What
the project offers instead is a checksum next to every zip and a public run that shows how the zip
was made. [SECURITY.md](../SECURITY.md) tells players how to compare the two.
