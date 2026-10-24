"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import AiTemplateStudio from "@/components/templates/AiTemplateStudio";

// Organizers and admins design a template from a description; it becomes a normal template they can use for events.
function AiTemplateContent() {
  const edit = useSearchParams().get("edit");
  return <AiTemplateStudio editTemplateId={edit && /^[0-9a-fA-F]{24}$/.test(edit) ? edit : undefined} />;
}

export default function AiTemplatePage() {
  return (
    <div className="w-full min-h-full bg-white">
      <PageHeader
        title="Design with AI"
        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>}
        actions={<Link href="/templates" className="hidden sm:inline-block text-sm text-gray-700 hover:text-[#FF651D] mr-2">All templates</Link>}
      />
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24">
        <Suspense fallback={<p className="py-16 text-center text-sm text-[#828282]">Loading…</p>}>
          <AiTemplateContent />
        </Suspense>
      </div>
    </div>
  );
}
