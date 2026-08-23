import { DeleteProjectButton, ProjectDialog } from "@/components/admin/project-form";
import { AdminPageHeader, DataTable, Panel, StatusBadge, Td, Tr } from "@/components/admin/ui";
import { toFaDigits } from "@/lib/utils";
import { getAdminProjects } from "@/modules/admin/queries";

export const dynamic = "force-dynamic";

const empty = {
  title: "", slug: "", client: "", location: "", year: "", capacity: "",
  summary: "", description: "", coverUrl: "", tags: "", position: "0",
  isActive: true, isFeatured: false,
};

export default async function AdminProjectsPage() {
  const projects = await getAdminProjects();

  return (
    <>
      <AdminPageHeader
        title="پروژه‌ها"
        description="نمونه‌کارهای اجراشده که در صفحه «پروژه‌ها» و صفحه اصلی نمایش داده می‌شوند."
        actions={
          <ProjectDialog
            values={empty}
            trigger={(open) => (
              <button
                type="button"
                onClick={open}
                className="flex h-10 items-center gap-2 rounded-md bg-[var(--brand)] px-4 text-sm font-medium text-[var(--fg-on-brand)] transition-colors hover:bg-[var(--brand-hover)]"
              >
                پروژه جدید
              </button>
            )}
          />
        }
      />

      <Panel padded={false}>
        <DataTable
          head={["پروژه", "کارفرما", "موقعیت", "سال", "وضعیت", "ترتیب", ""]}
          empty={projects.length === 0}
        >
          {projects.map((project) => (
            <Tr key={project.id}>
              <Td>
                <span className="block font-medium">{project.title}</span>
                <span className="mt-0.5 block font-mono text-[0.625rem] text-[var(--fg-subtle)]" dir="ltr">
                  {project.slug}
                </span>
              </Td>
              <Td className="text-xs">{project.client ?? "—"}</Td>
              <Td className="text-xs">{project.location ?? "—"}</Td>
              <Td className="font-mono text-xs">{project.year ?? "—"}</Td>
              <Td>
                <StatusBadge
                  map={{ on: { label: "فعال", tone: "ok" }, off: { label: "غیرفعال", tone: "neutral" } }}
                  value={project.isActive ? "on" : "off"}
                />
                {project.isFeatured && (
                  <span className="mt-1 block text-[0.625rem] text-[var(--signal)]">صفحه اصلی</span>
                )}
              </Td>
              <Td className="font-mono text-xs">{toFaDigits(project.position)}</Td>
              <Td className="w-24">
                <div className="flex items-center gap-0.5">
                  <ProjectDialog
                    values={{
                      id: project.id,
                      title: project.title,
                      slug: project.slug,
                      client: project.client ?? "",
                      location: project.location ?? "",
                      year: project.year ?? "",
                      capacity: project.capacity ?? "",
                      summary: project.summary ?? "",
                      description: project.description ?? "",
                      coverUrl: project.coverUrl ?? "",
                      tags: project.tags.join("، "),
                      position: String(project.position),
                      isActive: project.isActive,
                      isFeatured: project.isFeatured,
                    }}
                    trigger={(open) => (
                      <button
                        type="button"
                        onClick={open}
                        aria-label={`ویرایش ${project.title}`}
                        className="grid size-8 place-items-center rounded-md text-[var(--fg-subtle)] transition-colors hover:text-[var(--brand)]"
                      >
                        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M11 2.5 13.5 5 6 12.5 3 13l.5-3z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    )}
                  />
                  <DeleteProjectButton id={project.id} title={project.title} />
                </div>
              </Td>
            </Tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
