# ZAD Foods — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default Deny**: All unmatched paths under `/databases/{database}/documents` are denied for both read and write.
2. **Admin RBAC & Email Verification**: Administrative privileges require `request.auth != null && request.auth.token.email_verified == true` AND either the bootstrapped owner email (`arafatsunnythree@gmail.com`) or an existing document at `/admins/$(request.auth.uid)`. No user can self-register into `/admins` or assign themselves a `role` field in `/users`.
3. **PII Isolation**:
   - `/orders/{orderId}` contains customer phone numbers and addresses; `get` and `list` are strictly restricted to `isAdmin()` or `resource.data.customerUid == request.auth.uid`.
   - `/orderTracking/{orderNumber}` stores zero PII (no name, phone, or street address) and permits single-document `get` only (`list` restricted to `isAdmin()`).
   - `/inquiries/{inquiryId}` permits public `create` with `status == 'new'`, while `get`/`list`/`update`/`delete` are strictly `isAdmin()`.
   - `/users/{userId}` restricts `get` to `isOwner(userId) || isAdmin()` and `list` to `isAdmin()`.
4. **Atomicity Guarantee**: Creating an order at `/orders/{orderId}` requires `existsAfter(/databases/$(database)/documents/orderTracking/$(incoming().orderNumber))` so every order has a synchronized non-PII tracking record.
5. **Catalog Integrity**: Public visitors can only read `products` with `status == 'published'` (draft/archived products require `isAdmin()`). Only admins can create, edit, or delete products, categories, settings, media, and stock logs.
6. **Temporal Integrity & Immutability**: `createdAt` must equal `request.time` on creation and remain immutable on updates; `updatedAt` must equal `request.time` on updates.
7. **Strict Key & Volumetric Validation**: Every entity has an `isValid[Entity](data)` helper enforcing `hasAll`/`hasOnly`, strict type checks, string `.size()` ceilings, bounded arrays, and regex ID guards (`^[a-zA-Z0-9_\-]+$`).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Self-Admin Escalation**: Unprivileged user attempts `create` on `/admins/{theirUid}` with `{ role: 'owner' }`. Must fail (`PERMISSION_DENIED`).
2. **Unverified Admin Email Spoof**: Request with `email: 'arafatsunnythree@gmail.com'` and `email_verified: false` attempts `update` on `/products/{id}`. Must fail.
3. **PII Blanket Scrape on Orders**: Authenticated non-admin user attempts `list` on `/orders` without matching `customerUid`. Must fail.
4. **Cross-User Order Read**: User B attempts `get` on User A's `/orders/{orderId}`. Must fail.
5. **Tracking Enumeration**: Public user attempts `list` on `/orderTracking`. Must fail.
6. **Order Status Spoofing on Create**: Guest creates `/orders/{id}` with `status: 'delivered'` and `paymentStatus: 'paid'`. Must fail (must be `pending` and `unpaid`/`pending_verification`).
7. **Orphaned Order Without Tracking Doc**: Guest creates `/orders/{id}` without atomically creating `/orderTracking/{orderNumber}`. Must fail via `existsAfter`.
8. **Shadow Field Injection on Product**: Admin or attacker writes `isSecretAdmin: true` ghost key into `/products/{id}`. Must fail via `hasOnly`.
9. **Resource Poisoning / Oversized ID**: Attacker writes document with 500-char ID or 50KB `customerName`. Must fail via `isValidId` and `.size()`.
10. **Draft Product Leak**: Public visitor attempts `get` on `/products/mini-honey-nuts` where `status == 'draft'`. Must fail.
11. **Customer Profile Role Injection**: Signed-in user writes `{ role: 'admin', isAdmin: true }` into `/users/{uid}`. Must fail via `hasOnly`.
12. **Backdated Timestamp Tampering**: Client submits `createdAt: Timestamp(2020-01-01)` instead of `serverTimestamp()` (`request.time`). Must fail.
