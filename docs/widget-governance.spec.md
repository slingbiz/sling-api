# Widget history, restore, and audit

Governed widgets remember what changed. You can restore an older version as a draft. Owners and Admins can see who did what in the workspace.

v1 is **widgets only**. Not pages, routes, layouts, media, or theme history.

## History vs Audit

History is the versions of **one widget** — snapshots you can restore.

Audit is the **workspace activity log** — who did what. Settings → Audit. Owner and Admin only (same gate as Members).

Do not mix these jobs. History is not a workspace log. Audit is not a restore button.

## History (one widget)

Open a widget → History.

Every real change is a version: create, save, AI generate over a draft, submit, publish, restore. Approve and reject are versions too (the status changed).

Each version stores the code and the fields needed to restore (title, description, key, props, meta), plus status, version number, who did it, when, and the action (save, submit, publish, approve, reject, restore, generate).

Existing widgets with no history get the current widget saved as the first version the first time someone opens History. History is never an empty lie.

Anyone in the workspace can view History.

Click a version to read it. Code is read-only. No diff UI in v1.

## Restore

Owner, Admin, or Publisher can restore. Members can look, not restore.

Confirm in a modal. Restore is always visible, never hover-only.

Restore copies that version into the widget, makes it a **draft**, and adds a new version with action Restore. Old versions stay. History is append-only. Do not delete snapshots.

The live site does not change until someone publishes again.

Copy: restored as a draft; publish to put it on the live site.

## Audit (the workspace)

Settings → Audit. Owner and Admin only — same gate as Members.

This is who did what in this workspace, not the versions of one widget.

Widget generate, save, submit, approve, reject, publish, update, and restore are logged. Theme updates stay logged. Widget update was silent; it is logged now. Restore is logged.

If the log write fails, the widget save still succeeds. We still always try to write the log.

Newest first. Paginate. Search. Filter by action when it is cheap. Show the person's name when we have it.

Do not invent events. Do not log role changes.

Empty state tells them nothing has been governed yet — generate or save a widget.

## Out of scope

Page, route, layout, media, and theme history. Diff UI beyond opening an old version read-only. Export. Billing. SSO. Guest. Auto-publish on restore. Rewriting git history. Role-change audit.
