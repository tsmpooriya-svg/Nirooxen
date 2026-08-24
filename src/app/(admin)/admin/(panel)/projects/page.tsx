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
            trigger={{ kind: "primary", label: "پروژه جدید" }}
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
                <span className="mt-0.5 block font-mono text-micro text-[var(--fg-subtle)]" dir="ltr">
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
                  <span className="mt-1 block text-micro text-[var(--signal-text)]">صفحه اصلی</span>
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
                    trigger={{ kind: "icon", label: `ویرایش ${project.title}` }}
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
