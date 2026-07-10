import { AppNav } from "@/components/app-nav";
import { getCurrentProfile, getDayTemplates } from "@/lib/data";

const templateLabels: Record<string, string> = {
  night_shift: "Ночная смена",
  recovery: "Отсыпной",
  day_off: "Выходной",
};

export default async function SchedulePage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const templates = await getDayTemplates(profile.id);

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <main className="flex-1 space-y-5 px-4 py-6">
        <header>
          <p className="text-sm text-emerald-400">График</p>
          <h1 className="text-3xl font-semibold">Сон, работа, еда</h1>
          <p className="text-sm text-zinc-400">
            День считается от пробуждения до следующего пробуждения.
          </p>
        </header>

        {templates.map((template) => {
          const schedule = template.schedule_json as {
            sleep: { start: string; end: string; label?: string }[];
            work: { start: string; end: string; label?: string }[];
            meal_windows: { start: string; end: string; label: string }[];
          };

          return (
            <section
              key={template.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
            >
              <h2 className="mb-3 text-lg font-medium">
                {templateLabels[template.template_type] ?? template.template_type}
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="mb-1 text-zinc-400">Сон</p>
                  <ul className="space-y-1">
                    {schedule.sleep.map((block) => (
                      <li key={`${block.start}-${block.end}`}>
                        {block.label}: {block.start}–{block.end}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 text-zinc-400">Работа</p>
                  <ul className="space-y-1">
                    {schedule.work.length > 0 ? (
                      schedule.work.map((block) => (
                        <li key={`${block.start}-${block.end}`}>
                          {block.label}: {block.start}–{block.end}
                        </li>
                      ))
                    ) : (
                      <li>Нет рабочих блоков</li>
                    )}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 text-zinc-400">Окна питания</p>
                  <ul className="space-y-1">
                    {schedule.meal_windows.map((window) => (
                      <li key={`${window.start}-${window.label}`}>
                        {window.label}: {window.start}–{window.end}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          );
        })}
      </main>
      <AppNav active="/schedule" />
    </div>
  );
}
