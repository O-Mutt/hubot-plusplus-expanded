import convict from 'convict';

export interface ConfigurationSchema {
  companyName: string;
  mongoUri: string;
  monthlyScoreboardCron?: string;
  monthlyScoreboardDayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  reasonKeyword?: string;
  spamMessage?: string;
  spamTimeLimit?: number;
  furtherFeedbackSuggestedScore?: number;
  cryptoRpcProvider?: string;
  magicNumber?: string;
  magicIv?: string;
  furtherHelpUrl?: string;
  notificationsRoom?: string;
  falsePositiveNotificationsRoom?: string;
  peerFeedbackUrl?: URL;
}

export const loadConfig = (): Configuration => {
  const configuration = convict<ConfigurationSchema>({
    reasonKeyword: {
      format: String,
      doc: 'Keyword to use for reasons',
      env: 'HUBOT_PLUSPLUS_REASONS',
      default: 'reasons',
    },
    spamMessage: {
      nullable: true,
      format: String,
      doc: 'Message to send to users who spam',
      env: 'HUBOT_SPAM_MESSAGE',
      default: 'Looks like you hit the spam filter. Please slow your roll.',
    },
    spamTimeLimit: {
      nullable: true,
      format: Number,
      doc: 'Time limit for spam in seconds',
      env: 'SPAM_TIME_LIMIT',
      default: 30,
    },
    companyName: {
      format: String,
      doc: 'Company name',
      env: 'HUBOT_COMPANY_NAME',
      default: null,
    },
    furtherFeedbackSuggestedScore: {
      format: Number,
      doc: 'Score at which further feedback is suggested',
      env: 'HUBOT_FURTHER_FEEDBACK_SCORE',
      default: 10,
    },
    mongoUri: {
      format: String,
      doc: 'Mongo URI',
      env: 'MONGO_URI',
      default: null,
    },

    cryptoRpcProvider: {
      format: String,
      doc: 'Crypto RPC Provider',
      env: 'HUBOT_CRYPTO_RPC_PROVIDER',
      nullable: true,
      default: null,
    },
    magicNumber: {
      format: String,
      doc: 'Magic number',
      env: 'HUBOT_UNIMPORTANT_MAGIC_NUMBER',
      sensitive: true,
      default: null,
      nullable: true,
    },
    magicIv: {
      format: String,
      doc: 'Magic IV',
      env: 'HUBOT_UNIMPORTANT_MAGIC_IV',
      sensitive: true,
      default: null,
      nullable: true,
    },
    furtherHelpUrl: {
      format: String,
      doc: 'Further help URL',
      env: 'HUBOT_CRYPTO_FURTHER_HELP_URL',
      default: null,
      nullable: true,
    },
    notificationsRoom: {
      format: String,
      doc: 'Notifications room',
      env: 'HUBOT_PLUSPLUS_NOTIFICATION_ROOM',
      default: null,
      nullable: true,
    },
    falsePositiveNotificationsRoom: {
      format: String,
      doc: 'False positive notifications room',
      env: 'HUBOT_PLUSPLUS_FALSE_POSITIVE_NOTIFICATION_ROOM',
      default: null,
      nullable: true,
    },
    monthlyScoreboardCron: {
      format: String,
      doc: 'Monthly scoreboard cron',
      env: 'HUBOT_PLUSPLUS_MONTHLY_SCOREBOARD_CRON',
      default: '0 10 1-7 * *',
      nullable: true,
    },
    monthlyScoreboardDayOfWeek: {
      format: [0, 1, 2, 3, 4, 5, 6],
      doc: 'Monthly scoreboard day of week',
      env: 'HUBOT_PLUSPLUS_MONTHLY_SCOREBOARD_DAY_OF_WEEK',
      default: 1,
    },
    peerFeedbackUrl: {
      format: URL,
      doc: 'Peer feedback URL',
      env: 'HUBOT_PEER_FEEDBACK_URL',
      nullable: true,
      default: null,
    },
  });

  configuration.validate({ allowed: 'strict' });
  return configuration;
};

export type Configuration = convict.Config<ConfigurationSchema>;
