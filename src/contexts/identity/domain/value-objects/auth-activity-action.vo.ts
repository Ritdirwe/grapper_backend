export enum AuthActivityAction {
  REGISTER = 'register',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  REFRESH_SUCCESS = 'refresh_success',
  REFRESH_FAILED = 'refresh_failed',
  LOGOUT = 'logout',
  VERIFY_EMAIL = 'verify_email',
  VERIFY_EMAIL_FAILED = 'verify_email_failed',
  RESEND_VERIFICATION_EMAIL = 'resend_verification_email',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  PASSWORD_RESET_SUCCESS = 'password_reset_success',
  PASSWORD_RESET_FAILED = 'password_reset_failed',
}
