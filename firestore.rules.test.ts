/**
 * ZAD Foods — Firestore Security Rules Verification Spec (Dirty Dozen)
 *
 * Documents and verifies the 12 adversarial payloads against firestore.rules.
 * Run with Firebase Emulator Suite (`@firebase/rules-unit-testing`) when testing locally.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  actor: 'anonymous' | 'customer_a' | 'customer_b' | 'spoofed_unverified_admin' | 'verified_owner';
  payload?: Record<string, unknown>;
  expected: 'ALLOW' | 'PERMISSION_DENIED';
  enforcedBy: string;
}

export const DIRTY_DOZEN_SECURITY_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Self-Admin Escalation',
    collection: '/admins/attacker-uid',
    operation: 'create',
    actor: 'customer_a',
    payload: { uid: 'attacker-uid', email: 'attacker@example.com', displayName: 'Attacker', role: 'owner' },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isOwnerAdmin() gate on /admins/{uid}',
  },
  {
    id: 2,
    name: 'Unverified Admin Email Spoof',
    collection: '/products/honey-nuts',
    operation: 'update',
    actor: 'spoofed_unverified_admin',
    payload: { status: 'draft' },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isVerifiedUser() requiring request.auth.token.email_verified == true',
  },
  {
    id: 3,
    name: 'PII Blanket Scrape on Orders',
    collection: '/orders',
    operation: 'list',
    actor: 'customer_a',
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'allow list checks resource.data.customerUid == request.auth.uid',
  },
  {
    id: 4,
    name: 'Cross-User Order Read',
    collection: '/orders/order-of-user-a',
    operation: 'get',
    actor: 'customer_b',
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'PII isolation gate: isAdmin() || existing().customerUid == request.auth.uid',
  },
  {
    id: 5,
    name: 'Order Tracking Collection Enumeration',
    collection: '/orderTracking',
    operation: 'list',
    actor: 'anonymous',
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'allow list: if isAdmin() on /orderTracking/{orderNumber}',
  },
  {
    id: 6,
    name: 'Order Status Spoofing on Create',
    collection: '/orders/ZAD-20261119-0001',
    operation: 'create',
    actor: 'anonymous',
    payload: { status: 'delivered', paymentStatus: 'paid', stockDeducted: true },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'incoming().status == "pending" && incoming().stockDeducted == false',
  },
  {
    id: 7,
    name: 'Orphaned Order Without Tracking Doc',
    collection: '/orders/ZAD-20261119-0002',
    operation: 'create',
    actor: 'anonymous',
    payload: { orderNumber: 'ZAD-20261119-0002', status: 'pending' },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'existsAfter(/databases/$(database)/documents/orderTracking/$(incoming().orderNumber))',
  },
  {
    id: 8,
    name: 'Shadow Field Injection on Product',
    collection: '/products/honey-nuts',
    operation: 'create',
    actor: 'verified_owner',
    payload: { isShadowAdminFlag: true },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isValidProduct() data.keys().hasOnly([...])',
  },
  {
    id: 9,
    name: 'Oversized Document ID Poisoning',
    collection: '/inquiries/' + 'a'.repeat(200),
    operation: 'create',
    actor: 'anonymous',
    payload: { type: 'contact', status: 'new' },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isValidId(inquiryId) max 128 chars regex guard',
  },
  {
    id: 10,
    name: 'Draft Product Public Read Leak',
    collection: '/products/mini-honey-nuts',
    operation: 'get',
    actor: 'anonymous',
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'allow get: if existing().status == "published" || isAdmin()',
  },
  {
    id: 11,
    name: 'Customer Profile Role Escalation',
    collection: '/users/customer-a-uid',
    operation: 'create',
    actor: 'customer_a',
    payload: { uid: 'customer-a-uid', role: 'admin', isAdmin: true, wishlist: [] },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isValidCustomerProfile() forbids role/isAdmin keys via hasOnly',
  },
  {
    id: 12,
    name: 'Backdated Timestamp Tampering',
    collection: '/inquiries/inq-1',
    operation: 'create',
    actor: 'anonymous',
    payload: { type: 'newsletter', email: 'test@example.com', status: 'new', createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'incoming().createdAt == request.time',
  },
];
