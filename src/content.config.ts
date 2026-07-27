import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const caseStudies = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/case-studies' }),
  schema: z.object({
    title: z.string(),
    schoolName: z.string(),
    summary: z.string(),
    heroImage: z.string(),
    heroImageAlt: z.string(),
    pdfUrl: z.string(),
    publishDate: z.coerce.date(),
    featured: z.boolean().default(false),
    location: z.string(),
    schoolType: z.string(),
    studentCount: z.number(),
    stats: z.array(z.object({
      value: z.string(),
      label: z.string(),
    })),
    beforeAfter: z.array(z.object({
      category: z.string(),
      before: z.string(),
      after: z.string(),
    })).optional(),
    quotes: z.array(z.object({
      text: z.string(),
      attribution: z.string(),
    })),
    ctaText: z.string().default('Interested in what this looks like for your school?'),
  }),
});

export const collections = { caseStudies };
