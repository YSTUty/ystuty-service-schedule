export const trimTransformer = {
  from: (value: string) => (value && value.trim()) || null,
  to: (value: string | null) => value,
};
