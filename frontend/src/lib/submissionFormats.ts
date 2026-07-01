export const SUBMISSION_FORMATS = [
  { key: 'text', label: '✍ Text' },
  { key: 'github_url', label: ' GitHub URL' },
  { key: 'presentation_url', label: '📊 Presentation' },
  { key: 'folder_url', label: '📁 Folder URL' },
] as const;

export type SubmissionFormatKey = (typeof SUBMISSION_FORMATS)[number]['key'];
