# Members and roles

Linear-style workspace members. Not a new CMS. This is who can run this Sling workspace.

## Roles (high → low)

| UI name | Stored value | Rights |
|---|---|---|
| Owner | `owner` | Members + publish + review. First person in the workspace. Last owner cannot be removed or demoted. |
| Admin | `admin` | Invite, change roles (not Owner), remove members, review, publish. |
| Publisher | `publisher` | Review and publish widgets. Cannot manage people. |
| Member | `user` | Use Studio. Submit for review. Cannot publish or manage people. |

## Workspace

Every user has `workspaceKey`.

- Open signup creates a **new** workspace. That user is Owner. `workspaceKey` = their email.
- Accepting an invite joins the **inviter's** workspace. Same widgets, theme, review queue.
- API `clientId` is `workspaceKey`, not the signed-in email. That is how two people share one site.

Existing users with no key: on login, `workspaceKey = email`. If that workspace has no Owner, the oldest member becomes Owner. That makes the first real account (you) Owner without a DB script.

## Invites

Owner or Admin invites by email + role (Member, Publisher, or Admin).

- Creates a pending invite (7 days).
- Returns a link. Email is sent when SMTP works. Link can always be copied.
- Accept: name + password → user in that workspace with the invited role.
- Invite email that already belongs to the workspace is rejected.
- Revoke pending invite.

No Guest role in v1.

## Settings → Members

List people in this workspace + pending invites.

- Change role (Owner/Admin only). Cannot create a second Owner. Cannot demote the last Owner.
- Remove member (not the last Owner, not yourself if you are the last Owner).
- Invite form on the right/primary action.

## Out of scope

Billing seats, SSO, Guest, custom roles, audit log of role changes.
