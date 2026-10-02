# Contributing

Thank you for looking. This document says how the repository is worked in, so that a change
written by someone else arrives in the same shape as the ones already here.

## Where this project came from

U-108 Remake is the remake of **Bootcamp Projesinden Kaçış**, a short Unity game made in 2023 by a
team of four at the Oyun ve Uygulama Akademisi bootcamp. It was the first game its author, Özcan,
ever finished. In 2026 it was rebuilt from nothing, without an engine, as a continuation of the
original rather than a copy of it. [README.md](README.md) tells that story; the 2023 project is at
[OzcanOrhanDemirci/U-108](https://github.com/OzcanOrhanDemirci/U-108).

That history is worth knowing before changing anything, because it decides what is open to change.

**Welcome:** defects, performance, the build and the packaging, accessibility, documentation, and
anything that helps the game run on more machines.

**Not open to change:** the story, the dialogue and the 2023 parts. The story is one person's first
game and its continuation; the 2023 opening reproduces the original from values read out of its
build, so a 2023 number that looks wrong is usually the 2023 number. If an idea touches any of
these, open an issue and say so. It will be read, but it is a conversation rather than a change.

**The game stays in Turkish.** There is no translation, by choice, and none is planned.

## Before you start

```bash
git clone https://github.com/OzcanOrhanDemirci/U-108-Remake.git
cd U-108-Remake
npm install
npm run dev                          # http://localhost:8108
npx playwright install chromium      # once, for the scene tests
```

You need Windows 10 or 11, Node.js 24 and the .NET 10 SDK. The game itself has no runtime
dependency: esbuild, TypeScript and Playwright are development tools and nothing of them ships.
The browser parameters that start a scene directly (`?sahne=orman`, `?sifirla=1` and the rest)
are listed in the README.

## The shape of a change

**One commit, one change.** A commit that fixes a bug and renames a variable is two commits.
`git log --oneline` should read like a list of decisions.

**The subject says what changed, in a short imperative line,** within 72 characters, in Turkish or
in English. The history so far is written in Turkish, and a commit that cuts a version starts with
the version: `1.0.2: "ilk miydim" ve üst üste çalan piyano`.

**The body says why.** A reviewer can read the diff. What they cannot read is the option you
rejected, and that is the part worth writing down.

**Branches are named after the change:** `fix/word-bridge-fall`, `perf/forest-fog`,
`docs/build-steps`.

**Spoilers stay folded.** Issues, pull requests and commit bodies are read by people who have not
played yet. Anything that gives the story away goes inside a `<details>` block.

## Pull requests

The [pull request template](.github/pull_request_template.md) asks four questions, and the fourth is
the one that matters most:

- **What** changed.
- **Why**, including the alternative you did not take.
- **Verification**: what you ran, and what you *looked at*. Not "it works".
- **Not verified**: what this change could break that nothing here checks.

A pull request that says what it did not prove is worth more than one that implies it proved
everything. The pipeline has to pass before anything is merged.

## Code

Read the file you are changing and match it. A few rules that are easy to miss:

- **Comments say why, never what,** and they are written in Turkish, like the rest of the code's
  comments.
- **No engine and no runtime dependency.** Everything on screen is drawn by code in this
  repository. A change that needs a library at runtime needs to say why it is worth it.
- **The 2023 mode is a reproduction, not a starting point.** `Controller2023`, the typewriter and
  the 2023 layouts use the values read from the 2023 build ([docs/ORIJINAL.md](docs/ORIJINAL.md)).
  They are not tuned.
- **Every looping sound keeps a handle and stops it on exit.** The 1.0.2 defect was a piano that
  nobody could stop; the music bus registry (`audio.calanMuzik`) exists so a test can count.
- **Numbers are named.** A literal in physics, a layout or an animation gets a name or a comment
  explaining the value.
- **No long dashes in documents.** Commas, colons, semicolons, parentheses or a plain hyphen. The
  pipeline checks.

## Verification

```bash
npm run typecheck                    # TypeScript, strict
node tools/surum-denetle.mjs         # the four places the version is written agree
node tools/denetle-tire.mjs          # no long dashes in the documents

# every scene opens, plays, draws something and raises no error
node tools/shot.mjs --url "?sahne=menu2023&sifirla=1" --script tools/senaryolar/duman.mjs --out shots/duman/d.png

# after "Baştan başla" exactly one piano plays
node tools/shot.mjs --url "?sahne=ziyaret&bitmis=1&sifirla=1" --script tools/senaryolar/muzik102.mjs --out shots/m/a.png --secim bastan
```

All of these run on every pull request. Two longer checks are worth running when a change touches
physics or the story's flow:

```bash
# the bot plays from the 2023 menu to the ending (about eleven minutes of game time)
node tools/shot.mjs --url "?sahne=menu2023&sifirla=1" --script tools/senaryolar/bot.mjs --out shots/bot/b.png

# the 2023 levels are still completable under the reproduced physics
node tools/shot.mjs --url "?sahne=menu2023" --script tools/senaryolar/plan2023.mjs --bolum 1
```

On a machine without a GPU, set `U108_YAZILIM=1` to render through SwiftShader, as the pipeline
does.

Beyond that, this project holds one rule above the rest:

> **Play it before saying it is done.**

A change that compiles and passes its tests and has never been looked at is not finished. Open the
scene it touches, play through the part it changes, and say in the pull request what you saw.

## Releasing

Releases are cut from `main` by pushing a tag. The version is written in four places and the
pipeline refuses to publish a tag that disagrees with any of them.
[docs/RELEASE.md](docs/RELEASE.md) has the full procedure.

## Reporting things

- **A defect or an idea:** open an [issue](https://github.com/OzcanOrhanDemirci/U-108-Remake/issues).
  Turkish or English are both fine.
- **A security problem:** do not open an issue. [SECURITY.md](SECURITY.md) says what to do instead.
- **Behaviour:** everyone taking part is held to the [Code of Conduct](CODE_OF_CONDUCT.md).
