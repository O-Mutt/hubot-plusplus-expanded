/*
 * scores: []
 * {
 *   name: string
 *   score: int
 *   reasons: ReasonsObject
 *   pointsGiven: PointsGivenObject
 * }
 *
 * ReasonsObject:
 * {
 *   [reason]: int
 * }
 *
 * PointsGivenObject:
 * {
 *   [to]: int
 * }
 */
const scoresDocumentName = 'scores';

module.exports = scoresDocumentName;
