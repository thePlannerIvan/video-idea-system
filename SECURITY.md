# Security

Video Idea System includes a local read-aloud review face, and it reads source material you point it at. Neither of those is meant to be exposed to a network.

## Local-Only Assumption

The review page is served by the shared seam's local host (`planners-review-core`: `scripts/review-host.mjs`, and `scripts/serve-review.mjs` when there is no plugin host). The default port is auto-selected (`--port 0`), and the host is bound to loopback and opened in your own browser.

Do not expose this to the public internet unless you have added your own authentication, access control, and deployment hardening.

## Approvals

There is **no approval key or passphrase**. Nothing in this Skill reads one, so any document claiming a key is required would describe a path that does not exist.

What actually separates the author's decision from model-generated state is the review handshake:

- The review page is generated against a snapshot, and a submission carries the matching one-time `review_id`. An old browser tab cannot approve a new version.
- The read-aloud review is a real gate: the author reads the script aloud and saves feedback, or explicitly says the current draft needs no further reading. A model cannot record that on the author's behalf.
- Submissions land in `review-submissions.json` (the host writes what the page sends; `scripts/review-inbox.mjs` receives it).
- To cite author approval in a formal workflow, cite the review provenance in the feedback file, not a key.

## Credentials And Source Material

- This Skill has no API keys of its own. It does not call a transcription or generation service.
- Source material you give it (documents, transcripts, images, client decks) stays on your machine and is not uploaded by this Skill.
- If you add your own credentials for any extension, keep them in a local `.env` that is never committed. The shipped `.gitignore` blocks `.env`, `.env.*` (with `.env.example` allowed through), `*.pem`, and `*.key`.

## Reporting Security Issues

Please report security issues privately:

- Email: Lawyif@163.com
- Website: https://demyth.info

Include the affected script, reproduction steps, and expected impact.
