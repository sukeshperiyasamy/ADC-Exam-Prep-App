/**
 * Reconstructed hierarchical navigation structure for booklets.
 *
 * For Therapeutic Guidelines: Oral and Dental (eTG 2025), the exported PDF contains
 * individual chapter topics but no embedded outline or front-matter TOC.
 * The 42 chapters are organized here into 9 clinically coherent groups aligned with
 * the official Therapeutic Guidelines curriculum and National Library of Australia
 * cataloguing.
 */

export interface BookletSectionDef {
  id: string;
  title: string;
  chapterSlugs: string[];
}

export const BOOKLET_HIERARCHIES: Record<string, BookletSectionDef[]> = {
  'tg-oral-dental': [
    {
      id: 'principles-and-prescribing',
      title: 'Principles of Dental Practice & Prescribing',
      chapterSlugs: [
        'principles-of-diagnosis-and-management-in-dental-practice',
        'dental-prescriptions-and-prescription-writing'
      ]
    },
    {
      id: 'drugs-in-dentistry',
      title: 'Drugs Used in Dental Practice',
      chapterSlugs: [
        'overview-of-common-drugs-used-in-dentistry',
        'antimicrobial-drugs-used-in-dentistry',
        'antimicrobial-stewardship-ams-in-dental-practice',
        'antimicrobial-hypersensitivity-in-dental-practice',
        'practical-information-on-using-antimicrobial-drugs-in-dental',
        'drugs-used-to-treat-acute-pain-in-dentistry',
        'corticosteroids-used-in-dentistry',
        'mouthwashes-and-other-topical-formulations-used-in-dentistry',
        'local-anaesthetics-in-dentistry',
        'anxiety-management-in-dentistry',
        'antibiotic-prophylaxis-for-dental-procedures'
      ]
    },
    {
      id: 'oral-surgery-complications',
      title: 'Complications of Oral Surgery',
      chapterSlugs: [
        'complications-of-oral-surgery',
        'alveolar-osteitis-dry-socket',
        'bleeding-during-or-after-oral-surgery',
        'oroantral-communication-after-oral-surgery',
        'nerve-injury-after-dentoalveolar-surgery',
        'tooth-or-root-displacement-during-extractions'
      ]
    },
    {
      id: 'dental-periodontal-conditions',
      title: 'Dental Caries, Halitosis & Periodontal Diseases',
      chapterSlugs: [
        'halitosis',
        'dental-caries',
        'periodontal-and-peri-implant-diseases',
        'necrotising-periodontal-disease',
        'peri-implant-diseases'
      ]
    },
    {
      id: 'odontogenic-infections',
      title: 'Acute & Spreading Odontogenic Infections',
      chapterSlugs: [
        'acute-odontogenic-infections',
        'spreading-odontogenic-infections-without-severe-local-or-sys',
        'spreading-odontogenic-infections-with-severe-local-or-system'
      ]
    },
    {
      id: 'mucosal-pain-trauma',
      title: 'Oral Mucosal Disease, Orofacial Pain & Special Topics',
      chapterSlugs: [
        'oral-mucosal-disease',
        'orofacial-pain',
        'bruxism',
        'oral-and-maxillofacial-trauma',
        'oral-and-dental-health-in-people-with-cognitive-disability',
        'obstructive-sleep-apnoea'
      ]
    },
    {
      id: 'medical-conditions',
      title: 'Dental Considerations for Patients with Medical Conditions',
      chapterSlugs: [
        'dental-considerations-for-patients-with-medical-conditions'
      ]
    },
    {
      id: 'medical-emergencies',
      title: 'Medical Emergencies in Dental Practice',
      chapterSlugs: [
        'medical-emergencies-in-dental-practice',
        'allergies-in-dental-practice',
        'cardiovascular-emergencies-in-dental-practice',
        'respiratory-emergencies-in-dental-practice',
        'diabetic-emergencies-in-dental-practice',
        'methaemoglobinaemia-in-dental-practice',
        'ocular-emergencies-in-dental-practice'
      ]
    },
    {
      id: 'medical-practitioners-guidance',
      title: 'Guidance for Medical Practitioners',
      chapterSlugs: [
        'guidance-for-medical-practitioners-managing-oral-and-dental-'
      ]
    }
  ]
};

export interface ChapterHierarchyItem {
  id: string;
  slug: string;
  title: string;
  pdfPageFrom: number;
  pdfPageTo: number;
  isFreePreview: boolean;
  live: boolean;
  access: { ok: boolean; reason?: string };
  mcqCount: number;
  progress: {
    completedModes: string[];
    completedAt: Date | null;
  } | null;
}

export interface SectionGroup<T extends ChapterHierarchyItem> {
  id: string;
  title: string;
  pdfPageFrom: number;
  pdfPageTo: number;
  chapters: T[];
  completedCount: number;
  totalChapters: number;
}

/**
 * Organizes chapters into hierarchical groups based on the booklet's defined sections.
 * Automatically appends any unmatched chapters into an "Additional Chapters" fallback group,
 * guaranteeing no chapters are ever lost or omitted.
 */
export function buildBookletHierarchy<T extends ChapterHierarchyItem>(
  bookletSlug: string,
  chapters: T[]
): SectionGroup<T>[] {
  const sections = BOOKLET_HIERARCHIES[bookletSlug];
  if (!sections || sections.length === 0) {
    // Fallback: single flat group if no custom hierarchy exists
    const from = chapters.length ? Math.min(...chapters.map((c) => c.pdfPageFrom)) : 0;
    const to = chapters.length ? Math.max(...chapters.map((c) => c.pdfPageTo)) : 0;
    const completed = chapters.filter((c) => c.progress?.completedAt).length;
    return [
      {
        id: 'all-chapters',
        title: 'Chapters',
        pdfPageFrom: from,
        pdfPageTo: to,
        chapters,
        completedCount: completed,
        totalChapters: chapters.length
      }
    ];
  }

  const chapterMap = new Map(chapters.map((c) => [c.slug, c]));
  const placed = new Set<string>();
  const groups: SectionGroup<T>[] = [];

  for (const s of sections) {
    const groupChapters: T[] = [];
    for (const slug of s.chapterSlugs) {
      const ch = chapterMap.get(slug);
      if (ch) {
        groupChapters.push(ch);
        placed.add(slug);
      }
    }

    if (groupChapters.length > 0) {
      const from = Math.min(...groupChapters.map((c) => c.pdfPageFrom));
      const to = Math.max(...groupChapters.map((c) => c.pdfPageTo));
      const completed = groupChapters.filter((c) => c.progress?.completedAt).length;
      groups.push({
        id: s.id,
        title: s.title,
        pdfPageFrom: from,
        pdfPageTo: to,
        chapters: groupChapters,
        completedCount: completed,
        totalChapters: groupChapters.length
      });
    }
  }

  // Safety fallback: any chapter not explicitly defined in a section
  const remaining = chapters.filter((c) => !placed.has(c.slug));
  if (remaining.length > 0) {
    const from = Math.min(...remaining.map((c) => c.pdfPageFrom));
    const to = Math.max(...remaining.map((c) => c.pdfPageTo));
    const completed = remaining.filter((c) => c.progress?.completedAt).length;
    groups.push({
      id: 'additional-chapters',
      title: 'Additional Chapters',
      pdfPageFrom: from,
      pdfPageTo: to,
      chapters: remaining,
      completedCount: completed,
      totalChapters: remaining.length
    });
  }

  return groups;
}
