import {
  DiagnosisQuestionId,
  QuestionAnswerKey,
  QuestionnairePath,
  SubstanceKind,
} from '../../../constants/app-enums';
import { LifestyleControls } from './questionnaire.types';

export type DiagnosisAnswerKey =
  | QuestionAnswerKey.Q4
  | QuestionAnswerKey.Q5
  | QuestionAnswerKey.Q6
  | QuestionAnswerKey.Q7
  | QuestionAnswerKey.Q8
  | QuestionAnswerKey.Q9
  | QuestionAnswerKey.Q10
  | QuestionAnswerKey.Q12;

export const DIAGNOSIS_QUESTION_TO_ANSWER_KEY = {
  [DiagnosisQuestionId.Q4]: QuestionAnswerKey.Q4,
  [DiagnosisQuestionId.Q5]: QuestionAnswerKey.Q5,
  [DiagnosisQuestionId.Q6]: QuestionAnswerKey.Q6,
  [DiagnosisQuestionId.Q7]: QuestionAnswerKey.Q7,
  [DiagnosisQuestionId.Q8]: QuestionAnswerKey.Q8,
  [DiagnosisQuestionId.Q9]: QuestionAnswerKey.Q9,
  [DiagnosisQuestionId.Q10]: QuestionAnswerKey.Q10,
  [DiagnosisQuestionId.Q12]: QuestionAnswerKey.Q12,
} as const satisfies Record<DiagnosisQuestionId, DiagnosisAnswerKey>;

export type SubstanceFieldMap = {
  use: keyof LifestyleControls;
  units: keyof LifestyleControls;
  frequency: keyof LifestyleControls;
  from: keyof LifestyleControls;
  to: keyof LifestyleControls;
};

export const SUBSTANCE_FIELD_MAP = {
  [SubstanceKind.Nicotine]: {
    use: 'nicotineUse',
    units: 'nicotineUnits',
    frequency: 'nicotineFrequency',
    from: 'nicotineFrom',
    to: 'nicotineTo',
  },
  [SubstanceKind.Alcohol]: {
    use: 'alcoholUse',
    units: 'alcoholUnits',
    frequency: 'alcoholFrequency',
    from: 'alcoholFrom',
    to: 'alcoholTo',
  },
  [SubstanceKind.Drug]: {
    use: 'drugUse',
    units: 'drugUnits',
    frequency: 'drugFrequency',
    from: 'drugFrom',
    to: 'drugTo',
  },
} as const satisfies Record<SubstanceKind, SubstanceFieldMap>;

export const QUESTION_ANSWER_LABELS: Record<string, string> = {
  applicantGender: 'Applicant gender',
  [`${QuestionnairePath.PreviousInsurance}.q1`]:
    '1. Wurden bereits Anträge von SWICA oder von anderen Versicherern abgelehnt, zurückgestellt oder nur zu erschwerten Bedingungen angenommen?',
  [`${QuestionnairePath.PreviousInsurance}.q1a`]: 'Wenn ja, weshalb und aufgrund welcher Diagnose?',
  [`${QuestionnairePath.PreviousInsurance}.q1b`]: 'Bestehen noch Beschwerden oder folgen noch Behandlungen?',
  'doctorInfo.practiceName': '2. Praxis/Spital',
  'doctorInfo.familyName': '2. Name',
  'doctorInfo.givenNames': '2. Vorname',
  'doctorInfo.street': '2. Strasse',
  'doctorInfo.streetNumber': '2. Nr.',
  'doctorInfo.postalCode': '2. PLZ',
  'doctorInfo.city': '2. Ort',
  'bodyMetrics.heightCm': '3. Grösse (cm)',
  'bodyMetrics.weightKg': '3. Gewicht (kg)',
  [`${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q4}`]: '4. Behandlung, Kontrolle oder Abklärung in den letzten 12 Monaten',
  [`${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q4A}`]: '4. Welche Behandlungen?',
  [`${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q4B}`]: '4. Bestehen noch Beschwerden oder folgen noch Behandlungen?',
  [`${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q5}`]: '5. Krankheiten/Störungen/Beschwerden in den letzten 10 Jahren',
  [`${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q6}`]: '6. Tumorerkrankung, Bandscheibenvorfall, psychische Krankheit oder Herz-Kreislauf-Erkrankung',
  [`${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q8}`]: '7. Ambulanter oder stationärer Eingriff/Operation',
  [`${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q7}`]: '8. Unfall mit chirurgischem Eingriff oder langer Behandlung',
  [`${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q9}`]: '9. Geburtsgebrechen oder UVG-/IV-Rente',
  [`${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q9A}`]: '9. Welches Geburtsgebrechen oder Grund der Rente?',
  [`${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q10}`]: '10. Zahn- oder Kieferfehlstellung',
  [`${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q10A}`]: '10. Kieferorthopädische Arbeiten zu erwarten?',
  [`${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q11}`]: '11. Schwangerschaft',
  [`${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q12}`]: '12. Medikamente/Nahrungsergänzungen in den letzten 5 Jahren',
  [`${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q12A}`]: '12. Relevante Medikamente/Diagnosen',
  [`${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q13}`]: '13. Nikotin, Alkohol, Drogen oder Ähnliches',
  [`${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q16}`]: '16. Parodontitis',
  [`${QuestionnairePath.QuestionAnswers}.${QuestionAnswerKey.Q17}`]: '17. Zahnstellungs- und kieferanomalien',
  [`${QuestionnairePath.Lifestyle}.nicotineUse`]: '13. Nikotin',
  [`${QuestionnairePath.Lifestyle}.nicotineUnits`]: '13. Nikotin Stückzahl/Einheiten',
  [`${QuestionnairePath.Lifestyle}.nicotineFrequency`]: '13. Nikotin pro Tag/Woche/Monat/Jahr',
  [`${QuestionnairePath.Lifestyle}.nicotineFrom`]: '13. Nikotin Dauer von',
  [`${QuestionnairePath.Lifestyle}.nicotineTo`]: '13. Nikotin bis',
  [`${QuestionnairePath.Lifestyle}.alcoholUse`]: '13. Alkohol',
  [`${QuestionnairePath.Lifestyle}.alcoholUnits`]: '13. Alkohol Stückzahl/Einheiten',
  [`${QuestionnairePath.Lifestyle}.alcoholFrequency`]: '13. Alkohol pro Tag/Woche/Monat/Jahr',
  [`${QuestionnairePath.Lifestyle}.alcoholFrom`]: '13. Alkohol Dauer von',
  [`${QuestionnairePath.Lifestyle}.alcoholTo`]: '13. Alkohol bis',
  [`${QuestionnairePath.Lifestyle}.drugUse`]: '13. Drogen',
  [`${QuestionnairePath.Lifestyle}.drugUnits`]: '13. Drogen Stückzahl/Einheiten',
  [`${QuestionnairePath.Lifestyle}.drugFrequency`]: '13. Drogen pro Tag/Woche/Monat/Jahr',
  [`${QuestionnairePath.Lifestyle}.drugFrom`]: '13. Drogen Dauer von',
  [`${QuestionnairePath.Lifestyle}.drugTo`]: '13. Drogen bis',
  [`${QuestionnairePath.DentalInfo}.pregnancyDate`]: '11. Geburtstermin',
  [`${QuestionnairePath.DentalInfo}.pregnancyWeightBefore`]: '11. Gewicht vor Schwangerschaft',
  [`${QuestionnairePath.DentalInfo}.desiredLevel`]: '14. Gewünschte Stufe DENTA',
  [`${QuestionnairePath.DentalInfo}.toothStatusNotes`]: '15. Befund vom',
  [`${QuestionnairePath.DentalInfo}.toothStatusUpper`]: '15. Zahnschema oben',
  [`${QuestionnairePath.DentalInfo}.toothStatusLower`]: '15. Zahnschema unten',
  [`${QuestionnairePath.DentalInfo}.findingDate`]: '15. Befund Datum',
  [`${QuestionnairePath.DentalInfo}.prosthesesCondition`]: '15. Zustand der Kronen, Brücken und Prothesen',
  [`${QuestionnairePath.DentalInfo}.prosthesesReason`]: '15. Wenn mittelmässig oder schlecht, weshalb?',
  [`${QuestionnairePath.DentalInfo}.parodontitisBleeding`]: '16. Zahnfleischbluten',
  [`${QuestionnairePath.DentalInfo}.parodontitisUpper`]: '16. Parodontitis Zahnschema oben',
  [`${QuestionnairePath.DentalInfo}.parodontitisLower`]: '16. Parodontitis Zahnschema unten',
  [`${QuestionnairePath.DentalInfo}.parodontitisRemarks`]: '16. Bemerkungen',
  [`${QuestionnairePath.DentalInfo}.jawDescription`]: '17. Beschreibung',
  [`${QuestionnairePath.DentalInfo}.angleClass`]: '17. Angle-Klasse',
  [`${QuestionnairePath.DentalInfo}.jawExpectedWork`]: '17. Sind kieferorthopädische Arbeiten zu erwarten?',
  [`${QuestionnairePath.DentalInfo}.jawReason`]: '17. Wenn ja, warum?',
  [`${QuestionnairePath.DentalInfo}.jawTreatments`]: '17. Welche Behandlungen?',
  [`${QuestionnairePath.DentalInfo}.jawCostEstimate`]: '17. Kostenschätzung',
  [`${QuestionnairePath.DentalInfo}.hygiene`]: '18.1 Hygiene',
  [`${QuestionnairePath.DentalInfo}.hygieneReason`]: '18.1a Wenn mittelmässig oder schlecht, weshalb?',
  [`${QuestionnairePath.DentalInfo}.lastTreatment`]: '18.2 Letzte Behandlung und Grund',
  [`${QuestionnairePath.DentalInfo}.firstTreatment`]: '18.3 Erste Behandlung',
  [`${QuestionnairePath.DentalInfo}.dentalInsuranceExam`]: '18.4 Untersuchung für Zahnversicherung',
  [`${QuestionnairePath.DentalInfo}.accidentDentalInjuries`]: '18.5 Unfallbedingte Zahnschäden',
  [`${QuestionnairePath.DentalInfo}.accidentAffectedTeeth`]: '18.6 Betroffene Zähne',
  [`${QuestionnairePath.DentalInfo}.accidentTreatments`]: '18.7 Unfallbehandlungen',
  [`${QuestionnairePath.DentalInfo}.dentalProceduresPlanned`]: '18.8 Zahnärztliche Arbeiten geplant oder erforderlich',
  [`${QuestionnairePath.DentalInfo}.plannedProcedures`]: '18.9 Welche geplanten Arbeiten?',
  [`${QuestionnairePath.DentalInfo}.plannedTreatmentDate`]: '18.10 Wann wird diese Behandlung durchgeführt?',
  [`${QuestionnairePath.DentalInfo}.treatmentDelayReason`]: '18.11 Weshalb konnte die Behandlung nicht vorher durchgeführt werden?',
  [`${QuestionnairePath.DentalInfo}.plannedDentalCost`]: '18.12 Kostenschätzung',
  [`${QuestionnairePath.Diagnoses}.questionId`]: 'Question',
  [`${QuestionnairePath.Diagnoses}.condition`]: 'Diagnose/Krankheiten/Störungen/Beschwerden',
  [`${QuestionnairePath.Diagnoses}.from`]: 'Beginn',
  [`${QuestionnairePath.Diagnoses}.to`]: 'Ende',
  [`${QuestionnairePath.Diagnoses}.recovered`]: 'Vollständig geheilt?',
  [`${QuestionnairePath.Diagnoses}.doctorGivenNames`]: 'Behandelnde/r Arzt/Ärztin, Therapeut/in Vorname',
  [`${QuestionnairePath.Diagnoses}.doctorFamilyName`]: 'Behandelnde/r Arzt/Ärztin, Therapeut/in Name',
  [`${QuestionnairePath.Diagnoses}.doctorStreet`]: 'Arzt/Therapeut Strasse',
  [`${QuestionnairePath.Diagnoses}.doctorStreetNumber`]: 'Arzt/Therapeut Nr.',
  [`${QuestionnairePath.Diagnoses}.doctorPostalCode`]: 'Arzt/Therapeut PLZ',
  [`${QuestionnairePath.Diagnoses}.doctorCity`]: 'Arzt/Therapeut Ort',
  [`${QuestionnairePath.Diagnoses}.notes`]: 'Besondere Bemerkungen',
  [`${QuestionnairePath.Diagnoses}.implantAnswer`]: 'Implantat oder Fremdkörper eingesetzt?',
  [`${QuestionnairePath.Diagnoses}.implantDetails`]: 'Was und wo?',
  [`${QuestionnairePath.Diagnoses}.implantStatus`]: 'Implantat/Fremdkörper Status',
  [`${QuestionnairePath.Diagnoses}.name`]: 'Name',
  [`${QuestionnairePath.Diagnoses}.amountPerDay`]: 'Anzahl/Tag',
  [`${QuestionnairePath.Diagnoses}.duration`]: 'Duration',
};
