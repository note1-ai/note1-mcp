# MCP package release rule

Any change to the note1 MCP tool surface must automatically update this npm
package as part of the same task, including changes implemented in the hosted
API rather than this bridge. Cover additions, removals, names, schemas,
descriptions, annotations, permissions/scopes, and behavior.

- Keep README/tool documentation, examples, security guidance, and package
  metadata aligned with the hosted tools.
- Bump `package.json` and the lockfile root version consistently. Check npm for
  the current release and choose an unpublished semantic version.
- Do not change bridge behavior or dependencies merely to force a client change;
  documentation and metadata still require a package update.
- Run available tests/smoke checks and `npm publish --dry-run`; inspect the
  tarball for unintended files or secrets.
- Follow the user's authorized publication workflow. If publishing is requested,
  verify the published registry version/integrity. If authentication or another
  prerequisite is missing, report the npm release as pending rather than
  silently skipping it. A dry-run is not publication.
- An npm release does not deploy hosted tools or authorize unrelated merges or
  deployments. Preserve the user's branch/PR restrictions.

Never inspect, expose, or commit environment files or npm credentials.
