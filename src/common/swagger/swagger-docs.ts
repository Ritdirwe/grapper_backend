type SwaggerAudience = 'client' | 'provider' | 'admin' | 'shared' | 'internal';
type SwaggerOwner = 'client' | 'provider' | 'admin' | 'shared' | 'internal';

type SwaggerOperation = {
  tags?: string[];
  summary?: string;
  description?: string;
  responses?: Record<string, { description?: string; [key: string]: unknown }>;
  [key: string]: unknown;
};

type SwaggerPathItem = {
  [method: string]: SwaggerOperation | unknown;
};

type SwaggerDocument = Record<string, any>;

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);
const SWAGGER_AUDIENCE_VALUES: SwaggerAudience[] = ['client', 'provider', 'admin', 'shared', 'internal'];

const ADMIN_TAGS = new Set([
  'Admin Moderation',
  'Admin User Management',
  'Admin Permissions',
  'Admin Overview',
  'System Reporting & Analytics',
]);

const PROVIDER_TAGS = new Set(['Provider Profiles', 'Provider Payouts']);

const TAG_DESCRIPTIONS: Record<string, { description: string; group: string }> = {
  Authentication: {
    description: 'Authentication, account verification, token lifecycle, and session role switch.',
    group: 'Shared Access',
  },
  'User Profiles': {
    description: 'Profile retrieval and profile updates for authenticated users.',
    group: 'Shared Access',
  },
  'Provider Profiles': {
    description: 'Provider profile onboarding, availability, portfolio, and public provider discovery.',
    group: 'Provider Workspace',
  },
  'User Preferences': {
    description: 'User-level preference and privacy configuration endpoints.',
    group: 'Shared Access',
  },
  PayoutMethod: {
    description: 'Provider payout method registration, update, and default selection.',
    group: 'Provider Workspace',
  },
  'Marketplace Services': {
    description: 'Service listing creation, publishing, and catalog retrieval endpoints.',
    group: 'Marketplace',
  },
  'Service Categories': {
    description: 'Service category metadata and catalog classification endpoints.',
    group: 'Marketplace',
  },
  Discovery: {
    description: 'Recommendations, trending, and search endpoints across marketplace resources.',
    group: 'Marketplace',
  },
  'Service Bookings': {
    description: 'Booking lifecycle endpoints for customer and provider participants.',
    group: 'Marketplace',
  },
  'Service Orders': {
    description: 'Order-level workflow actions linked to booking fulfillment.',
    group: 'Marketplace',
  },
  Contracts: {
    description: 'Contract creation, milestone tracking, and collaboration document endpoints.',
    group: 'Marketplace',
  },
  'Service Reviews': {
    description: 'Review creation, responses, and feedback engagement endpoints.',
    group: 'Marketplace',
  },
  'Gigs & Proposals': {
    description: 'Gig publishing and proposal workflow endpoints for service matching.',
    group: 'Marketplace',
  },
  Proposals: {
    description: 'Proposal management and retrieval endpoints.',
    group: 'Marketplace',
  },
  'Payments & Transactions': {
    description: 'Transaction initialization, verification, and payment history endpoints.',
    group: 'Finance',
  },
  'Provider Payouts': {
    description: 'Provider balance, payout requests, releases, and payout operations.',
    group: 'Finance',
  },
  'Subscription Plans': {
    description: 'Subscription plan listing and administrative plan management endpoints.',
    group: 'Finance',
  },
  Subscriptions: {
    description: 'Subscription creation, status retrieval, and cancellation endpoints.',
    group: 'Finance',
  },
  'Social Posts': {
    description: 'Social post publishing, feed retrieval, and interaction endpoints.',
    group: 'Community',
  },
  'Social Comments': {
    description: 'Comment threads and reactions on social posts.',
    group: 'Community',
  },
  'Social Shares': {
    description: 'Social sharing actions and shared content retrieval.',
    group: 'Community',
  },
  'Social Follows': {
    description: 'Follow graph management between platform users.',
    group: 'Community',
  },
  'Real-time Messaging': {
    description: 'Conversation and message exchange endpoints for direct communication.',
    group: 'Community',
  },
  Ad: {
    description: 'Advertisement management and ad interaction endpoints.',
    group: 'Community',
  },
  AdPublic: {
    description: 'Public advertisement listing endpoints available without authentication.',
    group: 'Community',
  },
  Storage: {
    description: 'File upload and storage integration endpoints.',
    group: 'Shared Access',
  },
  'Push Notifications': {
    description: 'Push registration and notification dispatch endpoints.',
    group: 'Community',
  },
  'User Analytics': {
    description: 'Self-service analytics endpoints scoped to the authenticated user.',
    group: 'Shared Access',
  },
  'Admin Overview': {
    description: 'Administrative platform overview and maintenance endpoints.',
    group: 'Admin Operations',
  },
  'Admin Moderation': {
    description: 'Administrative moderation workflows for content, disputes, and booking enforcement.',
    group: 'Admin Operations',
  },
  'Admin User Management': {
    description: 'Administrative user lifecycle, verification, and enforcement actions.',
    group: 'Admin Operations',
  },
  'Admin Permissions': {
    description: 'Role and permission matrix management endpoints.',
    group: 'Admin Operations',
  },
  'System Reporting & Analytics': {
    description: 'Administrative reports, exports, and platform-wide analytics endpoints.',
    group: 'Admin Operations',
  },
  Health: {
    description: 'Runtime health endpoint for service liveness checks.',
    group: 'System',
  },
};

const RESPONSE_FALLBACK: Record<string, string> = {
  '200': 'Request completed successfully.',
  '201': 'Resource created successfully.',
  '202': 'Request accepted for asynchronous processing.',
  '204': 'Request completed successfully with no response body.',
  '400': 'Request validation failed or payload is malformed.',
  '401': 'Authentication is required or provided credentials are invalid.',
  '403': 'Authenticated user is not authorized to perform this action.',
  '404': 'Requested resource was not found.',
  '409': 'Request conflicts with the current state of the resource.',
  '422': 'Request payload is semantically invalid for this operation.',
  '429': 'Too many requests sent in a short time window.',
  '500': 'Unexpected server error while processing the request.',
};

const OWNER_OVERRIDES: Record<string, SwaggerOwner> = {
  'GET /api/provider-profiles/search': 'shared',
  'GET /api/provider-profiles/{userId}': 'shared',
  'POST /api/profiles/setup-payout': 'provider',
  'GET /api/profiles/verify': 'provider',
  'POST /api/profiles/me/verification': 'provider',
  'GET /api/profiles/me/verification': 'provider',
};

function isOperation(value: unknown): value is SwaggerOperation {
  return Boolean(value) && typeof value === 'object';
}

function toTitleCase(value: string): string {
  return value
    .replace(/[{}]/g, '')
    .split(/[-_/]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function inferSummary(path: string, method: string): string {
  if (path === '/') {
    return 'Health check';
  }

  const segments = path.split('/').filter(Boolean).slice(1);
  const resource = segments.length > 0 ? toTitleCase(segments[segments.length - 1]) : 'Resource';
  const actionByMethod: Record<string, string> = {
    get: 'Retrieve',
    post: 'Create',
    put: 'Replace',
    patch: 'Update',
    delete: 'Delete',
    head: 'Inspect',
    options: 'Inspect options for',
  };
  const action = actionByMethod[method] || 'Handle';
  return `${action} ${resource}`.trim();
}

function isAdminAction(path: string, operation: SwaggerOperation): boolean {
  const loweredPath = path.toLowerCase();
  const tags = operation.tags || [];
  const text = `${operation.summary || ''} ${operation.description || ''}`.toLowerCase();

  if (
    loweredPath.startsWith('/api/admin') ||
    loweredPath.startsWith('/api/moderation') ||
    loweredPath.startsWith('/api/reporting')
  ) {
    return true;
  }

  if (loweredPath.includes('/releases/admin') || loweredPath.endsWith('/process')) {
    return true;
  }

  if (tags.some((tag) => ADMIN_TAGS.has(tag))) {
    return true;
  }

  return text.includes('admin') && !loweredPath.includes('/me');
}

function isInternalAction(path: string): boolean {
  const loweredPath = path.toLowerCase();
  return loweredPath.includes('/webhook') || loweredPath.includes('/maintenance');
}

function isProviderAction(path: string, method: string, summary: string): boolean {
  const loweredPath = path.toLowerCase();
  const loweredSummary = summary.toLowerCase();
  const upperMethod = method.toUpperCase();

  if (
    loweredPath.startsWith('/api/provider-profiles/me') ||
    loweredPath.startsWith('/api/payout-methods') ||
    loweredPath.startsWith('/api/payouts')
  ) {
    return true;
  }

  if (loweredPath === '/api/services/my-services') {
    return true;
  }

  if (
    loweredPath.startsWith('/api/services') &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod)
  ) {
    return true;
  }

  if (
    loweredPath.includes('/provider-bookings') ||
    loweredPath.includes('/provider-orders') ||
    loweredPath.endsWith('/confirm') ||
    loweredPath.endsWith('/start') ||
    loweredPath.endsWith('/start-work') ||
    loweredPath.endsWith('/deliver') ||
    loweredPath.endsWith('/pay-commission')
  ) {
    return true;
  }

  return loweredSummary.includes('provider') || loweredSummary.includes('portfolio');
}

function isClientAction(path: string, method: string): boolean {
  const loweredPath = path.toLowerCase();
  const upperMethod = method.toUpperCase();

  if (
    loweredPath === '/api/bookings/my-bookings' ||
    loweredPath === '/api/orders/my-orders' ||
    loweredPath.endsWith('/approve') ||
    loweredPath.endsWith('/correction') ||
    loweredPath.endsWith('/pay-correction') ||
    (loweredPath.startsWith('/api/bookings/') && loweredPath.endsWith('/checkout'))
  ) {
    return true;
  }

  if ((loweredPath === '/api/bookings' || loweredPath === '/api/orders') && upperMethod === 'POST') {
    return true;
  }

  if (loweredPath.endsWith('/cancel') && loweredPath.includes('/orders/')) {
    return true;
  }

  return false;
}

function inferOwner(path: string, operation: SwaggerOperation): SwaggerOwner {
  const method = typeof operation['x-http-method'] === 'string' ? operation['x-http-method'] : 'get';
  const summary = operation.summary?.trim() || '';
  const overrideKey = `${method.toUpperCase()} ${path}`;

  if (OWNER_OVERRIDES[overrideKey]) {
    return OWNER_OVERRIDES[overrideKey];
  }

  if (isInternalAction(path)) {
    return 'internal';
  }

  if (isAdminAction(path, operation)) {
    return 'admin';
  }

  const tags = operation.tags || [];
  if (tags.some((tag) => PROVIDER_TAGS.has(tag))) {
    return 'provider';
  }

  if (path.startsWith('/api/auth') || path.startsWith('/api/preferences') || path.startsWith('/api/profiles')) {
    return 'shared';
  }

  if (isProviderAction(path, method, summary)) {
    return 'provider';
  }

  if (isClientAction(path, method)) {
    return 'client';
  }

  return 'shared';
}

function inferAudience(owner: SwaggerOwner): SwaggerAudience {
  if (owner === 'internal') {
    return 'internal';
  }
  return owner;
}

function shouldIncludeAudience(target: SwaggerAudience | 'all', audience: SwaggerAudience): boolean {
  if (target === 'all') {
    return true;
  }

  if (target === 'admin') {
    return true;
  }

  if (target === 'client') {
    return audience === 'client' || audience === 'shared';
  }

  if (target === 'provider') {
    return audience === 'provider' || audience === 'shared';
  }

  return audience === target;
}

function getResponseDescription(statusCode: string): string {
  if (RESPONSE_FALLBACK[statusCode]) {
    return RESPONSE_FALLBACK[statusCode];
  }

  if (statusCode.startsWith('2')) {
    return 'Request completed successfully.';
  }

  if (statusCode.startsWith('4')) {
    return 'Request could not be completed because of client-side constraints.';
  }

  if (statusCode.startsWith('5')) {
    return 'Request failed due to an unexpected server-side error.';
  }

  return 'Operation response.';
}

function enrichOperation(path: string, method: string, operation: SwaggerOperation): SwaggerOperation {
  const operationWithMethod = {
    ...operation,
    'x-http-method': method,
  };
  const owner = inferOwner(path, operationWithMethod);
  const audience = inferAudience(owner);

  const summary = operation.summary?.trim() || inferSummary(path, method);
  const description =
    operation.description?.trim() ||
    `${summary}. Audience: ${audience}. Owner: ${owner}.`;

  const responses = { ...(operation.responses || {}) };
  for (const [statusCode, response] of Object.entries(responses)) {
    if (!response || typeof response !== 'object') {
      continue;
    }

    const existingDescription = (response.description || '').trim();
    if (!existingDescription) {
      responses[statusCode] = {
        ...response,
        description: getResponseDescription(statusCode),
      };
    }
  }

  return {
    ...operation,
    summary,
    description,
    responses,
    'x-owner': owner,
    'x-audience': [audience],
  };
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function collectUsedTags(document: SwaggerDocument): string[] {
  const used = new Set<string>();

  for (const pathItem of Object.values(document.paths || {})) {
    for (const [method, operation] of Object.entries(pathItem || {})) {
      if (!HTTP_METHODS.has(method.toLowerCase()) || !isOperation(operation)) {
        continue;
      }

      for (const tag of operation.tags || []) {
        used.add(tag);
      }
    }
  }

  return Array.from(used);
}

function toAdminTagName(tag: string): string {
  return tag.startsWith('Admin ') ? tag : `Admin ${tag}`;
}

function baseTagName(tag: string): string {
  return tag.startsWith('Admin ') ? tag.slice('Admin '.length) : tag;
}

function normalizeAdminTags(document: SwaggerDocument): void {
  for (const pathItem of Object.values(document.paths || {})) {
    for (const [method, maybeOperation] of Object.entries(pathItem || {})) {
      if (!HTTP_METHODS.has(method.toLowerCase()) || !isOperation(maybeOperation)) {
        continue;
      }

      if (!Array.isArray(maybeOperation.tags) || maybeOperation.tags.length === 0) {
        continue;
      }

      const normalized = Array.from(new Set(maybeOperation.tags.map((tag) => toAdminTagName(tag))));
      maybeOperation.tags = normalized;
    }
  }
}

function buildTags(tagNames: string[]): Array<{ name: string; description: string }> {
  const hasTagName = new Set(tagNames);
  const orderedKnownTags = tagNames.filter((tag) => {
    if (TAG_DESCRIPTIONS[tag]) {
      return true;
    }

    const baseTag = baseTagName(tag);
    return baseTag !== tag && TAG_DESCRIPTIONS[baseTag] && !hasTagName.has(baseTag);
  });
  const unknownTags = tagNames.filter((tag) => !orderedKnownTags.includes(tag)).sort((a, b) => a.localeCompare(b));
  const all = [...orderedKnownTags, ...unknownTags];

  return all.map((tag) => ({
    name: tag,
    description: TAG_DESCRIPTIONS[tag]?.description || TAG_DESCRIPTIONS[baseTagName(tag)]?.description || `${tag} endpoints.`,
  }));
}

function buildTagGroups(tagNames: string[]) {
  const groupMap = new Map<string, string[]>();
  for (const tag of tagNames) {
    const group = TAG_DESCRIPTIONS[tag]?.group || TAG_DESCRIPTIONS[baseTagName(tag)]?.group || 'Other';
    const existing = groupMap.get(group) || [];
    existing.push(tag);
    groupMap.set(group, existing);
  }

  return Array.from(groupMap.entries()).map(([name, tags]) => ({ name, tags }));
}

export function enrichSwaggerDocument(document: SwaggerDocument): SwaggerDocument {
  const cloned = deepClone(document);

  for (const [path, pathItem] of Object.entries(cloned.paths || {})) {
    for (const [method, maybeOperation] of Object.entries(pathItem || {})) {
      if (!HTTP_METHODS.has(method.toLowerCase()) || !isOperation(maybeOperation)) {
        continue;
      }

      pathItem[method] = enrichOperation(path, method.toLowerCase(), maybeOperation);
    }
  }

  const usedTags = collectUsedTags(cloned);
  cloned.tags = buildTags(usedTags);
  cloned['x-tagGroups'] = buildTagGroups(usedTags);

  return cloned;
}

export function buildAudienceSwaggerDocument(
  sourceDocument: SwaggerDocument,
  target: SwaggerAudience | 'all',
): SwaggerDocument {
  const cloned = deepClone(sourceDocument);
  const filteredPaths: Record<string, SwaggerPathItem> = {};

  for (const [path, pathItem] of Object.entries(cloned.paths || {})) {
    const filteredPathItem: SwaggerPathItem = {};

    for (const [method, maybeOperation] of Object.entries(pathItem || {})) {
      if (!HTTP_METHODS.has(method.toLowerCase()) || !isOperation(maybeOperation)) {
        filteredPathItem[method] = maybeOperation;
        continue;
      }

      const rawAudiences = maybeOperation['x-audience'];
      const audiences: SwaggerAudience[] = Array.isArray(rawAudiences)
        ? rawAudiences.filter((audience): audience is SwaggerAudience =>
            SWAGGER_AUDIENCE_VALUES.includes(audience as SwaggerAudience),
          )
        : ['shared'];

      const include = audiences.some((audience) => shouldIncludeAudience(target, audience));
      if (include) {
        filteredPathItem[method] = maybeOperation;
      }
    }

    if (Object.keys(filteredPathItem).length > 0) {
      filteredPaths[path] = filteredPathItem;
    }
  }

  cloned.paths = filteredPaths;

  if (target === 'admin') {
    normalizeAdminTags(cloned);
  }

  const usedTags = collectUsedTags(cloned);
  cloned.tags = buildTags(usedTags);
  cloned['x-tagGroups'] = buildTagGroups(usedTags);

  return cloned;
}

export function withSwaggerInfo(base: SwaggerDocument, title: string, description: string): SwaggerDocument {
  return {
    ...base,
    info: {
      ...(base.info || {}),
      title,
      description,
    },
  };
}
