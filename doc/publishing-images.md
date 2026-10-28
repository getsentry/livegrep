# Publishing images

The `Publish image` workflow builds on pushes to `main` and can also be run
manually on `main`. It submits the Docker build to Cloud Build and publishes
`us-central1-docker.pkg.dev/internal-sentry/livegrep/image:VERSION`.

Versions have the form `0.1.0-RUN.ATTEMPT`, for example `0.1.0-1.1`. Each retry
gets a new version because the registry does not allow image tags to change.
The workflow creates the matching GitHub tag only after the image is uploaded.

Renovate in `getsentry/ops` watches these GitHub tags and proposes updates to
the codesearch image version. Apply those PRs through TACOS to deploy the web
service, backend, and indexer together.

## First build

1. Apply the livegrep build resources in
   `ops/terraform/internal-sentry/artifact-registry`.
2. Merge the publishing workflow and wait for its first successful build.
3. Set the codesearch version in ops to the tag that build published before
   applying the initial deployment PR. If the first build needed a retry,
   use the successful attempt's version.
