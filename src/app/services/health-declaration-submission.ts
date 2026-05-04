import { OptionValue } from '../components/form-controls';
import { QUESTION_ANSWER_LABELS } from '../components/pages/questions/questionnaire-metadata';

export type QuestionAnswerRow = [question: string, answer: unknown];

export type SubmissionPersonData = {
  id?: string;
  gender?: unknown;
  birthYear?: unknown;
  questionnaire?: unknown;
};

const humanizedLabelCache = new Map<string, string>();

export function buildQuestionAnswerFile(submittedAt: string, people: SubmissionPersonData[]): QuestionAnswerRow[][] {
  return people.map((person) => {
    const rows: QuestionAnswerRow[] = [
      ['submittedAt', submittedAt],
      ['person.id', person.id],
      ['person.gender', person.gender],
      ['person.birthYear', person.birthYear],
    ];
    appendQuestionAnswers(rows, person.questionnaire);
    return rows;
  });
}

function appendQuestionAnswers(rows: QuestionAnswerRow[], value: unknown, prefix = ''): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return;
  }

  for (const [key, answer] of Object.entries(value)) {
    if (key === 'id') {
      continue;
    }

    const path = prefix ? `${prefix}.${key}` : key;
    appendAnswerValue(rows, path, answer);
  }
}

function appendAnswerValue(rows: QuestionAnswerRow[], path: string, answer: unknown): void {
  if (isBlankAnswer(answer)) {
    return;
  }

  if (isOptionValue(answer)) {
    rows.push([questionLabel(path), answer.label]);
    return;
  }

  if (Array.isArray(answer)) {
    let hasRecordItems = false;
    for (const item of answer) {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        hasRecordItems = true;
        break;
      }
    }

    if (!hasRecordItems) {
      rows.push([questionLabel(path), answer]);
      return;
    }

    for (let index = 0; index < answer.length; index += 1) {
      const item = answer[index];
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        appendQuestionAnswers(rows, item, `${path}.${index + 1}`);
      }
    }
    return;
  }

  if (typeof answer === 'object' && answer !== null) {
    appendQuestionAnswers(rows, answer, path);
    return;
  }

  rows.push([questionLabel(path), formatPrimitiveAnswer(answer)]);
}

function questionLabel(path: string): string {
  const diagnosisMatch = path.match(/^diagnoses\.(\d+)\.(.+)$/);
  if (diagnosisMatch) {
    const [, index, field] = diagnosisMatch;
    return `Diagnosis ${index} - ${QUESTION_ANSWER_LABELS[`diagnoses.${field}`] ?? humanizedLabel(field)}`;
  }

  return QUESTION_ANSWER_LABELS[path] ?? humanizedLabel(path);
}

function humanizedLabel(path: string): string {
  const cached = humanizedLabelCache.get(path);
  if (cached) {
    return cached;
  }

  const label = path.split('.').at(-1) ?? path;
  const humanized = label.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (char) => char.toUpperCase());
  humanizedLabelCache.set(path, humanized);
  return humanized;
}

function formatPrimitiveAnswer(answer: unknown): unknown {
  if (typeof answer === 'boolean') {
    return answer ? 'Ja' : 'Nein';
  }

  return answer;
}

function isBlankAnswer(answer: unknown): boolean {
  if (answer === null || answer === undefined || answer === '') {
    return true;
  }

  return Array.isArray(answer) && answer.length === 0;
}

function isOptionValue(answer: unknown): answer is OptionValue {
  if (typeof answer !== 'object' || answer === null || Array.isArray(answer)) {
    return false;
  }

  const record = answer as Record<string, unknown>;
  return typeof record['label'] === 'string' && 'value' in record;
}
