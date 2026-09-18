import { getDictionary } from "@/lib/i18n/getDictionary";
import SignupForm from "@/components/auth/SignupForm";

export default async function SignupPage() {
  const dict = await getDictionary();

  return <SignupForm dict={dict.account.signup} />;
}
