/*
 * scoreLog: []
 * {
 *   from: string
 *   to: string
 *   date: datetime
 * }
 */
export const SCORE_LOG_DOCUMENT_NAME = 'scoreLog';


export interface ScoreLog {
  id: string;
  to: string;
  from: string;
  number: number;
  reason: string;
  date: Date;
}