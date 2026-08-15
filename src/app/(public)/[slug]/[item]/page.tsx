// ============================================================
//  /[slug]/[item] — Unified collection-item detail route.
//
//  [slug] = collection type  (projects | blog | experience |
//                              education | achievements)
//  [item] = item slug / id
//
//  This single route serves every collection's detail pages —
//  /projects/:x, /blog/:x, /experience/:x, /education/:x, and
//  /achievements/:x all resolve here; there are no dedicated
//  per-collection route folders.
//  ISR: revalidate every 60s.
// ============================================================

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getProjects,
  getProject,
  getBlogPosts,
  getBlogPost,
  getExperience,
  getEducation,
  getAchievements,
  getSiteSettings,
} from '@/lib/api';
import { ProjectDetail } from '@/components/pagedetail/project-detail';
import { BlogDetail } from '@/components/pagedetail/blog-detail';
import { ExperienceDetail } from '@/components/pagedetail/experience-detail';
import { EducationDetail } from '@/components/pagedetail/education-detail';
import { AchievementDetail } from '@/components/pagedetail/achievement-detail';
import { OG_IMAGE_PATH, SITE_OWNER } from '@/lib/site';

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string; item: string }>;
}

// ── Static params — pre-render all known items at build time ──

export async function generateStaticParams() {
  const [projects, posts, experiences, educations, achievements] = await Promise.all([
    getProjects(),
    getBlogPosts(),
    getExperience(),
    getEducation(),
    getAchievements(),
  ]);

  return [
    ...projects.map((p) => ({ slug: 'projects', item: p.slug })),
    ...posts.map((p) => ({ slug: 'blog', item: p.slug })),
    ...experiences.map((e) => ({ slug: 'experience', item: e.id })),
    ...educations.map((e) => ({ slug: 'education', item: e.id })),
    ...achievements.map((a) => ({ slug: 'achievements', item: a.id })),
  ];
}

// ── Metadata ──────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, item } = await params;
  // Cached at 5 min (ISR) — cheap to fetch alongside the collection item.
  const settings = await getSiteSettings();
  const ownerName = settings?.name || SITE_OWNER;

  switch (slug) {
    case 'projects': {
      const project = await getProject(item);
      if (!project) return { title: 'Project Not Found' };
      return {
        title: project.title,
        description: project.oneLiner,
        openGraph: {
          title: `${project.title} — ${ownerName}`,
          description: project.oneLiner,
          images: project.screenshots[0]
            ? [{ url: project.screenshots[0].url, alt: project.screenshots[0].alt || project.title }]
            : [{ url: OG_IMAGE_PATH, alt: project.title }],
        },
      };
    }

    case 'blog': {
      const post = await getBlogPost(item);
      if (!post) return { title: 'Post Not Found' };
      return {
        title: post.title,
        description: post.excerpt,
        openGraph: {
          title: `${post.title} — ${ownerName}`,
          description: post.excerpt,
          type: 'article',
          publishedTime: post.publishedAt ?? undefined,
          images: post.coverImage
            ? [{ url: post.coverImage, alt: post.title }]
            : [{ url: OG_IMAGE_PATH, alt: post.title }],
        },
        twitter: {
          card: 'summary_large_image',
          title: post.title,
          description: post.excerpt,
          images: [post.coverImage || OG_IMAGE_PATH],
        },
      };
    }

    case 'experience': {
      const all = await getExperience();
      const exp = all.find((e) => e.id === item);
      if (!exp) return { title: 'Experience Not Found' };
      return {
        title: `${exp.role} at ${exp.company}`,
        description: exp.bullets[0] ?? `${exp.role} at ${exp.company}`,
        openGraph: {
          title: `${exp.role} at ${exp.company} — ${ownerName}`,
          description: exp.bullets[0] ?? `${exp.role} at ${exp.company}`,
          images: [{ url: OG_IMAGE_PATH, alt: `${exp.role} at ${exp.company}` }],
        },
      };
    }

    case 'education': {
      const all = await getEducation();
      const edu = all.find((e) => e.id === item);
      if (!edu) return { title: 'Education Not Found' };
      return {
        title: `${edu.degree} — ${edu.school}`,
        description: edu.detail ?? `${edu.degree} at ${edu.school}`,
        openGraph: {
          title: `${edu.degree} — ${edu.school} · ${ownerName}`,
          description: edu.detail ?? `${edu.degree} at ${edu.school}`,
          images: [{ url: OG_IMAGE_PATH, alt: `${edu.degree} — ${edu.school}` }],
        },
      };
    }

    case 'achievements': {
      const all = await getAchievements();
      const achievement = all.find((a) => a.id === item);
      if (!achievement) return { title: 'Achievement Not Found' };
      return {
        title: achievement.title,
        description: achievement.description,
        openGraph: {
          title: `${achievement.title} — ${ownerName}`,
          description: achievement.description,
          images: achievement.image
            ? [{ url: achievement.image, alt: achievement.title }]
            : [{ url: OG_IMAGE_PATH, alt: achievement.title }],
        },
      };
    }

    default:
      return {};
  }
}

// ── Page ──────────────────────────────────────────────────────

export default async function UnifiedDetailPage({ params }: Props) {
  const { slug, item } = await params;

  switch (slug) {
    case 'projects': {
      const project = await getProject(item);
      if (!project) notFound();
      return <ProjectDetail project={project} />;
    }

    case 'blog': {
      const post = await getBlogPost(item);
      if (!post) notFound();
      return <BlogDetail post={post} />;
    }

    case 'experience': {
      const all = await getExperience();
      const exp = all.find((e) => e.id === item);
      if (!exp) notFound();
      return <ExperienceDetail item={exp} />;
    }

    case 'education': {
      const all = await getEducation();
      const edu = all.find((e) => e.id === item);
      if (!edu) notFound();
      return <EducationDetail item={edu} />;
    }

    case 'achievements': {
      const all = await getAchievements();
      const achievement = all.find((a) => a.id === item);
      if (!achievement) notFound();
      return <AchievementDetail item={achievement} />;
    }

    default:
      notFound();
  }
}
