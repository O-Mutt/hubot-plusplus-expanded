hubot-plusplus-improved
==============

[![Known Vulnerabilities](https://snyk.io//test/github/Mutmatt/hubot-plusplus-improved/badge.svg?targetFile=package.json)](https://snyk.io//test/github/Mutmatt/hubot-plusplus-improved?targetFile=package.json)
![Node CI](https://github.com/Mutmatt/hubot-plusplus-improved/workflows/Node%20CI/badge.svg?branch=master)

Give (or take away) points from people and things, all from the comfort of your
personal Hubot.

API
---

* `thing++` - add a point to `thing`
* `++` - add a point to the most previously voted-on thing
* `thing++ for stuff` - keep track of why you gave thing points
* `thing--` - remove a point from `thing`
* `--` - remove a point from the most previously voted-on thing
* `thing-- for stuff` - keep track of why you removed thing points
* `hubot erase thing` - erase thing from scoreboard (permanently deletes thing from memory)
* `hubot erase thing for reason` erase given reason from thing's score board (does not deduct from total score)
* `hubot top 10` - show the top 10, with a graph of points
* `hubot score thing` - check the score for and reasons for `thing`

Uses Hubot brain. Also exposes the following events, should you wish to hook
into it to do things like print out funny gifs for point streaks:

```coffeescript
robot.emit "plus-one", {
  name: 'Jack'
  direction: '++' # (or --)
  room: 'chatRoomAlpha'
  reason: 'being awesome'
}
```

## Installation

Run the following command 

    $ npm install hubot-plusplus-improved

Then to make sure the dependencies are installed:

    $ npm install

To enable the script, add a `hubot-plusplus-improved` entry to the `external-scripts.json`
file (you may need to create this file).

    ["hubot-plusplus-improved"]

## Configuration

Some of the behavior of this plugin is configured in the environment:

`HUBOT_PLUSPLUS_KEYWORD` - alters the word you use to ask for the points, default `score`.

`HUBOT_PLUSPLUS_REASONS` - the text used for the word "reasons" when hubot lists the top-N report, default `reasons`.

`HUBOT_PLUSPLUS_CONJUNCTIONS` - the words that are used as reason conjuntions (*default:* `'for|because|cause|cuz|as|porque'`).

`MONGO_URI` | `MONGODB_URL` | `MONGOLAB_URI` | `MONGOHQ_URL` - the uri of the mongo instance that hubot will use to store data. (*default:* `'mongodb://localhost/plusPlus'`).

`HUBOT_SPAM_MESSAGE` - the text that will be used if a user hits the spam filter. (*default:* `Please slow your roll.`).

`HUBOT_COMPANY_NAME` - the name of the company that is using hubot (*default:* `company`).

`HUBOT_PEER_FEEDBACK_URL` - this is the message that will be used if a user gives `HUBOT_FURTHER_FEEDBACK_SCORE` points to another user (*default:* `'Small Improvements' (${companyName}.small-improvements.com)`).

`HUBOT_FURTHER_FEEDBACK_SCORE` - the score that would add a suggestion to provide the user with more feedback (*default:* `10`).

There needs to be an index on the `scoreLogs` table for a TTL or the user will only be able to send one `++|--` before they will be spam blocked. 
`db.scoreLog.createIndex( { "date": 1 }, { expireAfterSeconds: 5 } )`

## Mongo data Layout
```json
scores: [
  {
    name: string
    score: int
    reasons: ReasonsObject
    pointsGiven: PointsGivenObject
  }
]

scoreLog: [
  {
    from: string
    to: string
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
