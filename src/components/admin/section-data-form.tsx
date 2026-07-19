"use client";

// ============================================================
//  SectionDataForm — renders the correct form fields per
//  section type. One big switch on type → matching form.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import type {
  SectionType,
  SectionData,
  Experience,
  Education,
  Skill,
  Project,
  BlogPost,
  Achievement,
} from "@/lib/types";
import {
  adminExperience,
  adminEducation,
  adminSkills,
  adminProjects,
  adminBlog,
  adminAchievements,
} from "@/lib/admin-api";
import { getConfigOptions } from "@/lib/api";
import type { ConfigOption } from "@/lib/api";
import Link from "next/link";
import {
  AdminInput,
  AdminTextarea,
  AdminSelect,
  AdminToggle,
  AdminButton,
  BulletsInput,
} from "./ui";
import { MultiImageUpload } from "./image-upload";

interface Props {
  type: SectionType;
  data: SectionData;
  onChange: (data: SectionData) => void;
}

// ── Helpers ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

function field<T>(
  data: AnyObj,
  onChange: (d: SectionData) => void,
  key: string,
  value: T,
) {
  onChange({ ...data, [key]: value } as SectionData);
}

// ── Forms per type ────────────────────────────────────────────

function HeroForm({
  data,
  onChange,
}: {
  data: AnyObj;
  onChange: (d: SectionData) => void;
}) {
  const buttons: { label: string; href: string; style: string }[] =
    data.buttons ?? [];
  const metrics: { value: string; label: string }[] = data.metrics ?? [];

  return (
    <div className="flex flex-col gap-4">
      <AdminInput
        label="Eyebrow"
        value={data.eyebrow ?? ""}
        onChange={(e) => field(data, onChange, "eyebrow", e.target.value)}
        placeholder="e.g. Full-Stack Engineer"
      />
      <AdminInput
        label="Name"
        value={data.name ?? ""}
        onChange={(e) => field(data, onChange, "name", e.target.value)}
      />
      <AdminInput
        label="Gradient line"
        value={data.gradientLine ?? ""}
        onChange={(e) => field(data, onChange, "gradientLine", e.target.value)}
        placeholder="e.g. I build production systems."
      />
      <AdminTextarea
        label="Subhead"
        value={data.subhead ?? ""}
        onChange={(e) => field(data, onChange, "subhead", e.target.value)}
        rows={3}
      />

      {/* Buttons */}
      <div>
        <p
          className="text-[13px] font-medium mb-2"
          style={{ color: "var(--text)" }}
        >
          Buttons
        </p>
        <div className="flex flex-col gap-3">
          {buttons.map((btn, i) => (
            <div
              key={i}
              className="flex gap-2 items-start p-3 rounded-[10px] border"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface-2)",
              }}
            >
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <AdminInput
                  placeholder="Label"
                  value={btn.label}
                  onChange={(e) => {
                    const next = [...buttons];
                    next[i] = { ...btn, label: e.target.value };
                    field(data, onChange, "buttons", next);
                  }}
                />
                <AdminInput
                  type="text"
                  placeholder="https://… or /page"
                  value={btn.href}
                  onChange={(e) => {
                    const next = [...buttons];
                    next[i] = { ...btn, href: e.target.value };
                    field(data, onChange, "buttons", next);
                  }}
                />
                <AdminSelect
                  value={btn.style}
                  onChange={(e) => {
                    const next = [...buttons];
                    next[i] = { ...btn, style: e.target.value };
                    field(data, onChange, "buttons", next);
                  }}
                  options={(["primary", "ghost"] as const).map((v) => ({
                    value: v,
                    label: v.charAt(0).toUpperCase() + v.slice(1),
                  }))}
                />
              </div>
              <AdminButton
                variant="danger"
                size="sm"
                type="button"
                aria-label="Remove button"
                className="mt-1"
                onClick={() =>
                  field(
                    data,
                    onChange,
                    "buttons",
                    buttons.filter((_, j) => j !== i),
                  )
                }
              >
                <Trash2 size={13} aria-hidden="true" /> Remove
              </AdminButton>
            </div>
          ))}
          <AdminButton
            variant="ghost"
            size="sm"
            onClick={() =>
              field(data, onChange, "buttons", [
                ...buttons,
                { label: "", href: "", style: "primary" },
              ])
            }
            type="button"
          >
            <Plus size={14} aria-hidden="true" /> Add button
          </AdminButton>
        </div>
      </div>

      {/* Metrics */}
      <div>
        <p
          className="text-[13px] font-medium mb-2"
          style={{ color: "var(--text)" }}
        >
          Metrics
        </p>
        <div className="flex flex-col gap-2">
          {metrics.map((m, i) => (
            <div key={i} className="flex gap-2 items-start">
              <AdminInput
                placeholder="Value (e.g. 5+)"
                value={m.value}
                onChange={(e) => {
                  const next = [...metrics];
                  next[i] = { ...m, value: e.target.value };
                  field(data, onChange, "metrics", next);
                }}
              />
              <AdminInput
                placeholder="Label"
                value={m.label}
                onChange={(e) => {
                  const next = [...metrics];
                  next[i] = { ...m, label: e.target.value };
                  field(data, onChange, "metrics", next);
                }}
              />
              <AdminButton
                variant="danger"
                size="sm"
                type="button"
                aria-label="Remove metric"
                className="mt-1"
                onClick={() =>
                  field(
                    data,
                    onChange,
                    "metrics",
                    metrics.filter((_, j) => j !== i),
                  )
                }
              >
                <Trash2 size={13} aria-hidden="true" /> Remove
              </AdminButton>
            </div>
          ))}
          <AdminButton
            variant="ghost"
            size="sm"
            onClick={() =>
              field(data, onChange, "metrics", [
                ...metrics,
                { value: "", label: "" },
              ])
            }
            type="button"
          >
            <Plus size={14} aria-hidden="true" /> Add metric
          </AdminButton>
        </div>
      </div>
    </div>
  );
}

function AboutForm({
  data,
  onChange,
}: {
  data: AnyObj;
  onChange: (d: SectionData) => void;
}) {
  const paragraphs: string[] = data.paragraphs ?? [""];

  return (
    <div className="flex flex-col gap-4">
      <AdminInput
        label="Heading"
        value={data.heading ?? ""}
        onChange={(e) => field(data, onChange, "heading", e.target.value)}
      />
      <div>
        <p
          className="text-[13px] font-medium mb-2"
          style={{ color: "var(--text)" }}
        >
          Paragraphs
        </p>
        {paragraphs.map((p, i) => (
          <div key={i} className="flex flex-col gap-1.5 mb-2">
            <AdminTextarea
              value={p}
              onChange={(e) => {
                const next = [...paragraphs];
                next[i] = e.target.value;
                field(data, onChange, "paragraphs", next);
              }}
              rows={3}
            />
            <div className="flex justify-end">
              <AdminButton
                variant="danger"
                size="sm"
                type="button"
                aria-label="Remove paragraph"
                onClick={() =>
                  field(
                    data,
                    onChange,
                    "paragraphs",
                    paragraphs.filter((_, j) => j !== i),
                  )
                }
              >
                <Trash2 size={13} aria-hidden="true" /> Remove
              </AdminButton>
            </div>
          </div>
        ))}
        <AdminButton
          variant="ghost"
          size="sm"
          onClick={() =>
            field(data, onChange, "paragraphs", [...paragraphs, ""])
          }
          type="button"
        >
          <Plus size={14} aria-hidden="true" /> Add paragraph
        </AdminButton>
      </div>
    </div>
  );
}

// Tri-state checkbox: checked / indeterminate / unchecked
function GroupCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(_e) => onChange()}
      style={{ accentColor: "var(--accent)" }}
    />
  );
}

function SkillsForm({
  data,
  onChange,
}: {
  data: AnyObj;
  onChange: (d: SectionData) => void;
}) {
  const [groupedSkills, setGroupedSkills] = useState<
    { key: string; label: string; skills: Skill[] }[]
  >([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const mode: "all" | "selected" = data.mode ?? "all";
  const selectedIds: string[] = Array.isArray(data.ids)
    ? (data.ids as string[])
    : [];

  // Grouped skills come straight from the API (GET /api/skills/grouped) — no frontend grouping.
  useEffect(() => {
    setLoadingSkills(true);
    adminSkills
      .listGrouped()
      .then((sections) =>
        setGroupedSkills(
          sections.map((s) => ({
            key: s.group,
            label: s.label,
            skills: s.skills,
          })),
        ),
      )
      .catch(() => {})
      .finally(() => setLoadingSkills(false));
  }, []);

  function toggleSkillId(id: string) {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    field(data, onChange, "ids", next);
  }

  function toggleGroupIds(groupKey: string, groupSkills: Skill[]) {
    const groupIds = groupSkills.map((s) => s.id);
    const allSelected = groupIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      // Deselect all in this group
      field(
        data,
        onChange,
        "ids",
        selectedIds.filter((id) => !groupIds.includes(id)),
      );
    } else {
      // Select all in this group and auto-expand it
      const toAdd = groupIds.filter((id) => !selectedIds.includes(id));
      field(data, onChange, "ids", [...selectedIds, ...toAdd]);
      setExpandedGroups((prev) => new Set([...prev, groupKey]));
    }
  }

  function toggleExpand(groupKey: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminInput
        label="Heading"
        value={data.heading ?? ""}
        onChange={(e) => field(data, onChange, "heading", e.target.value)}
      />
      <AdminSelect
        label="Display mode"
        value={mode}
        onChange={(e) => field(data, onChange, "mode", e.target.value)}
        options={[
          { value: "all", label: "Show all" },
          { value: "selected", label: "Show selected" },
        ]}
      />
      {mode === "selected" && (
        <div>
          <p
            className="text-[13px] font-medium mb-2"
            style={{ color: "var(--text)" }}
          >
            Select skills to display
          </p>
          {loadingSkills ? (
            <p className="text-[12px]" style={{ color: "var(--muted)" }}>
              Loading…
            </p>
          ) : (
            <div
              className="rounded-[10px] border overflow-hidden"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface-2)",
              }}
            >
              {groupedSkills.length === 0 ? (
                <p
                  className="text-[12px] px-3 py-2"
                  style={{ color: "var(--muted)" }}
                >
                  No skills found.
                </p>
              ) : (
                groupedSkills.map((group, idx) => {
                  const groupIds = group.skills.map((s) => s.id);
                  const selectedCount = groupIds.filter((id) =>
                    selectedIds.includes(id),
                  ).length;
                  const allSelected =
                    groupIds.length > 0 && selectedCount === groupIds.length;
                  const someSelected = selectedCount > 0 && !allSelected;
                  const isExpanded = expandedGroups.has(group.key);

                  return (
                    <div
                      key={group.key}
                      className={idx > 0 ? "border-t" : ""}
                      style={
                        idx > 0 ? { borderColor: "var(--border)" } : undefined
                      }
                    >
                      {/* Group header row: chevron + tri-state checkbox + label/count */}
                      <div className="flex items-center gap-2 px-3 py-2">
                        <button
                          type="button"
                          aria-label={
                            isExpanded
                              ? `Collapse ${group.label}`
                              : `Expand ${group.label}`
                          }
                          onClick={() => toggleExpand(group.key)}
                          style={{ color: "var(--muted)" }}
                        >
                          {isExpanded ? (
                            <ChevronDown size={14} aria-hidden="true" />
                          ) : (
                            <ChevronRight size={14} aria-hidden="true" />
                          )}
                        </button>
                        <GroupCheckbox
                          checked={allSelected}
                          indeterminate={someSelected}
                          onChange={() =>
                            toggleGroupIds(group.key, group.skills)
                          }
                        />
                        <button
                          type="button"
                          onClick={() => toggleExpand(group.key)}
                          className="flex-1 text-left text-[13px] font-medium"
                          style={{ color: "var(--text)" }}
                        >
                          {group.label}
                          <span
                            className="ml-2 text-[11px] font-normal"
                            style={{ color: "var(--muted)" }}
                          >
                            {selectedCount}/{groupIds.length}
                          </span>
                        </button>
                      </div>
                      {/* Expanded: individual skill checkboxes */}
                      {isExpanded && (
                        <div
                          className="flex flex-col gap-0.5 pt-1 pb-2 px-2"
                          style={{ borderTop: "1px solid var(--border)" }}
                        >
                          {group.skills.map((skill) => (
                            <label
                              key={skill.id}
                              className="flex items-center gap-2 cursor-pointer py-1 pl-8 pr-2 rounded-[6px] transition-colors"
                              style={{ color: "var(--text)" }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(skill.id)}
                                onChange={() => toggleSkillId(skill.id)}
                                style={{ accentColor: "var(--accent)" }}
                              />
                              <span className="text-[13px]">{skill.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
      <CtaInputs data={data} onChange={onChange} />
      <Link
        href="/admin/skills"
        className="text-[12px] hover:opacity-75 transition-opacity self-start"
        style={{ color: "var(--muted)" }}
      >
        Manage skills →
      </Link>
    </div>
  );
}

function ExperienceForm({
  data,
  onChange,
}: {
  data: AnyObj;
  onChange: (d: SectionData) => void;
}) {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loadingExp, setLoadingExp] = useState(false);
  const mode: "all" | "selected" = data.mode ?? "all";
  const selectedIds: string[] = Array.isArray(data.ids)
    ? (data.ids as string[])
    : [];

  useEffect(() => {
    setLoadingExp(true);
    adminExperience
      .list()
      .then(setExperiences)
      .catch(() => {})
      .finally(() => setLoadingExp(false));
  }, []);

  function toggleId(id: string) {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    field(data, onChange, "ids", next);
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminInput
        label="Heading"
        value={data.heading ?? ""}
        onChange={(e) => field(data, onChange, "heading", e.target.value)}
      />
      <AdminSelect
        label="Display mode"
        value={mode}
        onChange={(e) => field(data, onChange, "mode", e.target.value)}
        options={[
          { value: "all", label: "Show all" },
          { value: "selected", label: "Show selected" },
        ]}
      />
      {mode === "selected" && (
        <div>
          <p
            className="text-[13px] font-medium mb-2"
            style={{ color: "var(--text)" }}
          >
            Select experiences to display
          </p>
          {loadingExp ? (
            <p className="text-[12px]" style={{ color: "var(--muted)" }}>
              Loading…
            </p>
          ) : (
            <div
              className="max-h-[200px] overflow-y-auto rounded-[10px] border p-2 flex flex-col gap-0.5"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface-2)",
              }}
            >
              {experiences.length === 0 ? (
                <p
                  className="text-[12px] px-1"
                  style={{ color: "var(--muted)" }}
                >
                  No experience entries yet.
                </p>
              ) : (
                experiences.map((exp) => (
                  <label
                    key={exp.id}
                    className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded-[6px] transition-colors"
                    style={{ color: "var(--text)" }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(exp.id)}
                      onChange={() => toggleId(exp.id)}
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <span className="text-[13px]">
                      {exp.role} — {exp.company}
                    </span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>
      )}
      <CtaInputs data={data} onChange={onChange} />
      <Link
        href="/admin/experience"
        className="text-[12px] hover:opacity-75 transition-opacity self-start"
        style={{ color: "var(--muted)" }}
      >
        Manage experience →
      </Link>
    </div>
  );
}

function FeaturedProjectsForm({
  data,
  onChange,
}: {
  data: AnyObj;
  onChange: (d: SectionData) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const mode: "all" | "selected" = data.mode ?? "all";
  const selectedIds: string[] = Array.isArray(data.ids)
    ? (data.ids as string[])
    : [];

  useEffect(() => {
    setLoadingProjects(true);
    adminProjects
      .list()
      .then(setProjects)
      .catch(() => {})
      .finally(() => setLoadingProjects(false));
  }, []);

  function toggleId(id: string) {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    field(data, onChange, "ids", next);
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminInput
        label="Heading"
        value={data.heading ?? ""}
        onChange={(e) => field(data, onChange, "heading", e.target.value)}
      />
      <AdminSelect
        label="Display mode"
        value={mode}
        onChange={(e) => field(data, onChange, "mode", e.target.value)}
        options={[
          { value: "all", label: "Show all (featured)" },
          { value: "selected", label: "Show selected" },
        ]}
      />
      <AdminInput
        label="Limit"
        type="number"
        value={data.limit ?? 3}
        onChange={(e) => field(data, onChange, "limit", Number(e.target.value))}
        min={1}
        max={10}
      />
      {mode === "selected" && (
        <div>
          <p
            className="text-[13px] font-medium mb-2"
            style={{ color: "var(--text)" }}
          >
            Select projects to display
          </p>
          {loadingProjects ? (
            <p className="text-[12px]" style={{ color: "var(--muted)" }}>
              Loading…
            </p>
          ) : (
            <div
              className="max-h-[200px] overflow-y-auto rounded-[10px] border p-2 flex flex-col gap-0.5"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface-2)",
              }}
            >
              {projects.length === 0 ? (
                <p
                  className="text-[12px] px-1"
                  style={{ color: "var(--muted)" }}
                >
                  No projects yet.
                </p>
              ) : (
                projects.map((proj) => (
                  <label
                    key={proj.id}
                    className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded-[6px] transition-colors"
                    style={{ color: "var(--text)" }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(proj.id)}
                      onChange={() => toggleId(proj.id)}
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <span className="text-[13px]">{proj.title}</span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>
      )}
      <CtaInputs data={data} onChange={onChange} />
      <Link
        href="/admin/projects"
        className="text-[12px] hover:opacity-75 transition-opacity self-start"
        style={{ color: "var(--muted)" }}
      >
        Manage projects →
      </Link>
    </div>
  );
}

function ProjectsGridForm({
  data,
  onChange,
}: {
  data: AnyObj;
  onChange: (d: SectionData) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <AdminInput
        label="Heading"
        value={data.heading ?? ""}
        onChange={(e) => field(data, onChange, "heading", e.target.value)}
      />
      <AdminInput
        label="Filter (all / featured / tag name)"
        value={data.filter ?? "all"}
        onChange={(e) => field(data, onChange, "filter", e.target.value)}
      />
      <AdminInput
        label="Limit"
        type="number"
        value={data.limit ?? ""}
        onChange={(e) =>
          field(
            data,
            onChange,
            "limit",
            e.target.value ? Number(e.target.value) : undefined,
          )
        }
        placeholder="Leave empty for all"
      />
      <CtaInputs data={data} onChange={onChange} />
    </div>
  );
}

function BlogTeaserForm({
  data,
  onChange,
}: {
  data: AnyObj;
  onChange: (d: SectionData) => void;
}) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const mode: "latest" | "selected" = data.mode ?? "latest";
  const selectedIds: string[] = Array.isArray(data.ids)
    ? (data.ids as string[])
    : [];

  useEffect(() => {
    setLoadingPosts(true);
    adminBlog
      .list()
      .then(setPosts)
      .catch(() => {})
      .finally(() => setLoadingPosts(false));
  }, []);

  function toggleId(id: string) {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    field(data, onChange, "ids", next);
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminInput
        label="Heading"
        value={data.heading ?? ""}
        onChange={(e) => field(data, onChange, "heading", e.target.value)}
      />
      <AdminSelect
        label="Display mode"
        value={mode}
        onChange={(e) => field(data, onChange, "mode", e.target.value)}
        options={[
          { value: "latest", label: "Latest (by limit)" },
          { value: "selected", label: "Selected posts" },
        ]}
      />
      {mode === "latest" && (
        <AdminInput
          label="Limit"
          type="number"
          value={data.limit ?? 3}
          onChange={(e) =>
            field(data, onChange, "limit", Number(e.target.value))
          }
          min={1}
          max={10}
        />
      )}
      {mode === "selected" && (
        <div>
          <p
            className="text-[13px] font-medium mb-2"
            style={{ color: "var(--text)" }}
          >
            Select posts to display
          </p>
          {loadingPosts ? (
            <p className="text-[12px]" style={{ color: "var(--muted)" }}>
              Loading…
            </p>
          ) : (
            <div
              className="max-h-[200px] overflow-y-auto rounded-[10px] border p-2 flex flex-col gap-0.5"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface-2)",
              }}
            >
              {posts.length === 0 ? (
                <p
                  className="text-[12px] px-1"
                  style={{ color: "var(--muted)" }}
                >
                  No blog posts yet.
                </p>
              ) : (
                posts.map((post) => (
                  <label
                    key={post.id}
                    className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded-[6px] transition-colors"
                    style={{ color: "var(--text)" }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(post.id)}
                      onChange={() => toggleId(post.id)}
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <span className="text-[13px]">{post.title}</span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>
      )}
      <CtaInputs data={data} onChange={onChange} />
      <Link
        href="/admin/blog"
        className="text-[12px] hover:opacity-75 transition-opacity self-start"
        style={{ color: "var(--muted)" }}
      >
        Manage blog →
      </Link>
    </div>
  );
}

function AchievementsForm({
  data,
  onChange,
}: {
  data: AnyObj;
  onChange: (d: SectionData) => void;
}) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loadingAch, setLoadingAch] = useState(false);
  const mode: "all" | "selected" = data.mode ?? "all";
  const selectedIds: string[] = Array.isArray(data.ids)
    ? (data.ids as string[])
    : [];

  useEffect(() => {
    setLoadingAch(true);
    adminAchievements
      .list()
      .then(setAchievements)
      .catch(() => {})
      .finally(() => setLoadingAch(false));
  }, []);

  function toggleId(id: string) {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    field(data, onChange, "ids", next);
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminInput
        label="Heading"
        value={data.heading ?? ""}
        onChange={(e) => field(data, onChange, "heading", e.target.value)}
      />
      <AdminSelect
        label="Display mode"
        value={mode}
        onChange={(e) => field(data, onChange, "mode", e.target.value)}
        options={[
          { value: "all", label: "Show all" },
          { value: "selected", label: "Show selected" },
        ]}
      />
      {mode === "selected" && (
        <div>
          <p
            className="text-[13px] font-medium mb-2"
            style={{ color: "var(--text)" }}
          >
            Select achievements to display
          </p>
          {loadingAch ? (
            <p className="text-[12px]" style={{ color: "var(--muted)" }}>
              Loading…
            </p>
          ) : (
            <div
              className="max-h-[200px] overflow-y-auto rounded-[10px] border p-2 flex flex-col gap-0.5"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface-2)",
              }}
            >
              {achievements.length === 0 ? (
                <p
                  className="text-[12px] px-1"
                  style={{ color: "var(--muted)" }}
                >
                  No achievements yet.
                </p>
              ) : (
                achievements.map((ach) => (
                  <label
                    key={ach.id}
                    className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded-[6px] transition-colors"
                    style={{ color: "var(--text)" }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(ach.id)}
                      onChange={() => toggleId(ach.id)}
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <span className="text-[13px]">{ach.title}</span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>
      )}
      <CtaInputs data={data} onChange={onChange} />
      <Link
        href="/admin/achievements"
        className="text-[12px] hover:opacity-75 transition-opacity self-start"
        style={{ color: "var(--muted)" }}
      >
        Manage achievements →
      </Link>
    </div>
  );
}

function EducationForm({
  data,
  onChange,
}: {
  data: AnyObj;
  onChange: (d: SectionData) => void;
}) {
  const [education, setEducation] = useState<Education[]>([]);
  const [loadingEdu, setLoadingEdu] = useState(false);
  const mode: "all" | "selected" = data.mode ?? "all";
  const selectedIds: string[] = Array.isArray(data.ids)
    ? (data.ids as string[])
    : [];

  useEffect(() => {
    setLoadingEdu(true);
    adminEducation
      .list()
      .then(setEducation)
      .catch(() => {})
      .finally(() => setLoadingEdu(false));
  }, []);

  function toggleId(id: string) {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    field(data, onChange, "ids", next);
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminInput
        label="Heading"
        value={data.heading ?? ""}
        onChange={(e) => field(data, onChange, "heading", e.target.value)}
      />
      <AdminSelect
        label="Display mode"
        value={mode}
        onChange={(e) => field(data, onChange, "mode", e.target.value)}
        options={[
          { value: "all", label: "Show all" },
          { value: "selected", label: "Show selected" },
        ]}
      />
      {mode === "selected" && (
        <div>
          <p
            className="text-[13px] font-medium mb-2"
            style={{ color: "var(--text)" }}
          >
            Select education entries to display
          </p>
          {loadingEdu ? (
            <p className="text-[12px]" style={{ color: "var(--muted)" }}>
              Loading…
            </p>
          ) : (
            <div
              className="max-h-[200px] overflow-y-auto rounded-[10px] border p-2 flex flex-col gap-0.5"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface-2)",
              }}
            >
              {education.length === 0 ? (
                <p
                  className="text-[12px] px-1"
                  style={{ color: "var(--muted)" }}
                >
                  No education entries yet.
                </p>
              ) : (
                education.map((edu) => (
                  <label
                    key={edu.id}
                    className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded-[6px] transition-colors"
                    style={{ color: "var(--text)" }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(edu.id)}
                      onChange={() => toggleId(edu.id)}
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <span className="text-[13px]">
                      {edu.degree} — {edu.school}
                    </span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>
      )}
      <CtaInputs data={data} onChange={onChange} />
      <Link
        href="/admin/education"
        className="text-[12px] hover:opacity-75 transition-opacity self-start"
        style={{ color: "var(--muted)" }}
      >
        Manage education →
      </Link>
    </div>
  );
}

function ContactForm({
  data,
  onChange,
}: {
  data: AnyObj;
  onChange: (d: SectionData) => void;
}) {
  const links: { type: string; value: string }[] = data.links ?? [];
  const [linkTypeOptions, setLinkTypeOptions] = useState<ConfigOption[]>([]);

  useEffect(() => {
    getConfigOptions("contact_link_types").then((opts) => {
      setLinkTypeOptions(opts);
    });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <AdminInput
        label="Heading"
        value={data.heading ?? ""}
        onChange={(e) => field(data, onChange, "heading", e.target.value)}
      />
      <AdminTextarea
        label="Blurb"
        value={data.blurb ?? ""}
        onChange={(e) => field(data, onChange, "blurb", e.target.value)}
        rows={3}
      />
      <AdminToggle
        label="Show contact form"
        checked={data.showForm ?? false}
        onChange={(v) => field(data, onChange, "showForm", v)}
      />

      {/* Dynamic social / contact links */}
      <div>
        <p
          className="text-[13px] font-medium mb-2"
          style={{ color: "var(--text)" }}
        >
          Links
        </p>
        <div className="flex flex-col gap-2">
          {links.map((link, i) => (
            <div key={i} className="flex gap-2 items-center">
              <div className="flex-1">
                <AdminSelect
                  value={link.type}
                  onChange={(e) => {
                    const next = [...links];
                    next[i] = { ...link, type: e.target.value };
                    field(data, onChange, "links", next);
                  }}
                  options={linkTypeOptions}
                />
              </div>
              <div className="flex-1">
                <AdminInput
                  type={link.type === "email" ? "email" : "url"}
                  placeholder="URL or address"
                  value={link.value}
                  onChange={(e) => {
                    const next = [...links];
                    next[i] = { ...link, value: e.target.value };
                    field(data, onChange, "links", next);
                  }}
                />
              </div>
              <AdminButton
                variant="danger"
                size="sm"
                type="button"
                aria-label="Remove link"
                onClick={() =>
                  field(
                    data,
                    onChange,
                    "links",
                    links.filter((_, j) => j !== i),
                  )
                }
              >
                <Trash2 size={13} aria-hidden="true" /> Remove
              </AdminButton>
            </div>
          ))}
          <AdminButton
            variant="ghost"
            size="sm"
            type="button"
            onClick={() =>
              field(data, onChange, "links", [
                ...links,
                { type: "email", value: "" },
              ])
            }
          >
            <Plus size={14} aria-hidden="true" /> Add link
          </AdminButton>
        </div>
      </div>
    </div>
  );
}

function MetricsForm({
  data,
  onChange,
}: {
  data: AnyObj;
  onChange: (d: SectionData) => void;
}) {
  const items: { value: string; label: string }[] = data.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-center">
            <div className="flex-1">
              <AdminInput
                placeholder="Value (e.g. 5+)"
                value={item.value}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...item, value: e.target.value };
                  field(data, onChange, "items", next);
                }}
              />
            </div>
            <div className="flex-1">
              <AdminInput
                placeholder="Label"
                value={item.label}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...item, label: e.target.value };
                  field(data, onChange, "items", next);
                }}
              />
            </div>
            <AdminButton
              variant="danger"
              size="sm"
              type="button"
              aria-label="Remove metric"
              onClick={() =>
                field(
                  data,
                  onChange,
                  "items",
                  items.filter((_, j) => j !== i),
                )
              }
            >
              <Trash2 size={13} aria-hidden="true" /> Remove
            </AdminButton>
          </div>
        ))}
        <AdminButton
          variant="ghost"
          size="sm"
          onClick={() =>
            field(data, onChange, "items", [...items, { value: "", label: "" }])
          }
          type="button"
        >
          <Plus size={14} aria-hidden="true" /> Add metric
        </AdminButton>
      </div>
    </div>
  );
}

function RichTextForm({
  data,
  onChange,
}: {
  data: AnyObj;
  onChange: (d: SectionData) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <AdminInput
        label="Heading (optional)"
        value={data.heading ?? ""}
        onChange={(e) => field(data, onChange, "heading", e.target.value)}
      />
      <AdminTextarea
        label="Body (MDX / rich text)"
        value={data.body ?? ""}
        onChange={(e) => field(data, onChange, "body", e.target.value)}
        rows={10}
        style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "13px" }}
      />
    </div>
  );
}

function CtaForm({
  data,
  onChange,
}: {
  data: AnyObj;
  onChange: (d: SectionData) => void;
}) {
  const button = data.button ?? { label: "", href: "" };
  return (
    <div className="flex flex-col gap-4">
      <AdminInput
        label="Heading"
        value={data.heading ?? ""}
        onChange={(e) => field(data, onChange, "heading", e.target.value)}
      />
      <AdminTextarea
        label="Text"
        value={data.text ?? ""}
        onChange={(e) => field(data, onChange, "text", e.target.value)}
        rows={3}
      />
      <div className="grid grid-cols-2 gap-3">
        <AdminInput
          label="Button label"
          value={button.label}
          onChange={(e) =>
            field(data, onChange, "button", {
              ...button,
              label: e.target.value,
            })
          }
        />
        <AdminInput
          label="Button href"
          type="text"
          placeholder="https://… or /page"
          value={button.href}
          onChange={(e) =>
            field(data, onChange, "button", { ...button, href: e.target.value })
          }
        />
      </div>
    </div>
  );
}

function GalleryForm({
  data,
  onChange,
}: {
  data: AnyObj;
  onChange: (d: SectionData) => void;
}) {
  const images = data.images ?? [];
  return (
    <div className="flex flex-col gap-4">
      <AdminInput
        label="Heading (optional)"
        value={data.heading ?? ""}
        onChange={(e) => field(data, onChange, "heading", e.target.value)}
      />
      <MultiImageUpload
        label="Gallery images"
        value={images}
        onChange={(items) => field(data, onChange, "images", items)}
      />
    </div>
  );
}

// ── Shared CTA input pair ─────────────────────────────────────
// Used by every typed collection section form (not ContentBlock).
// Blanking both fields removes the cta key entirely on save.

function CtaInputs({
  data,
  onChange,
}: {
  data: AnyObj;
  onChange: (d: SectionData) => void;
}) {
  const cta = (data.cta as { label?: string; href?: string } | undefined) ?? {};

  function updateCta(patch: Partial<{ label: string; href: string }>) {
    const next = { ...cta, ...patch };
    onChange({
      ...data,
      cta: next.label || next.href ? next : undefined,
    } as SectionData);
  }

  return (
    <div>
      <p
        className="text-[13px] font-medium mb-2"
        style={{ color: "var(--text)" }}
      >
        CTA button (optional)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AdminInput
          label="Label"
          value={cta.label ?? ""}
          onChange={(e) => updateCta({ label: e.target.value })}
          placeholder="View all"
        />
        <AdminInput
          label="URL"
          value={cta.href ?? ""}
          onChange={(e) => updateCta({ href: e.target.value })}
          placeholder="https://… or /page"
        />
      </div>
    </div>
  );
}

function ContentBlockForm({
  data,
  onChange,
}: {
  data: AnyObj;
  onChange: (d: SectionData) => void;
}) {
  const paragraphs: string[] = data.paragraphs ?? [];
  const source: string = (data.source as string) ?? "none";
  const mode: "all" | "selected" | "latest" =
    (data.mode as "all" | "selected" | "latest") ?? "all";
  const selectedIds: string[] = Array.isArray(data.ids)
    ? (data.ids as string[])
    : [];

  // ── Dynamic id options (reloaded whenever source changes) ──
  const [idOptions, setIdOptions] = useState<{ id: string; label: string }[]>(
    [],
  );
  const [loadingIds, setLoadingIds] = useState(false);

  useEffect(() => {
    if (!source || source === "none") {
      setIdOptions([]);
      return;
    }
    setLoadingIds(true);
    const load = async () => {
      try {
        if (source === "projects") {
          const items = await adminProjects.list();
          setIdOptions(items.map((p) => ({ id: p.id, label: p.title })));
        } else if (source === "blog") {
          const items = await adminBlog.list();
          setIdOptions(items.map((p) => ({ id: p.id, label: p.title })));
        } else if (source === "experience") {
          const items = await adminExperience.list();
          setIdOptions(
            items.map((e) => ({ id: e.id, label: `${e.role} — ${e.company}` })),
          );
        } else if (source === "education") {
          const items = await adminEducation.list();
          setIdOptions(
            items.map((e) => ({
              id: e.id,
              label: `${e.degree} — ${e.school}`,
            })),
          );
        } else if (source === "achievements") {
          const items = await adminAchievements.list();
          setIdOptions(items.map((a) => ({ id: a.id, label: a.title })));
        } else if (source === "skills") {
          const sections = await adminSkills.listGrouped();
          const flat: { id: string; label: string }[] = [];
          for (const sec of sections) {
            for (const skill of sec.skills) {
              flat.push({
                id: skill.id,
                label: `${skill.name} (${sec.label})`,
              });
            }
          }
          setIdOptions(flat);
        }
      } catch {
        // ignore loading errors — picker stays empty
      } finally {
        setLoadingIds(false);
      }
    };
    void load();
  }, [source]);

  function toggleId(id: string) {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    field(data, onChange, "ids", next);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header fields ───────────────────────────────────── */}
      <AdminInput
        label="Eyebrow (optional mono label)"
        value={data.eyebrow ?? ""}
        onChange={(e) => field(data, onChange, "eyebrow", e.target.value)}
        placeholder="e.g. // Featured Work"
      />
      <AdminInput
        label="Heading (optional)"
        value={data.heading ?? ""}
        onChange={(e) => field(data, onChange, "heading", e.target.value)}
      />

      {/* ── Paragraphs ──────────────────────────────────────── */}
      <div>
        <p
          className="text-[13px] font-medium mb-2"
          style={{ color: "var(--text)" }}
        >
          Paragraphs
        </p>
        {paragraphs.map((p, i) => (
          <div key={i} className="flex flex-col gap-1.5 mb-2">
            <AdminTextarea
              value={p}
              onChange={(e) => {
                const next = [...paragraphs];
                next[i] = e.target.value;
                field(data, onChange, "paragraphs", next);
              }}
              rows={3}
            />
            <div className="flex justify-end">
              <AdminButton
                variant="danger"
                size="sm"
                type="button"
                aria-label="Remove paragraph"
                onClick={() =>
                  field(
                    data,
                    onChange,
                    "paragraphs",
                    paragraphs.filter((_, j) => j !== i),
                  )
                }
              >
                <Trash2 size={13} aria-hidden="true" /> Remove
              </AdminButton>
            </div>
          </div>
        ))}
        <AdminButton
          variant="ghost"
          size="sm"
          type="button"
          onClick={() =>
            field(data, onChange, "paragraphs", [...paragraphs, ""])
          }
        >
          <Plus size={14} aria-hidden="true" /> Add paragraph
        </AdminButton>
      </div>

      {/* ── Alignment ───────────────────────────────────────── */}
      <AdminSelect
        label="Alignment"
        value={data.align ?? "left"}
        onChange={(e) => field(data, onChange, "align", e.target.value)}
        options={[
          { value: "left", label: "Left" },
          { value: "center", label: "Center" },
        ]}
      />

      {/* ── Collection source ───────────────────────────────── */}
      <AdminSelect
        label="Collection source"
        value={source}
        onChange={(e) => {
          const newSource = e.target.value || "none";
          // Clear ids when source changes — ids from one collection are not valid for another.
          onChange({ ...data, source: newSource, ids: [] } as SectionData);
        }}
        options={[
          { value: "none", label: "None (text only)" },
          { value: "experience", label: "Experience" },
          { value: "education", label: "Education" },
          { value: "skills", label: "Skills" },
          { value: "projects", label: "Projects" },
          { value: "achievements", label: "Achievements" },
          { value: "blog", label: "Blog posts" },
        ]}
      />

      {source !== "none" && (
        <>
          {/* ── Display mode ────────────────────────────────── */}
          <AdminSelect
            label="Display mode"
            value={mode}
            onChange={(e) => field(data, onChange, "mode", e.target.value)}
            options={[
              { value: "all", label: "All" },
              { value: "latest", label: "Latest (by limit)" },
              { value: "selected", label: "Selected" },
            ]}
          />

          {/* ── Limit ───────────────────────────────────────── */}
          <AdminInput
            label="Limit (leave empty for all)"
            type="number"
            value={data.limit ?? ""}
            onChange={(e) =>
              field(
                data,
                onChange,
                "limit",
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
            placeholder="e.g. 3"
            min={1}
          />

          {/* ── IDs multi-select (visible when mode === 'selected') */}
          {mode === "selected" && (
            <div>
              <p
                className="text-[13px] font-medium mb-2"
                style={{ color: "var(--text)" }}
              >
                Select items to display
              </p>
              {loadingIds ? (
                <p className="text-[12px]" style={{ color: "var(--muted)" }}>
                  Loading…
                </p>
              ) : (
                <div
                  className="max-h-[200px] overflow-y-auto rounded-[10px] border p-2 flex flex-col gap-0.5"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--surface-2)",
                  }}
                >
                  {idOptions.length === 0 ? (
                    <p
                      className="text-[12px] px-1"
                      style={{ color: "var(--muted)" }}
                    >
                      No items found.
                    </p>
                  ) : (
                    idOptions.map((opt) => (
                      <label
                        key={opt.id}
                        className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded-[6px] transition-colors"
                        style={{ color: "var(--text)" }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(opt.id)}
                          onChange={() => toggleId(opt.id)}
                          style={{ accentColor: "var(--accent)" }}
                        />
                        <span className="text-[13px]">{opt.label}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── CTA ─────────────────────────────────────────── */}
          <CtaInputs data={data} onChange={onChange} />
        </>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

export function SectionDataForm({ type, data, onChange }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as Record<string, any>;

  switch (type) {
    case "HERO":
      return <HeroForm data={d} onChange={onChange} />;
    case "ABOUT":
      return <AboutForm data={d} onChange={onChange} />;
    case "SKILLS":
      return <SkillsForm data={d} onChange={onChange} />;
    case "EXPERIENCE":
      return <ExperienceForm data={d} onChange={onChange} />;
    case "FEATURED_PROJECTS":
      return <FeaturedProjectsForm data={d} onChange={onChange} />;
    case "PROJECTS_GRID":
      return <ProjectsGridForm data={d} onChange={onChange} />;
    case "BLOG_TEASER":
      return <BlogTeaserForm data={d} onChange={onChange} />;
    case "ACHIEVEMENTS":
      return <AchievementsForm data={d} onChange={onChange} />;
    case "EDUCATION":
      return <EducationForm data={d} onChange={onChange} />;
    case "CONTACT":
      return <ContactForm data={d} onChange={onChange} />;
    case "METRICS":
      return <MetricsForm data={d} onChange={onChange} />;
    case "RICH_TEXT":
      return <RichTextForm data={d} onChange={onChange} />;
    case "CTA":
      return <CtaForm data={d} onChange={onChange} />;
    case "GALLERY":
      return <GalleryForm data={d} onChange={onChange} />;
    case "CONTENT_BLOCK":
      return <ContentBlockForm data={d} onChange={onChange} />;
    default:
      return (
        <p className="text-[13px]" style={{ color: "var(--muted)" }}>
          No form defined for section type &quot;{type}&quot;.
        </p>
      );
  }
}
