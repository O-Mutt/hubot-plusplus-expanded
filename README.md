hubot-plusplus-expanded
==============

[![Known Vulnerabilities](https://snyk.io//test/github/Mutmatt/hubot-plusplus-expanded/badge.svg?targetFile=package.json)](https://snyk.io//test/github/Mutmatt/hubot-plusplus-expanded?targetFile=package.json)
[![Node CI](https://github.com/O-Mutt/hubot-plusplus-expanded/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/O-Mutt/hubot-plusplus-expanded/actions/workflows/test.yml)

Give or take away points. Keeps track and even prints out graphs.


API
---
* \<name>++ [\<reason>] - Increment score for a name (for a reason)
* \<name>-- [\<reason>] - Decrement score for a name (for a reason)
* {name1, name2, name3}++ [\<reason>] - Increment score for all names (for a reason)
* {name1, name2, name3}-- [\<reason>] - Decrement score for all names (for a reason)
* hubot score <name> - Display the score for a name and some of the reasons
* hubot top <amount> - Display the top scoring <amount>
* hubot bottom <amount> - Display the bottom scoring <amount>
* hubot erase <name> [\<reason>] - Remove the score for a name (for a reason)
* how much are hubot points worth (how much point) - Shows how much hubot points are worth

Uses Hubot brain. Also exposes the following events, should you wish to hook
into it to do things like print out funny gifs for point streaks:

```coffeescript
robot.emit "plus-plus", {
  name: 'Jack'
  direction: '++' # (or --)
  room: 'chatRoomAlpha'
  reason: 'being awesome'
}
```

## Installation

This is a plugin for Hubot and should be installed as a consumed package by a hubot.

Run the following command

  `npm install hubot-plusplus-expanded`

Then to make sure the dependencies are installed:

  `npm install`

To enable the script, add a `hubot-plusplus-expanded` entry to the `external-scripts.json`
file (you may need to create this file).

    ["hubot-plusplus-expanded"]

## Configuration

Some of the behavior of this plugin is configured in the environment:

`HUBOT_PLUSPLUS_KEYWORD` - the keyword that will make hubot give the score for a name and the reasons. For example you can set this to "score|karma" so hubot will answer to both keywords. If not provided will default to `score`

`HUBOT_PLUSPLUS_REASONS` - the text used for the word "reasons" when hubot lists the top-N report, default `reasons`.

`HUBOT_PLUSPLUS_REASON_CONJUNCTIONS` - a pipe separated list of conjunctions be used when specifying reasons. The default value is `for|because|cause|cuz|as|porque`. E.g. "foo++ for being awesome" or "foo++ cuz they are awesome".

`MONGODB_URI` | `MONGO_URI` | `MONGODB_URL` | `MONGOLAB_URI` | `MONGOHQ_URL` - the uri of the mongo instance that hubot will use to store data. (*default:* `'mongodb://localhost/plusPlus'`).

`HUBOT_SPAM_MESSAGE` - the text that will be used if a user hits the spam filter. (*default:* `Looks like you hit the spam filter. Please slow your role.`).

`HUBOT_COMPANY_NAME` - the name of the company that is using hubot (*default:* `Company Name`).

`HUBOT_PEER_FEEDBACK_URL` - this is the message that will be used if a user gives `HUBOT_FURTHER_FEEDBACK_SCORE` points to another user (*default:* `'Lattice' (https://${companyName}.latticehq.com/)`).

`HUBOT_FURTHER_FEEDBACK_SCORE` - the score that would add a suggestion to provide the user with more feedback (*default:* `10`).

**Required** There needs to be an index on the `scoreLogs` table for a TTL or the user will only be able to send one `++|--` before they will be spam blocked. 
`db.scoreLog.createIndex( { "date": 1 }, { expireAfterSeconds: 5 } )`

## Mongo data Layout
``` javascript
scores: [
  {
    name: string,
    score: int,
    reasons: ReasonsObject,
    pointsGiven: PointsGivenObject
  }
]

scoreLog: [
  {
    from: string,
    to: string,
    date: datetime
  }
]

ReasonsObject:
{
  [reason]: int
}

PointsGivenObject:
{
  [to]: int
}
```

## Testing

Individual run:
`npm run test`

Tdd:
`npm run test:watch`

## Known issue
As of now there is an issue that has shown up a couple times without a root cause. The `$setOnInsert` excludes the `reasons: {}` object. The fix, currently, is to identify the bad document in mongo `db.scores.find({ "reasons: null"});` and update them  `db.scores.updateMany({ "reasons: null"}, { $set: { "reasons": {} });`
