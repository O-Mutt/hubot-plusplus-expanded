/*
 * Scores Object
 * --------------------------------
 * id: ObjectId
 * name: string
 * pointsGiven: PointsGivenObject
 * score: Int32
 * token: Int32
 * accountLevel: Int32
 * <botName>Day: Date
 * reasons: ReasonsObject
 * --------------------------------
 *
 * ReasonsObject:
 * {
 *   [string]: int
 * }
 *
 * PointsGivenObject:
 * {
 *   [encryptedString]: int
 * }
 */
const scoresDocumentName = 'scores';

module.exports = scoresDocumentName;
