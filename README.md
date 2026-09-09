# csag-blueprint-react

React packages for applications built on the CSAG Blueprint. Extracted from
[`neolution-ch/csag-blueprint-web`](https://github.com/neolution-ch/csag-blueprint-web) — the
pre-extraction history of every file here lives in that repository.

> **Two organisations, on purpose.** The GitHub org is `neolution-ch`; the npm scope is
> `@collana-solutions`. Neither derives from the other.

## Packages

Published to [npmjs.com/org/collana-solutions](https://www.npmjs.com/org/collana-solutions).

| Package                                                                       | What it is                                                                                                    |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [`@collana-solutions/blueprint-core`](packages/blueprint-core#readme)         | RFC 9457 ProblemDetails vocabulary and the FastEndpoints error parser. No React, no Mantine.                  |
| [`@collana-solutions/blueprint-i18n`](packages/blueprint-i18n#readme)         | Typed translation kit: context factory, client cache and ETag helpers, empty-translations recovery guard.     |
| [`@collana-solutions/blueprint-form-kit`](packages/blueprint-form-kit#readme) | TanStack Form + Mantine + Zod form kit.                                                                       |
| [`@collana-solutions/blueprint-api-kit`](packages/blueprint-api-kit#readme)   | Axios and TanStack Query plumbing for an ASP.NET backend: error notifications, query client, Orval instances. |
| [`@collana-solutions/blueprint-zod-kit`](packages/blueprint-zod-kit#readme)   | Zod v4 integration for a .NET backend: the Orval `stringFormat` polyfill and a localized error map.           |
| [`@collana-solutions/blueprint-theming`](packages/blueprint-theming#readme)   | White-label tenant theming: one brand hex to a full Mantine colour tuple plus CSS custom properties.          |

## Versioning

All packages are **released in lockstep** — every release bumps all of them to the same version.
Install them at the same version and upgrade them together.

While on `0.x`: **breaking changes are a `minor`, fixes are a `patch`.** The `alpha`/`beta`/`rc`
channels are reserved for staging `1.0.0`. This matches the convention in the sibling
[`Csag.Blueprint`](https://github.com/neolution-ch/Csag.Blueprint) NuGet repository.

## Local development

```bash
corepack enable
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm check-exports
```

`pnpm install` enforces a 14-day `minimumReleaseAge` floor as a supply-chain mitigation, so a
dependency published in the last two weeks will fail the install rather than resolve. That is
deliberate; add a documented, time-boxed `minimumReleaseAgeExclude` entry only if you must.

## Testing a change against the blueprint app

Every PR publishes an installable preview build of each package. In a `csag-blueprint-web` branch:

```bash
cd src/Web.Frontend
pnpm add https://pkg.pr.new/@collana-solutions/blueprint-form-kit@<commit-sha>
```

That validates the real, packed artifact — the `exports` map, the emitted types, the peer
resolution — before anything is released to a permanently version-burned npm version.

## Release process

Follows the [neolution-ch release playbook](https://github.com/neolution-ch/release-playbook)
(Changesets, public npm variant).

1. Add a changeset to your PR: `pnpm changeset`. CI fails without one.
2. Merging to `main` opens or updates a **chore: version packages** PR.
3. Merging that PR publishes every package and creates the GitHub Releases.

Dependabot PRs get a changeset generated automatically. A **manual** dependency bump does not —
add one yourself.

## Setup still outstanding

Nothing can be published until these are done. Listed here rather than in an issue so the
next person to touch the release pipeline sees them.

| What                                         | Why it blocks                                                                                                                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create the `NPM_TOKEN` secret                | A granular npm token scoped to `@collana-solutions`, read/write. The Release job currently runs with an empty `NODE_AUTH_TOKEN`, which is harmless only while changesets are still pending. |
| Make the repository public                   | The blueprint app's docs deep-link into these files at their release tags, the way `docs/security/CSRF.md` already does for the NuGet sibling.                                              |
| Branch protection on `main` and `release/**` | Require the **Changeset Check** and **Verify** status checks. They only become selectable once CI has run, which it now has.                                                                |
| Add `CHANGESETS_BOT_*` as Dependabot secrets | Dependabot has a secret store separate from Actions, and cannot read Actions secrets.                                                                                                       |
| Install the pkg.pr.new GitHub App            | `.github/workflows/pkg.pr.new.yml` is parked behind `workflow_dispatch` until then; it fails with a 404 without the App. The file carries the triggers to restore.                          |

Two known holds:

- **TypeScript stays on 6.x.** `typescript-eslint` refuses to load under TS 7 ("typescript-eslint
  does not support TS 7.0"), so a major bump turns Lint red while type-checking itself passes.
  Major updates for `typescript` are ignored in `.github/dependabot.yml` until that lands.
- **`prettier --check` fails on a Windows checkout.** The repo normalizes to LF, `.editorconfig`
  sets `end_of_line = lf`, and a CRLF working tree fails every file. CI runs on Linux and is
  unaffected. Use `pnpm exec prettier --check . --end-of-line auto` locally.

## Divergences from the org standard

Deliberate, and listed so they are not mistaken for drift.

| Area            | Here                                                           | Org precedent                                                           | Why                                                                                                                                                                                                                                                                                                                                                   |
| --------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build           | `tsdown` (rolldown), ESM only, unminified                      | rollup + `rollup-plugin-typescript2` + terser, emitting cjs/esm/umd     | These packages export React Context objects, and dual CJS/ESM publishing is the classic dual-package hazard — one resolved copy of a context silently fails to match the other. There is no CJS or UMD consumer, `rollup-plugin-typescript2` is unmaintained against TypeScript 6, and minifying a library only destroys the consumer's stack traces. |
| Formatting      | Matches the consuming app (`semi: false`, `singleQuote: true`) | `printWidth: 140`, semicolons, double quotes                            | Keeps the extraction a file move rather than a whole-tree reformat, and keeps cherry-picks between the two repos from conflicting on every line.                                                                                                                                                                                                      |
| Manifest        | `exports` only                                                 | plus `umd:main`, `jsdelivr`, `unpkg`, `jsnext:main`, `module`, `source` | Every one of those is read by a tool this repo does not use. `publint` and `attw` run in CI to keep the remaining shape honest.                                                                                                                                                                                                                       |
| Package manager | pnpm 11                                                        | yarn 1                                                                  | Changesets v3 dropped Yarn Classic support.                                                                                                                                                                                                                                                                                                           |

## License

MIT
