import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/dal";
import { AddServiceForm } from "./add-service-form";

export default async function NewServicePage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "provider") redirect("/");

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="mb-1 text-xl font-semibold">Create a service</h1>
      <p className="mb-6 text-sm" style={{ color: "var(--c-text-2)" }}>
        Pick a category — or name your own — then set your rate.
      </p>
      <AddServiceForm />
    </div>
  );
}
