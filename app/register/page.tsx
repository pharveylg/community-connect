import { RegisterFlow } from "./register-flow";
import { BlurFade } from "@/components/mp/blur-fade";

export default function RegisterPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <BlurFade delay={0}>
          <RegisterFlow />
        </BlurFade>
      </div>
    </div>
  );
}
