import { AuthError } from "@supabase/supabase-js";
import type { AuthFeedback } from "@/models/auth";

export function getAuthFeedback(error: unknown): AuthFeedback {
  if (error instanceof TypeError) {
    return "network";
  }

  if (!(error instanceof AuthError)) {
    return "requestFailed";
  }

  if (error.status === 429) {
    return "rateLimited";
  }

  if (error.status === 0) {
    return "network";
  }

  switch (error.code) {
    case "invalid_credentials":
      return "invalidCredentials";

    case "email_not_confirmed":
      return "emailNotConfirmed";

    case "weak_password":
      return "weakPassword";

    case "otp_expired":
    case "otp_disabled":
      return "invalidCode";

    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "rateLimited";

    default:
      return "requestFailed";
  }
}
