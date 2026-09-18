import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Check,
  Clipboard,
  FileText,
  Lightbulb,
  LoaderCircle,
  Mail,
  Menu,
  PanelLeftClose,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Workplace Productivity Assistant" },
      {
        name: "description",
        content: "Draft emails, summarize meetings, and turn research into practical insights with AI.",
      },
      { property: "og:title", content: "AI Workplace Productivity Assistant" },
      {
        property: "og:description",
        content: "Three focused AI tools for clearer communication and faster workplace decisions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type ToolId = "email" | "meeting" | "research";
type Tone = "Formal" | "Friendly" | "Persuasive";

const tools = {
  email: {
    label: "Email Generator",
    shortLabel: "Email",
    kicker: "Write with confidence",
    title: "Smart Email Generator",
    description: "Turn a few details into a complete, polished email in your preferred tone.",
    placeholder:
      "Describe the email you need to send…\n\nExample: Follow up with the finance team about the Q3 budget review. Ask for feedback by Friday and offer a 20-minute call.",
    inputLabel: "Email purpose & details",
    outputLabel: "Your email",
    action: "Generate email",
    empty: "Your polished email will appear here, ready to edit.",
    icon: Mail,
  },
  meeting: {
    label: "Meeting Summarizer",
    shortLabel: "Meetings",
    kicker: "Find what matters",
    title: "Meeting Notes Summarizer",
    description: "Condense lengthy notes into decisions, action items, and deadlines you can use.",
    placeholder:
      "Paste your meeting notes here…\n\nInclude attendee comments, decisions, owners, dates, and follow-ups for the most useful summary.",
    inputLabel: "Meeting notes",
    outputLabel: "Meeting brief",
    action: "Summarize notes",
    empty: "Your summary, decisions, actions, and deadlines will appear here.",
    icon: FileText,
  },
  research: {
    label: "Research Assistant",
    shortLabel: "Research",
    kicker: "Move from reading to action",
    title: "AI Research Assistant",
    description: "Explore a topic or analyze an article to surface insights, findings, and recommendations.",
    placeholder:
      "Enter a topic, paste source text, or add a public article URL…\n\nExample: Practical ways small teams can introduce a four-day work week.",
    inputLabel: "Topic, article, or URL",
    outputLabel: "Research brief",
    action: "Start research",
    empty: "Your key insights, findings, and recommendations will appear here.",
    icon: Search,
  },
} as const;

function Index() {
  const [activeTool, setActiveTool] = useState<ToolId>("email");
  const [tone, setTone] = useState<Tone>("Formal");
  const [inputs, setInputs] = useState<Record<ToolId, string>>({ email: "", meeting: "", research: "" });
  const [outputs, setOutputs] = useState<Record<ToolId, string>>({ email: "", meeting: "", research: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const tool = tools[activeTool];
  const ActiveIcon = tool.icon;

  const selectTool = (id: ToolId) => {
    setActiveTool(id);
    setError("");
    setSidebarOpen(false);
  };

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    const input = inputs[activeTool].trim();
    if (input.length < 10) {
      setError("Add a little more context so the AI can create a useful result.");
      return;
    }

    setLoading(true);
    setError("");
    setOutputs((current) => ({ ...current, [activeTool]: "" }));

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: activeTool, input, ...(activeTool === "email" ? { tone } : {}) }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "The AI request could not be completed.");
      }
      if (!response.body) throw new Error("The AI returned an empty response. Please try again.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setOutputs((current) => ({ ...current, [activeTool]: current[activeTool] + chunk }));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyOutput = async () => {
    if (!outputs[activeTool]) return;
    await navigator.clipboard.writeText(outputs[activeTool]);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {sidebarOpen && (
        <Button
          type="button"
          variant="ghost"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 h-auto w-auto rounded-none bg-overlay hover:bg-overlay md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-sidebar transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-20 items-center justify-between border-b border-border px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-glow">
              <WandSparkles className="size-4" />
            </div>
            <div>
              <p className="font-display text-sm font-semibold">AI Workplace</p>
              <p className="text-xs text-muted-foreground">Productivity assistant</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close navigation">
            <X />
          </Button>
        </div>

        <nav className="flex-1 px-4 py-7" aria-label="AI tools">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase text-muted-foreground">Workspace tools</p>
          <div className="space-y-1.5">
            {(Object.keys(tools) as ToolId[]).map((id) => {
              const item = tools[id];
              const Icon = item.icon;
              const active = id === activeTool;
              return (
                <Button
                  key={id}
                  type="button"
                  variant="ghost"
                  onClick={() => selectTool(id)}
                  className={`h-12 w-full justify-start px-3 ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
                >
                  <span className={`flex size-8 items-center justify-center rounded-md ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                    <Icon />
                  </span>
                  {item.label}
                </Button>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-border p-5">
          <div className="flex items-start gap-3 rounded-md bg-secondary p-3.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-medium">Private by design</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Nothing is saved. Inputs exist only for this request.</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-h-screen md:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
              <Menu />
            </Button>
            <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
              <PanelLeftClose className="size-4" />
              <span>Workspace</span>
              <span>/</span>
              <span className="text-foreground">{tool.shortLabel}</span>
            </div>
            <span className="text-sm font-medium sm:hidden">{tool.shortLabel}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success shadow-success" />
            AI ready
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 lg:px-10 lg:py-10">
          <section className="mb-8 animate-enter">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase text-primary">
              <Sparkles className="size-3.5" />
              {tool.kicker}
            </div>
            <div className="flex items-start gap-4">
              <div className="mt-1 hidden size-12 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-accent text-primary sm:flex">
                <ActiveIcon className="size-5" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-semibold sm:text-4xl">{tool.title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{tool.description}</p>
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
            <form onSubmit={generate} className="rounded-lg border border-border bg-card p-5 shadow-panel sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="font-display text-base font-semibold">Your input</p>
                  <p className="mt-1 text-xs text-muted-foreground">Add specific context for a stronger result.</p>
                </div>
                <span className="rounded-md border border-border bg-secondary px-2 py-1 text-[11px] text-muted-foreground">Required</span>
              </div>

              {activeTool === "email" && (
                <div className="mb-5">
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">Tone</label>
                  <div className="grid grid-cols-3 gap-2" role="group" aria-label="Email tone">
                    {(["Formal", "Friendly", "Persuasive"] as Tone[]).map((option) => (
                      <Button
                        key={option}
                        type="button"
                        variant={tone === option ? "default" : "outline"}
                        onClick={() => setTone(option)}
                        className="px-2"
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <label htmlFor="assistant-input" className="mb-2 block text-xs font-medium text-muted-foreground">{tool.inputLabel}</label>
              <Textarea
                id="assistant-input"
                value={inputs[activeTool]}
                onChange={(event) => setInputs((current) => ({ ...current, [activeTool]: event.target.value }))}
                placeholder={tool.placeholder}
                disabled={loading}
                className="min-h-[290px] resize-none bg-input/40 p-4 leading-6 sm:min-h-[340px]"
              />
              <div className="mt-2 flex justify-end text-[11px] text-muted-foreground">
                {inputs[activeTool].length.toLocaleString()} characters
              </div>

              {error && (
                <div role="alert" className="mt-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" size="lg" className="mt-5 w-full" disabled={loading}>
                {loading ? <LoaderCircle className="animate-spin" /> : <Send />}
                {loading ? "Working on it…" : tool.action}
              </Button>
            </form>

            <div className="flex min-h-[520px] flex-col rounded-lg border border-border bg-card shadow-panel">
              <div className="flex min-h-20 items-center justify-between border-b border-border px-5 py-4 sm:px-6">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-display text-base font-semibold">{tool.outputLabel}</p>
                    {outputs[activeTool] && !loading && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-success"><Check className="size-3" /> Ready</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Review and edit before using.</p>
                </div>
                <Button variant="outline" size="sm" onClick={copyOutput} disabled={!outputs[activeTool]} type="button">
                  {copied ? <Check /> : <Clipboard />}
                  <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
                </Button>
              </div>

              {loading && !outputs[activeTool] ? (
                <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                  <div className="relative flex size-14 items-center justify-center rounded-lg border border-primary/30 bg-accent text-primary">
                    <Sparkles className="size-5 animate-pulse" />
                    <span className="absolute inset-0 animate-ping rounded-lg border border-primary/20" />
                  </div>
                  <p className="mt-5 font-display text-sm font-semibold">Creating your {tool.shortLabel.toLowerCase()} result</p>
                  <p className="mt-2 max-w-xs text-xs leading-5 text-muted-foreground">Analyzing your context and shaping a clear, useful response…</p>
                </div>
              ) : outputs[activeTool] ? (
                <Textarea
                  aria-label={`Editable ${tool.outputLabel}`}
                  value={outputs[activeTool]}
                  onChange={(event) => setOutputs((current) => ({ ...current, [activeTool]: event.target.value }))}
                  className="min-h-[430px] flex-1 resize-none border-0 bg-transparent p-5 font-mono text-sm leading-7 shadow-none focus-visible:ring-0 sm:min-h-[500px] sm:p-6"
                />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                  <div className="flex size-14 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground">
                    <Lightbulb className="size-5" />
                  </div>
                  <p className="mt-5 font-display text-sm font-semibold">Ready when you are</p>
                  <p className="mt-2 max-w-xs text-xs leading-5 text-muted-foreground">{tool.empty}</p>
                </div>
              )}
            </div>
          </section>

          <footer className="mt-7 flex items-start gap-2 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <p><span className="font-medium text-foreground">Responsible AI:</span> AI-generated content may contain errors. Review and verify it before professional use.</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
