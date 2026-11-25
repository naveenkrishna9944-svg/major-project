import { HttpInterceptorFn } from '@angular/common/http';
import { API_BASE_URL } from './config';

/** Sends the session cookie with every call to the API (same as axios `withCredentials: true`). */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) =>
  req.url.startsWith(API_BASE_URL) ? next(req.clone({ withCredentials: true })) : next(req);
