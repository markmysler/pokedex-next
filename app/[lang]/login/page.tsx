import { Suspense } from "react";
import { getDictionary } from "@/lib/i18n/getDictionary";
import LoginForm from "@/components/auth/LoginForm";

export default async function LoginPage() {
  const dict = await getDictionary();

  return (
    <Suspense fallback={null}>
      <LoginForm dict={dict.account.login} art={dict.account.authArt} />
    </Suspense>
  );
}
