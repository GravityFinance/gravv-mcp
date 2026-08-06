# Releasing

Publishing is automated. Creating a GitHub Release is the deliberate human step;
everything after it runs in CI.

Authentication uses **npm Trusted Publishing** over OIDC — there is no `NPM_TOKEN`
secret to create, rotate, or leak. npm verifies that a publish request came from this
repository running `publish.yml`, and issues a short-lived token scoped to that build.

---

## One-time setup

npm's Trusted Publisher settings live on a package's page, which only exists once the
package does. So the first release is manual and every release after it is automated.

### 1. Claim the scope

The `@gravv` scope must exist and you must be able to publish to it.

```bash
npm login
npm org ls gravv          # confirms the org exists and you are a member
```

If it does not exist, create the organisation named `gravv` on npmjs.com. Scoped
packages publish as private by default — `publishConfig.access` is already set to
`public` in `package.json`, so this does not need remembering at publish time.

### 2. Publish once, by hand

```bash
npm ci
npm test
npm run build
npm publish --dry-run     # inspect the file list before it is permanent
npm publish
```

Check the dry run output. Only `dist/` and `README.md` should appear — `src/`, `test/`,
and `specs/` must not. A published version can never be reused, only deprecated.

### 3. Wire trusted publishing

On npmjs.com, go to the package → **Settings** → **Trusted Publisher** → **GitHub
Actions**, and enter:

| Field | Value |
|---|---|
| Organization or user | `GravityFinance` |
| Repository | `gravv-mcp` |
| Workflow filename | `publish.yml` |
| Allowed actions | `npm publish` |

Leave **Environment name** empty unless you add a GitHub deployment environment.

### 4. Confirm it works

Actions → **Publish to npm** → **Run workflow**, leaving *dry run* checked. It runs
every check and packs the tarball without publishing. A green run means the next real
release will work.

---

## Every release after that

```bash
# 1. Bump the version. Use the level that matches the change.
npm version patch      # or minor / major

# 2. Push the commit and the tag it created
git push --follow-tags
```

Then on GitHub: **Releases** → **Draft a new release** → pick the `vX.Y.Z` tag → write
the notes → **Publish release**.

That fires `publish.yml`, which typechecks, tests, builds, verifies the version matches
the tag, inspects the tarball, and publishes with provenance attached.

### Versioning

This package wraps a payments API, so version changes carry meaning for people whose
integrations depend on it.

- **patch** — bug fixes, doc changes, better tool descriptions
- **minor** — new tools, new toolsets, new configuration options
- **major** — a renamed or removed tool, a changed tool input shape, a changed default
  that alters which tools load, or any change that loosens a safety guarantee

Renaming a tool is a breaking change even though the API underneath did not move: an
assistant that learned the old name will fail.

---

## Provenance

Publishing from a public repository via trusted publishing attaches a provenance
attestation automatically. Consumers can verify a published version was built from a
specific commit in this repository:

```bash
npm audit signatures
```

This matters more here than for most packages — this software is handed a live payments
API key, and provenance is what lets a security reviewer confirm the published artifact
matches the source they read.

---

## If a release goes wrong

Do not delete and re-publish a version. npm versions are immutable, and anyone who
already installed it keeps the broken copy.

```bash
npm deprecate @gravv/mcp@X.Y.Z "Broken: <reason>. Use X.Y.Z+1."
```

Then fix forward with a new patch version. `npm unpublish` is only available within 72
hours and breaks anyone who already depends on the version.

If a credential is ever committed, rotate it first and treat unpublishing as secondary —
the package tarball is mirrored widely within minutes.
