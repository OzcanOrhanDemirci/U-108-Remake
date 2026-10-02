# Security

## What the game can reach

Knowing the shape of the application is most of the answer to what can go wrong with it, so it is
worth stating plainly.

- **The game makes no network requests of its own.** It runs in WebView2 inside a small WinForms
  shell, which maps the game folder to a virtual origin, `https://u108.oyun/`. That address never
  leaves the computer: nothing is served over a network and nothing is fetched from one.
- **There is no account, no login, no API key and no server.** There is no credential in the
  application to steal and none in the repository to leak.
- **There is no analytics, no crash reporting and no advertising.** Nothing is sent anywhere.

The game talks to the shell through a short list of JSON messages, and the shell does only this with
them:

| | Path | Why |
| --- | --- | --- |
| Writes | `%APPDATA%\U-108\hafiza.json` | The character's memory: progress, the name you give, his notes, the version he last saw |
| Writes, once | `Desktop\Sana.txt` (for Özcan, `Özcan'a.txt`) | A short letter, written when the game ends. An existing file is never overwritten |
| Writes | `%LOCALAPPDATA%\U-108\WebView2` | WebView2's own cache |
| Reads | Your Windows user name | To know whether it is talking to Özcan |
| Reads | `Desktop\U-108\U-108_Build_1.1\` | Whether the 2023 build is there, and the date it was built |
| Reads | `C:\dev\claude_memory\hafiza\u108\*.md` | If it exists, the note Claude keeps about this project, which the game quotes. Read only |

Besides these, the shell sets the window title, switches full screen and closes itself. In its
invisible test mode (`U108_TEST=1`) it writes the memory, the letter and its results to
`%TEMP%\u108_test` instead of the places above.

- **One operation is present and unused.** The shell can start the 2023 build from the desktop
  (`orijinaliAc` in `host/Program.cs`). Nothing in the game calls it; it is listed here so that
  nobody has to find it to know about it.
- **The WebView2 Runtime is Microsoft's,** installed with Windows 11 and updated by Windows. Its own
  behaviour is outside this repository.

All of this is in [`host/Program.cs`](host/Program.cs), which is under two hundred lines, and reading
it is the way to confirm it.

## Supported versions

The most recent release is the supported one. Older versions receive nothing.

| Version | Supported |
| --- | --- |
| 1.0.x | Yes |

Releases are listed on the
[releases page](https://github.com/OzcanOrhanDemirci/U-108-Remake/releases).

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Use GitHub's
[private vulnerability reporting](https://github.com/OzcanOrhanDemirci/U-108-Remake/security/advisories/new),
or write to **ozcanorhandem@gmail.com** with `U-108 Remake security` in the subject.

Please include what you found, the version or commit you found it in, and the steps to reach it. A
report that can be reproduced is worth far more than one that has to be guessed at.

You can expect an acknowledgement within **three days** and an assessment within **seven**. If the
report is valid you will be told what the fix is and when it ships, and you will be credited in the
[changelog](CHANGELOG.md) unless you would rather not be.

## Verifying a download

Every release is built by the [release workflow](.github/workflows/release.yml) from the tagged
source, and the page of each release links the run that built it. Next to the zip there is a
`.sha256` file. Before running a package that claims to be this game, compare the two:

```powershell
Get-FileHash .\U-108-Remake-1.0.2-win-x64.zip -Algorithm SHA256
Get-Content .\U-108-Remake-1.0.2-win-x64.zip.sha256
```

The executable is not code-signed. Windows SmartScreen may therefore ask for confirmation before the
first launch; the checksum, and the public run that produced the package, are what this project
offers instead of a signature. A package whose checksum does not match did not come from here.
