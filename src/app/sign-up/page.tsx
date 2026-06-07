import { googleEnabled } from "@/auth";
import { AuthForm } from "@/components/auth-form";

export default function SignUpPage() {
  return <AuthForm mode="signup" googleEnabled={googleEnabled} />;
}
