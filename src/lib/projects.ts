import { getCollection } from 'astro:content';

/** Проекты в порядке плиток. */
export async function getProjects() {
  const entries = await getCollection('projects');
  return entries.toSorted((a, b) => a.data.order - b.data.order);
}
