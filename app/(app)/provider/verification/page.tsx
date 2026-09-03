import { redirect } from "next/navigation";

// Verification is a general account feature (any role) — it lives at
// /verification now. Keep this route working for old links/bookmarks.
export default async function ProviderVerificationRedirect({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const qs = sp.submitted ? "?submitted=1" : "";
  redirect(`/verification${qs}`);
}
