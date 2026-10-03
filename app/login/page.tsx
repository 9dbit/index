import { configured, isDemo } from "@/lib/supabase/server";
import { LoginForm } from "@/components/login-form";
export const dynamic = "force-dynamic";
export default function Login() {
  return <LoginForm configured={configured()} demo={isDemo()} />;
}
