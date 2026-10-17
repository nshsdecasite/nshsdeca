import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentUserIsSuperAdmin, getMemberDossier } from "@/app/admin/actions";
import { MemberDossierView } from "@/components/platform/MemberDossier";
import { requireRole } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Member",
};

type MemberPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MemberAdminPage({ params }: MemberPageProps) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { user } = await requireRole(["officer", "advisor"], `/admin/members/${id}`);
  const [dossier, canEdit] = await Promise.all([
    getMemberDossier(id),
    currentUserIsSuperAdmin(),
  ]);

  return (
    <MemberDossierView
      dossier={dossier}
      canEdit={canEdit}
      viewerId={user.id}
    />
  );
}
