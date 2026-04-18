import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

type RateLimitPolicy = {
  group: string;
  limit: number;
  windowMs: number;
};

type RateBucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class RequestThrottleGuard implements CanActivate {
  private readonly buckets = new Map<string, RateBucket>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const pathname = this.getPathname(request);
    const policy = this.resolvePolicy(request.method, pathname);

    if (!policy) {
      return true;
    }

    const identity = request.user?.id || request.ip || request.headers['x-forwarded-for'] || 'anonymous';
    const bucketKey = `${identity}:${request.method}:${policy.group}`;
    const now = Date.now();
    const bucket = this.buckets.get(bucketKey);

    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(bucketKey, { count: 1, resetAt: now + policy.windowMs });
      return true;
    }

    bucket.count += 1;

    if (bucket.count > policy.limit) {
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  private getPathname(request: any): string {
    const url = String(request.url || request.raw?.url || '');
    try {
      return new URL(url, 'http://localhost').pathname;
    } catch {
      return url.split('?')[0] || url;
    }
  }

  private resolvePolicy(method: string, pathname: string): RateLimitPolicy | null {
    const normalizedMethod = String(method || '').toUpperCase();

    if (pathname.startsWith('/api/auth/')) {
      if (['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/verify-email', '/api/auth/resend-verification-email'].includes(pathname)) {
        return { group: 'auth-sensitive', limit: 5, windowMs: 15 * 60 * 1000 };
      }
      return { group: 'auth', limit: 20, windowMs: 15 * 60 * 1000 };
    }

    if (pathname.startsWith('/api/payments/webhook/')) {
      return null;
    }

    if (pathname.startsWith('/api/payments/')) {
      if (['/api/payments/initialize', '/api/payments/verify'].includes(pathname)) {
        return { group: 'payments-sensitive', limit: 20, windowMs: 60 * 1000 };
      }
      return { group: 'payments', limit: 60, windowMs: 60 * 1000 };
    }

    if (pathname.startsWith('/api/push/')) {
      if (pathname === '/api/push/broadcast') {
        return { group: 'push-broadcast', limit: 10, windowMs: 60 * 1000 };
      }

      return { group: 'push', limit: 20, windowMs: 60 * 1000 };
    }

    if (pathname.startsWith('/api/reviews') || pathname.startsWith('/api/bookings') || pathname.startsWith('/api/orders')) {
      if (normalizedMethod === 'POST') {
        return { group: pathname.replace(/\d+/g, ':id'), limit: 30, windowMs: 60 * 1000 };
      }
    }

    return null;
  }
}
